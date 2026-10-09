import {
  ROLE_LABELS,
  idSchema,
  userCreateSchema,
  userUpdateSchema,
  type StaffRole,
  type UserDTO,
  type UserPasswordResetDTO,
} from '@mf/shared';
import { Prisma, type User } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { AppError, conflict, notFound } from '../../lib/errors';
import { prisma, type Db } from '../../lib/prisma';
import { validate } from '../../lib/validate';
import { actorFrom, auditService } from '../audit/audit.service';
import { requirePermission } from '../auth/auth.guard';
import { generateTemporaryPassword, hashPassword } from '../auth/password';
import { sessionsRepository } from '../auth/sessions.repository';

function toUserDTO(u: User): UserDTO {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as StaffRole,
    active: u.active,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

const emailTaken = () => conflict('EMAIL_IN_USE', 'Já existe um usuário com este e-mail.');
const notOnSelf = (message: string) => new AppError(409, 'SELF_ACTION', message);

async function requireUser(id: string, db: Db = prisma) {
  const user = await db.user.findUnique({ where: { id } });
  if (!user || user.role === 'CLIENT') throw notFound('Usuário não encontrado.');
  return user;
}

/**
 * M2 — trava de transação do PostgreSQL para alterações de usuários: duas alterações
 * simultâneas (ex.: dois SUPER_ADMIN desativando um ao outro) passam a ser executadas em fila,
 * e a segunda já enxerga o resultado da primeira. Liberada automaticamente no fim da transação.
 */
const USERS_LOCK_KEY = 7_310_001;
async function lockUsers(db: Db) {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(${USERS_LOCK_KEY})`;
}

/** Impede ficar sem nenhum Super Administrador ativo (o sistema perderia a administração técnica). */
async function assertNotLastSuperAdmin(user: User, db: Db) {
  if (user.role !== 'SUPER_ADMIN' || !user.active) return;
  const others = await db.user.count({ where: { role: 'SUPER_ADMIN', active: true, id: { not: user.id } } });
  if (others === 0) throw conflict('LAST_SUPER_ADMIN', 'Este é o único Super Administrador ativo. Crie outro antes.');
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/** Gestão de usuários do painel (SUPER_ADMIN). */
export async function usersController(app: FastifyInstance) {
  app.addHook('preHandler', requirePermission('users:manage'));

  app.get('/users', async (): Promise<UserDTO[]> => {
    const users = await prisma.user.findMany({ where: { role: { not: 'CLIENT' } }, orderBy: [{ role: 'desc' }, { name: 'asc' }] });
    return users.map(toUserDTO);
  });

  app.post('/users', async (req, reply) => {
    const input = validate(userCreateSchema, req.body);
    const passwordHash = await hashPassword(input.password);
    try {
      const user = await prisma.$transaction(async (tx) => {
        // Senha inicial definida por outra pessoa = provisória: troca obrigatória no 1º acesso (M4)
        const created = await tx.user.create({
          data: { name: input.name, email: input.email, role: input.role, passwordHash, mustChangePassword: true },
        });
        await auditService.log(
          actorFrom(req),
          {
            action: 'user.create',
            entity: 'user',
            entityId: created.id,
            description: `Criou o usuário ${created.name} (${ROLE_LABELS[input.role]})`,
          },
          tx,
        );
        return created;
      });
      return reply.status(201).send(toUserDTO(user));
    } catch (error) {
      if (isUniqueViolation(error)) throw emailTaken();
      throw error;
    }
  });

  app.patch<{ Params: { id: string } }>('/users/:id', async (req) => {
    const id = validate(idSchema, req.params.id);
    const input = validate(userUpdateSchema, req.body);
    const self = id === req.user!.id;
    try {
      return await prisma.$transaction(async (tx) => {
        await lockUsers(tx);
        const before = await requireUser(id, tx);
        const roleChanged = input.role !== undefined && input.role !== before.role;
        const deactivating = input.active === false && before.active;

        if (self && (roleChanged || deactivating)) {
          throw notOnSelf('Você não pode alterar o próprio perfil nem se desativar.');
        }
        if ((roleChanged && before.role === 'SUPER_ADMIN') || deactivating) await assertNotLastSuperAdmin(before, tx);

        const user = await tx.user.update({ where: { id }, data: input });
        // Perfil ou status mudou: encerra as sessões para valer imediatamente
        if (roleChanged || deactivating) await tx.session.deleteMany({ where: { userId: id } });

        const changes = [
          input.name !== undefined && input.name !== before.name && `nome: ${before.name} → ${user.name}`,
          input.email !== undefined && input.email !== before.email && `e-mail: ${before.email} → ${user.email}`,
          roleChanged && `perfil: ${ROLE_LABELS[before.role]} → ${ROLE_LABELS[user.role]}`,
          input.active !== undefined && input.active !== before.active && (user.active ? 'ativado' : 'desativado'),
        ].filter(Boolean);
        if (changes.length) {
          await auditService.log(
            actorFrom(req),
            {
              action: input.active !== undefined && changes.length === 1 && input.active !== before.active
                ? user.active ? 'user.activate' : 'user.deactivate'
                : 'user.update',
              entity: 'user',
              entityId: id,
              description: `Alterou o usuário ${user.name} (${changes.join('; ')})`,
            },
            tx,
          );
        }
        return toUserDTO(user);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw emailTaken();
      throw error;
    }
  });

  /** Gera uma senha provisória (exibida uma única vez) e encerra as sessões do usuário. */
  app.post<{ Params: { id: string } }>('/users/:id/reset-password', async (req): Promise<UserPasswordResetDTO> => {
    const id = validate(idSchema, req.params.id);
    if (id === req.user!.id) throw notOnSelf('Para trocar a sua senha, use "Minha conta".');
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    await prisma.$transaction(async (tx) => {
      const user = await requireUser(id, tx);
      await tx.user.update({ where: { id }, data: { passwordHash, mustChangePassword: true } });
      await tx.session.deleteMany({ where: { userId: id } });
      await auditService.log(
        actorFrom(req),
        { action: 'user.password_reset', entity: 'user', entityId: id, description: `Redefiniu a senha de ${user.name}` },
        tx,
      );
    });
    return { temporaryPassword };
  });

  /** Exclusão definitiva. O histórico de auditoria é mantido (guarda o nome de quem agiu). */
  app.delete<{ Params: { id: string } }>('/users/:id', async (req, reply) => {
    const id = validate(idSchema, req.params.id);
    if (id === req.user!.id) throw notOnSelf('Você não pode excluir a própria conta.');
    await prisma.$transaction(async (tx) => {
      await lockUsers(tx);
      const user = await requireUser(id, tx);
      await assertNotLastSuperAdmin(user, tx);
      await tx.user.delete({ where: { id } });
      await auditService.log(
        actorFrom(req),
        {
          action: 'user.delete',
          entity: 'user',
          entityId: id,
          description: `Excluiu o usuário ${user.name} (${user.email}, ${ROLE_LABELS[user.role]})`,
        },
        tx,
      );
    });
    await sessionsRepository.revokeAllForUser(id);
    return reply.status(204).send();
  });
}

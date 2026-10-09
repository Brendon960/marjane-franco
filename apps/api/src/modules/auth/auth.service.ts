import { permissionsFor, type SessionUserDTO, type StaffRole } from '@mf/shared';
import type { User } from '@prisma/client';
import { AppError, unauthorized } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { auditService } from '../audit/audit.service';
import { hashPassword, verifyPassword } from './password';
import { sessionsRepository } from './sessions.repository';

const invalidCredentials = () => new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');

// Limite por conta (além do limite por IP da rota): dificulta tentativas distribuídas contra um mesmo e-mail.
const failures = new Map<string, { count: number; resetAt: number }>();
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;

function checkAccountLock(email: string) {
  const entry = failures.get(email);
  if (entry && entry.resetAt > Date.now() && entry.count >= MAX_FAILURES) {
    throw new AppError(429, 'RATE_LIMITED', 'Muitas tentativas para este e-mail. Aguarde 15 minutos e tente novamente.');
  }
}

function registerFailure(email: string) {
  const now = Date.now();
  const entry = failures.get(email);
  if (!entry || entry.resetAt <= now) failures.set(email, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count++;
  if (failures.size > MAX_TRACKED) pruneFailures(now);
}

const MAX_TRACKED = 10_000;

/**
 * Proteção de memória (B2) SEM zerar os bloqueios: remove só as janelas já vencidas e,
 * se ainda faltar espaço, as entradas mais antigas que não estão bloqueadas.
 * (Antes um atacante podia "limpar" o bloqueio de uma conta enchendo o mapa com e-mails falsos.)
 */
function pruneFailures(now: number) {
  for (const [key, entry] of failures) if (entry.resetAt <= now) failures.delete(key);
  if (failures.size <= MAX_TRACKED) return;
  for (const [key, entry] of failures) {
    if (failures.size <= MAX_TRACKED) break;
    if (entry.count < MAX_FAILURES) failures.delete(key);
  }
}

export function toSessionUser(user: Pick<User, 'id' | 'name' | 'email' | 'role' | 'mustChangePassword'>): SessionUserDTO {
  const role = user.role as StaffRole;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    permissions: [...permissionsFor(role)],
    mustChangePassword: user.mustChangePassword,
  };
}

export const authService = {
  async login(email: string, password: string, meta: { ip: string; userAgent?: string }) {
    checkAccountLock(email);
    const user = await prisma.user.findUnique({ where: { email } });
    // Verifica a senha mesmo sem usuário: o tempo de resposta não revela quais e-mails existem
    const valid = await verifyPassword(user?.passwordHash ?? null, password);

    if (!user || !valid || !user.active || user.role === 'CLIENT') {
      registerFailure(email);
      await auditService.log(
        { userId: user?.id ?? null, name: user?.name ?? 'Desconhecido', ip: meta.ip },
        {
          action: 'auth.login_failed',
          entity: 'user',
          entityId: user?.id,
          description:
            user && valid && !user.active ? `Tentativa de login de usuário desativado (${email})` : `Falha de login (${email})`,
        },
      );
      throw invalidCredentials();
    }

    failures.delete(email);
    const session = await sessionsRepository.create(user.id, meta);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await auditService.log(
      { userId: user.id, name: user.name, ip: meta.ip },
      { action: 'auth.login', entity: 'user', entityId: user.id, description: 'Entrou no painel' },
    );
    return { user: toSessionUser(user), ...session };
  },

  async changePassword(userId: string, sessionId: string, currentPassword: string, newPassword: string, ip: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw unauthorized();
    if (!(await verifyPassword(user.passwordHash, currentPassword))) {
      throw new AppError(400, 'WRONG_PASSWORD', 'A senha atual está incorreta.');
    }
    // A senha provisória não pode ser mantida como definitiva
    if (await verifyPassword(user.passwordHash, newPassword)) {
      throw new AppError(400, 'SAME_PASSWORD', 'A nova senha precisa ser diferente da atual.');
    }
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(newPassword), mustChangePassword: false },
    });
    // Encerra as outras sessões: quem tinha a senha antiga perde o acesso
    await sessionsRepository.revokeAllForUser(userId, sessionId);
    await auditService.log(
      { userId, name: user.name, ip },
      {
        action: 'auth.password_changed',
        entity: 'user',
        entityId: userId,
        description: user.mustChangePassword ? 'Trocou a senha provisória' : 'Alterou a própria senha',
      },
    );
  },
};

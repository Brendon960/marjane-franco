import {
  clientUpdateSchema,
  clientsQuerySchema,
  formatPhoneBR,
  idSchema,
  toBusinessDate,
  toBusinessTime,
  type ClientAppointmentRef,
  type ClientDetailDTO,
  type ClientSummaryDTO,
  type Paginated,
} from '@mf/shared';
import { Prisma, type Appointment, type Client } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { conflict, notFound } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { validate } from '../../lib/validate';
import { appointmentInclude, effectiveStatus, toAdminAppointmentDTO } from '../appointments/appointments.mapper';
import { actorFrom, auditService } from '../audit/audit.service';
import { requirePermission } from '../auth/auth.guard';

const PAGE_SIZE = 30;

type ClientWithHistory = Client & {
  appointments: (Pick<Appointment, 'startsAt' | 'status' | 'expiresAt'> & { procedure: { name: string } })[];
};

const historyInclude = {
  appointments: {
    select: { startsAt: true, status: true, expiresAt: true, procedure: { select: { name: true } } },
    orderBy: { startsAt: 'desc' },
  },
} satisfies Prisma.ClientInclude;

function toSummary(c: ClientWithHistory, now = new Date()): ClientSummaryDTO {
  const ref = (a: ClientWithHistory['appointments'][number]): ClientAppointmentRef => ({
    date: toBusinessDate(a.startsAt),
    time: toBusinessTime(a.startsAt),
    procedure: a.procedure.name,
    status: effectiveStatus(a, now),
  });
  const valid = c.appointments.filter((a) => effectiveStatus(a, now) !== 'EXPIRED');
  const past = valid.filter((a) => a.startsAt <= now && effectiveStatus(a, now) !== 'CANCELLED');
  const future = valid.filter((a) => a.startsAt > now && ['PENDING', 'CONFIRMED'].includes(effectiveStatus(a, now)));
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    totalAppointments: valid.length,
    lastAppointment: past[0] ? ref(past[0]) : null, // lista vem em ordem decrescente
    nextAppointment: future.length ? ref(future[future.length - 1]!) : null,
  };
}

function searchWhere(search?: string): Prisma.ClientWhereInput {
  if (!search) return {};
  const digits = search.replace(/\D/g, '');
  return {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
      { email: { contains: search, mode: 'insensitive' } },
    ],
  };
}

/** Clientes: lista com busca, ficha com histórico e edição de cadastro (ADMIN). */
export async function clientsAdminController(app: FastifyInstance) {
  app.addHook('preHandler', requirePermission('clients:manage'));

  app.get('/clients', async (req): Promise<Paginated<ClientSummaryDTO>> => {
    const { search, page } = validate(clientsQuerySchema, req.query);
    const where = searchWhere(search);
    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: historyInclude,
        orderBy: { name: 'asc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.client.count({ where }),
    ]);
    return { items: clients.map((c) => toSummary(c)), page, pageSize: PAGE_SIZE, total };
  });

  app.get<{ Params: { id: string } }>('/clients/:id', async (req): Promise<ClientDetailDTO> => {
    const id = validate(idSchema, req.params.id);
    const client = await prisma.client.findUnique({ where: { id }, include: historyInclude });
    if (!client) throw notFound('Cliente não encontrada.');
    const history = await prisma.appointment.findMany({
      where: { clientId: id },
      include: appointmentInclude,
      orderBy: { startsAt: 'desc' },
    });
    return { ...toSummary(client), createdAt: client.createdAt.toISOString(), history: history.map((a) => toAdminAppointmentDTO(a)) };
  });

  app.patch<{ Params: { id: string } }>('/clients/:id', async (req) => {
    const id = validate(idSchema, req.params.id);
    const data = validate(clientUpdateSchema, req.body);
    try {
      return await prisma.$transaction(async (tx) => {
        const before = await tx.client.findUnique({ where: { id } });
        if (!before) throw notFound('Cliente não encontrada.');
        const updated = await tx.client.update({ where: { id }, data, include: historyInclude });
        const changes = [
          before.name !== data.name && `nome: ${before.name} → ${data.name}`,
          before.phone !== data.phone && `WhatsApp: ${formatPhoneBR(before.phone)} → ${formatPhoneBR(data.phone)}`,
          before.email !== data.email && 'e-mail',
        ].filter(Boolean);
        if (changes.length) {
          await auditService.log(
            actorFrom(req),
            {
              action: 'client.update',
              entity: 'client',
              entityId: id,
              description: `Editou o cadastro de ${data.name} (${changes.join('; ')})`,
            },
            tx,
          );
        }
        return toSummary(updated);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw conflict('PHONE_IN_USE', 'Já existe outra cliente cadastrada com este WhatsApp.');
      }
      throw error;
    }
  });
}

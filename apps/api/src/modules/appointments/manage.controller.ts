import { formatDateBR, toBusinessDate, toBusinessTime, type ManageBookingDTO } from '@mf/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sha256 } from '../../lib/crypto';
import { AppError, notFound } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { isManageLinkExpired } from '../../lib/security';
import { validate } from '../../lib/validate';
import { actorFrom, auditService } from '../audit/audit.service';
import { scheduleRepository } from '../schedule/schedule.repository';
import { appointmentCode, effectiveStatus } from './appointments.mapper';
import { activeAppointmentWhere } from './appointments.repository';

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{20,64}$/, 'Link inválido');
const HOUR = 3_600_000;

const linkNotFound = () => notFound('Agendamento não encontrado. Confira o link ou fale conosco pelo WhatsApp.');

const linkExpired = () =>
  new AppError(410, 'LINK_EXPIRED', 'Este link expirou. Para falar sobre um atendimento, entre em contato pelo WhatsApp.');

async function load(token: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { manageTokenHash: sha256(token) },
    include: { client: { select: { name: true } }, procedure: { select: { name: true } } },
  });
  if (!appointment) throw linkNotFound();
  if (isManageLinkExpired(appointment.startsAt)) throw linkExpired();
  return appointment;
}

/**
 * Link privado enviado à cliente ao agendar ("gerenciar meu agendamento").
 * Sem login: quem tem o link (token aleatório de 144 bits) pode ver e cancelar.
 * Mostra o mínimo — primeiro nome, procedimento e horário.
 */
export async function manageController(app: FastifyInstance) {
  app.addHook('onSend', async (_req, reply) => {
    reply.header('Cache-Control', 'no-store');
  });

  const config = { rateLimit: { max: 30, timeWindow: '10 minutes' } };

  app.get<{ Params: { token: string } }>('/manage/:token', { config }, async (req): Promise<ManageBookingDTO> => {
    const appointment = await load(validate(tokenSchema, req.params.token));
    const { clientCancelNoticeHours } = await scheduleRepository.getSettings();
    const now = new Date();
    const status = effectiveStatus(appointment, now);
    return {
      code: appointmentCode(appointment.id),
      status,
      procedureName: appointment.procedure.name,
      date: toBusinessDate(appointment.startsAt),
      time: toBusinessTime(appointment.startsAt),
      endTime: toBusinessTime(appointment.endsAt),
      clientFirstName: (appointment.contactName ?? appointment.client.name).split(' ')[0]!,
      canCancel:
        (status === 'PENDING' || status === 'CONFIRMED') &&
        appointment.startsAt.getTime() - now.getTime() >= clientCancelNoticeHours * HOUR,
      cancelNoticeHours: clientCancelNoticeHours,
    };
  });

  app.post<{ Params: { token: string } }>('/manage/:token/cancel', { config }, async (req, reply) => {
    const token = validate(tokenSchema, req.params.token);
    const { clientCancelNoticeHours } = await scheduleRepository.getSettings();
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { manageTokenHash: sha256(token) },
        include: { client: { select: { name: true } }, procedure: { select: { name: true } } },
      });
      if (!appointment) throw linkNotFound();
      if (isManageLinkExpired(appointment.startsAt, now)) throw linkExpired();
      const status = effectiveStatus(appointment, now);
      if (status !== 'PENDING' && status !== 'CONFIRMED') {
        throw new AppError(409, 'INVALID_STATUS', 'Este agendamento não está mais ativo.');
      }
      if (appointment.startsAt.getTime() - now.getTime() < clientCancelNoticeHours * HOUR) {
        throw new AppError(
          409,
          'TOO_LATE',
          `Cancelamentos pelo site são possíveis até ${clientCancelNoticeHours}h antes. Fale conosco pelo WhatsApp.`,
        );
      }
      // M1: condição no próprio UPDATE — dois cliques simultâneos não cancelam/registram duas vezes
      const { count } = await tx.appointment.updateMany({
        where: {
          AND: [
            { id: appointment.id },
            activeAppointmentWhere(now),
            { startsAt: { gte: new Date(now.getTime() + clientCancelNoticeHours * HOUR) } },
          ],
        },
        data: { status: 'CANCELLED', cancelledAt: now, cancelledBy: 'client', cancelReason: 'Cancelado pela cliente pelo link' },
      });
      if (count !== 1) throw new AppError(409, 'INVALID_STATUS', 'Este agendamento não está mais ativo.');
      await auditService.log(
        actorFrom(req, `${appointment.client.name} (cliente)`),
        {
          action: 'appointment.client_cancel',
          entity: 'appointment',
          entityId: appointment.id,
          description: `Cliente cancelou pelo link — ${appointment.procedure.name}, ${formatDateBR(toBusinessDate(appointment.startsAt))} ${toBusinessTime(appointment.startsAt)}`,
        },
        tx,
      );
    });
    return reply.status(204).send();
  });
}

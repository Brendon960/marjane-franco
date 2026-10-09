import {
  addDays,
  blockedTimeSchema,
  blockedTimesQuerySchema,
  businessHoursSchema,
  businessSettingsSchema,
  formatDateBR,
  idSchema,
  toBusinessDate,
  toBusinessTime,
  zonedDateTime,
  type BlockedTimeCreatedDTO,
  type BlockedTimeDTO,
  type BusinessHoursDTO,
  type BusinessSettingsDTO,
} from '@mf/shared';
import type { BlockedTime } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { notFound } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { validate } from '../../lib/validate';
import { appointmentsRepository } from '../appointments/appointments.repository';
import { actorFrom, auditService } from '../audit/audit.service';
import { requirePermission } from '../auth/auth.guard';
import { scheduleRepository } from './schedule.repository';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function toBlockDTO(b: BlockedTime & { createdBy?: { name: string } | null }): BlockedTimeDTO {
  const startTime = toBusinessTime(b.startsAt);
  const endTime = toBusinessTime(b.endsAt);
  const allDay = startTime === '00:00' && endTime === '00:00';
  return {
    id: b.id,
    startDate: toBusinessDate(b.startsAt),
    endDate: toBusinessDate(new Date(b.endsAt.getTime() - 1)),
    allDay,
    startTime: allDay ? null : startTime,
    endTime: allDay ? null : endTime,
    reason: b.reason,
    createdBy: b.createdBy?.name ?? null,
  };
}

function describeBlock(b: BlockedTimeDTO): string {
  if (!b.allDay) return `${formatDateBR(b.startDate)} ${b.startTime}–${b.endTime}`;
  return b.endDate === b.startDate
    ? `${formatDateBR(b.startDate)} (dia inteiro)`
    : `${formatDateBR(b.startDate)} a ${formatDateBR(b.endDate)} (dias inteiros)`;
}

function settingsDTO(s: BusinessSettingsDTO): BusinessSettingsDTO {
  return {
    slotIntervalMinutes: s.slotIntervalMinutes,
    bufferMinutes: s.bufferMinutes,
    minNoticeMinutes: s.minNoticeMinutes,
    maxDaysAhead: s.maxDaysAhead,
    pendingHoldHours: s.pendingHoldHours,
    clientCancelNoticeHours: s.clientCancelNoticeHours,
    paymentMethods: s.paymentMethods,
    address: s.address,
  };
}

/** Expediente semanal, bloqueios de agenda e configurações da clínica (ADMIN). */
export async function scheduleAdminController(app: FastifyInstance) {
  app.addHook('preHandler', requirePermission('schedule:manage'));

  // ---- Expediente --------------------------------------------------------

  app.get('/business-hours', async (): Promise<BusinessHoursDTO> => {
    const hours = await scheduleRepository.listActiveHours();
    return {
      days: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        intervals: hours.filter((h) => h.dayOfWeek === dayOfWeek).map((h) => ({ start: h.startTime, end: h.endTime })),
      })),
    };
  });

  app.put('/business-hours', async (req): Promise<BusinessHoursDTO> => {
    const { days } = validate(businessHoursSchema, req.body);
    const rows = days.flatMap((d) =>
      [...d.intervals]
        .sort((a, b) => a.start.localeCompare(b.start))
        .map((i) => ({ dayOfWeek: d.dayOfWeek, startTime: i.start, endTime: i.end })),
    );
    const summary = [1, 2, 3, 4, 5, 6, 0]
      .map((d) => {
        const day = rows.filter((r) => r.dayOfWeek === d);
        return `${WEEKDAYS[d]}: ${day.length ? day.map((r) => `${r.startTime}–${r.endTime}`).join(', ') : 'fechado'}`;
      })
      .join(' · ');

    await prisma.$transaction(async (tx) => {
      await scheduleRepository.replaceHours(rows, tx);
      await auditService.log(
        actorFrom(req),
        { action: 'schedule.hours_update', entity: 'business_hours', description: `Alterou o horário de atendimento — ${summary}` },
        tx,
      );
    });
    return { days: days.map((d) => ({ dayOfWeek: d.dayOfWeek, intervals: d.intervals })) };
  });

  // ---- Bloqueios ---------------------------------------------------------

  app.get('/blocked-times', async (req): Promise<BlockedTimeDTO[]> => {
    const { from } = validate(blockedTimesQuerySchema, req.query);
    const blocks = await scheduleRepository.listBlocksFrom(zonedDateTime(from ?? toBusinessDate(new Date())));
    return blocks.map(toBlockDTO);
  });

  app.post('/blocked-times', async (req, reply) => {
    const input = validate(blockedTimeSchema, req.body);
    const startsAt = input.allDay ? zonedDateTime(input.startDate) : zonedDateTime(input.startDate, input.startTime!);
    const endsAt = input.allDay
      ? zonedDateTime(addDays(input.endDate ?? input.startDate, 1))
      : zonedDateTime(input.startDate, input.endTime!);

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.blockedTime.create({
        data: { startsAt, endsAt, reason: input.reason, createdById: req.user!.id },
        include: { createdBy: { select: { name: true } } },
      });
      const block = toBlockDTO(created);
      // Agendamentos já marcados no período NÃO são cancelados automaticamente — a profissional decide.
      const conflicts = (await appointmentsRepository.listActiveBetween(startsAt, endsAt, new Date(), tx)).length;
      await auditService.log(
        actorFrom(req),
        {
          action: 'schedule.block_create',
          entity: 'blocked_time',
          entityId: block.id,
          description: `Bloqueou a agenda: ${describeBlock(block)}${block.reason ? ` — ${block.reason}` : ''}`,
        },
        tx,
      );
      return { block, conflicts } satisfies BlockedTimeCreatedDTO;
    });
    return reply.status(201).send(result);
  });

  app.delete<{ Params: { id: string } }>('/blocked-times/:id', async (req, reply) => {
    const id = validate(idSchema, req.params.id);
    await prisma.$transaction(async (tx) => {
      const existing = await tx.blockedTime.findUnique({ where: { id } });
      if (!existing) throw notFound('Bloqueio não encontrado.');
      await tx.blockedTime.delete({ where: { id } });
      const block = toBlockDTO(existing);
      await auditService.log(
        actorFrom(req),
        {
          action: 'schedule.block_delete',
          entity: 'blocked_time',
          entityId: id,
          description: `Removeu o bloqueio de ${describeBlock(block)}${block.reason ? ` — ${block.reason}` : ''}`,
        },
        tx,
      );
    });
    return reply.status(204).send();
  });

  // ---- Configurações da clínica -------------------------------------------

  app.get('/settings', async (): Promise<BusinessSettingsDTO> => settingsDTO(await scheduleRepository.getSettings()));

  app.put('/settings', async (req): Promise<BusinessSettingsDTO> => {
    const data = validate(businessSettingsSchema, req.body);
    const before = settingsDTO(await scheduleRepository.getSettings());
    const changed = (Object.keys(data) as (keyof BusinessSettingsDTO)[]).filter(
      (k) => JSON.stringify(before[k]) !== JSON.stringify(data[k]),
    );
    const saved = await prisma.$transaction(async (tx) => {
      const row = await scheduleRepository.updateSettings(data, tx);
      if (changed.length) {
        await auditService.log(
          actorFrom(req),
          {
            action: 'settings.update',
            entity: 'business_settings',
            description: `Alterou as configurações da clínica (${changed.join(', ')})`,
            metadata: { before: Object.fromEntries(changed.map((k) => [k, before[k]])), after: Object.fromEntries(changed.map((k) => [k, data[k]])) },
          },
          tx,
        );
      }
      return row;
    });
    return settingsDTO(saved);
  });
}

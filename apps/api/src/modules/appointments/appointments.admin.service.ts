import {
  addDays,
  dayOfWeek,
  formatDateBR,
  toBusinessDate,
  toBusinessTime,
  zonedDateTime,
  APPOINTMENT_STATUS_LABELS,
  type AdminAppointmentDTO,
  type AgendaDayDTO,
  type BulkCancelItemDTO,
  type BulkCancelResultDTO,
  type AppointmentStatus,
  type DashboardDTO,
  type Paginated,
  type SlotCheckDTO,
  type adminAppointmentSchema,
  type appointmentsQuerySchema,
} from '@mf/shared';
import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { AppError, notFound } from '../../lib/errors';
import { isOverlapViolation, prisma, type Db } from '../../lib/prisma';
import { availabilityService } from '../availability/availability.service';
import { auditService, type Actor } from '../audit/audit.service';
import { clientsRepository } from '../clients/clients.repository';
import {
  appointmentEmailService,
  describeDelivery,
  reserveEmailData,
  type AppointmentEmailKind,
  type DeliveryResult,
} from '../notifications/appointment-email.service';
import { scheduleRepository } from '../schedule/schedule.repository';
import { activeAppointmentWhere, appointmentsRepository } from './appointments.repository';
import { appointmentInclude, effectiveStatus, toAdminAppointmentDTO } from './appointments.mapper';

const MINUTE = 60_000;
const PAGE_SIZE = 30;

const slotTaken = () =>
  new AppError(409, 'SLOT_UNAVAILABLE', 'Este horário se sobrepõe a outro agendamento. Escolha outro horário.');
const invalidStatus = (message: string) => new AppError(409, 'INVALID_STATUS', message);
const inThePast = () => new AppError(422, 'PAST_DATE', 'Não é possível marcar um horário que já passou.');

const when = (a: Pick<AdminAppointmentDTO, 'date' | 'time'>) => `${formatDateBR(a.date)} ${a.time}`;

/** Executa a alteração e converte violação da constraint de sobreposição em 409. */
async function guardOverlap<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isOverlapViolation(error)) throw slotTaken();
    throw error;
  }
}

async function requireAppointment(id: string, db: Db = prisma) {
  const appointment = await db.appointment.findUnique({ where: { id }, include: appointmentInclude });
  if (!appointment) throw notFound('Agendamento não encontrado.');
  return appointment;
}

async function requireProcedure(id: string, db: Db = prisma) {
  const procedure = await db.procedure.findUnique({ where: { id } });
  if (!procedure) throw notFound('Procedimento não encontrado.');
  return procedure;
}

type CancelledRecord = Awaited<ReturnType<typeof requireAppointment>>;

/**
 * M1 — transição atômica: grava SÓ se o agendamento ainda estiver na situação esperada.
 * A condição vai no próprio UPDATE (o banco decide), então duas ações simultâneas sobre o
 * mesmo agendamento nunca passam as duas (ex.: dois cancelamentos → dois e-mails).
 */
async function guardedUpdate(
  tx: Db,
  id: string,
  condition: Prisma.AppointmentWhereInput,
  data: Prisma.AppointmentUncheckedUpdateManyInput,
  failMessage: string,
) {
  const { count } = await tx.appointment.updateMany({ where: { AND: [{ id }, condition] }, data });
  if (count !== 1) throw invalidStatus(failMessage);
  return tx.appointment.findUniqueOrThrow({ where: { id }, include: appointmentInclude });
}

/** Cancela UM agendamento na própria transação e reserva o aviso por e-mail (não envia). */
async function cancelRecord(id: string, reason: string | null, actor: Actor, now: Date): Promise<CancelledRecord> {
  return prisma.$transaction(async (tx) => {
    const current = await requireAppointment(id, tx);
    const status = effectiveStatus(current, now);
    if (status !== 'PENDING' && status !== 'CONFIRMED') {
      throw invalidStatus('Este agendamento não pode mais ser cancelado.');
    }
    return guardedUpdate(
      tx,
      id,
      activeAppointmentWhere(now),
      {
        status: 'CANCELLED',
        cancelledAt: now,
        cancelledBy: 'admin',
        cancelledById: actor.userId,
        cancelReason: reason,
        ...(reserveEmailData('cancellation') as Prisma.AppointmentUncheckedUpdateManyInput),
      },
      'Este agendamento não pode mais ser cancelado.',
    );
  });
}

/** Log individual de cada cancelamento (também dentro do cancelamento em massa). */
function logCancellation(actor: Actor, record: CancelledRecord, reason: string | null, result: DeliveryResult, bulk: boolean) {
  const dto = toAdminAppointmentDTO(record);
  return auditService.log(actor, {
    action: 'appointment.cancel',
    entity: 'appointment',
    entityId: record.id,
    description:
      `Cancelou agendamento${bulk ? ' (em massa)' : ''} — Cliente: ${record.client.name} · Procedimento: ${record.procedure.name}` +
      ` · Data: ${formatDateBR(dto.date)} · Horário: ${dto.time} · Status: CANCELADO · E-mail: ${describeDelivery(result)}` +
      `${reason ? ` · Motivo: ${reason}` : ''}`,
    metadata: { bulk, reason, email: { status: result.status, to: result.to, error: result.error } },
  });
}

/** Executa `fn` para cada item, no máximo `limit` ao mesmo tempo. Um erro não interrompe os outros. */
async function forEachLimit<T>(list: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const item = list[next++]!;
      await fn(item).catch(() => undefined);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker));
}

function searchWhere(search?: string): Prisma.AppointmentWhereInput {
  if (!search) return {};
  const or: Prisma.AppointmentWhereInput[] = [
    { client: { name: { contains: search, mode: 'insensitive' } } },
    { procedure: { name: { contains: search, mode: 'insensitive' } } },
  ];
  const digits = search.replace(/\D/g, '');
  if (digits.length >= 4) or.push({ client: { phone: { contains: digits } } });
  // Código curto (6 primeiros caracteres do id)
  if (/^[0-9a-f]{6}$/i.test(search)) {
    const p = search.toLowerCase();
    or.push({ id: { gte: `${p}00-0000-0000-0000-000000000000`, lte: `${p}ff-ffff-ffff-ffff-ffffffffffff` } });
  }
  return { OR: or };
}

export const appointmentsAdminService = {
  /** Agenda de um dia: expediente, bloqueios e agendamentos (inclusive cancelados). */
  async agenda(date: string, now = new Date()): Promise<AgendaDayDTO> {
    await appointmentsRepository.expireStalePending(now);
    const from = zonedDateTime(date);
    const to = zonedDateTime(addDays(date, 1));
    const weekday = dayOfWeek(date);
    const [hours, blocks, appointments] = await Promise.all([
      scheduleRepository.listActiveHours(),
      scheduleRepository.listBlocksFrom(from, to),
      prisma.appointment.findMany({
        where: { startsAt: { gte: from, lt: to }, status: { not: 'EXPIRED' } },
        include: appointmentInclude,
        orderBy: { startsAt: 'asc' },
      }),
    ]);
    return {
      date,
      intervals: hours.filter((h) => h.dayOfWeek === weekday).map((h) => ({ start: h.startTime, end: h.endTime })),
      blocks: blocks.map((b) => ({
        id: b.id,
        start: b.startsAt <= from ? '00:00' : toBusinessTime(b.startsAt),
        end: b.endsAt >= to ? '24:00' : toBusinessTime(b.endsAt),
        reason: b.reason,
      })),
      appointments: appointments.map((a) => toAdminAppointmentDTO(a, now)),
    };
  },

  async dashboard(now = new Date()): Promise<DashboardDTO> {
    await appointmentsRepository.expireStalePending(now);
    const today = toBusinessDate(now);
    const from = zonedDateTime(today);
    const to = zonedDateTime(addDays(today, 1));
    const settings = await scheduleRepository.getSettings();

    const [todayAppointments, pending, upcoming, cancelled, freeSlotsToday] = await Promise.all([
      prisma.appointment.findMany({
        where: { startsAt: { gte: from, lt: to }, status: { not: 'EXPIRED' } },
        include: appointmentInclude,
        orderBy: { startsAt: 'asc' },
      }),
      prisma.appointment.findMany({
        where: { status: 'PENDING', endsAt: { gt: now } },
        include: appointmentInclude,
        orderBy: { startsAt: 'asc' },
        take: 10,
      }),
      prisma.appointment.findMany({
        where: { status: { in: ['CONFIRMED', 'PENDING'] }, startsAt: { gte: now } },
        include: appointmentInclude,
        orderBy: { startsAt: 'asc' },
        take: 8,
      }),
      prisma.appointment.findMany({
        where: { status: 'CANCELLED' },
        include: appointmentInclude,
        orderBy: [{ cancelledAt: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }],
        take: 5,
      }),
      availabilityService.freeSlots(settings.slotIntervalMinutes, today, now, prisma, { staff: true }),
    ]);

    const statuses = todayAppointments.map((a) => effectiveStatus(a, now));
    const dto = (list: typeof todayAppointments) => list.map((a) => toAdminAppointmentDTO(a, now));
    return {
      date: today,
      counts: {
        total: statuses.length,
        confirmed: statuses.filter((s) => s === 'CONFIRMED' || s === 'COMPLETED').length,
        pending: statuses.filter((s) => s === 'PENDING').length,
        cancelled: statuses.filter((s) => s === 'CANCELLED').length,
      },
      pendingToConfirm: dto(pending),
      upcoming: dto(upcoming),
      freeSlotsToday,
      busyToday: dto(todayAppointments.filter((a) => ['CONFIRMED', 'PENDING'].includes(effectiveStatus(a, now)))),
      recentCancellations: dto(cancelled),
    };
  },

  async list(query: z.output<typeof appointmentsQuerySchema>, now = new Date()): Promise<Paginated<AdminAppointmentDTO>> {
    await appointmentsRepository.expireStalePending(now);
    const where: Prisma.AppointmentWhereInput = {
      ...(query.from || query.to
        ? {
            startsAt: {
              ...(query.from && { gte: zonedDateTime(query.from) }),
              ...(query.to && { lt: zonedDateTime(addDays(query.to, 1)) }),
            },
          }
        : {}),
      ...(query.status && { status: query.status }),
      ...searchWhere(query.search),
    };
    // Sem período inicial (histórico): mais recentes primeiro
    const order = query.from ? 'asc' : 'desc';
    const [items, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: appointmentInclude,
        orderBy: { startsAt: order },
        skip: (query.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.appointment.count({ where }),
    ]);
    return { items: items.map((a) => toAdminAppointmentDTO(a, now)), page: query.page, pageSize: PAGE_SIZE, total };
  },

  async get(id: string) {
    return toAdminAppointmentDTO(await requireAppointment(id));
  },

  /** Horários livres sugeridos no painel (sem antecedência mínima nem limite de dias). */
  async suggestSlots(procedureId: string, date: string, excludeId?: string, now = new Date()) {
    const duration = excludeId
      ? (await requireAppointment(excludeId)).durationMinutes
      : (await requireProcedure(procedureId)).durationMinutes;
    return availabilityService.freeSlots(duration, date, now, prisma, { staff: true, excludeAppointmentId: excludeId });
  },

  async checkSlot(procedureId: string, date: string, time: string, excludeId?: string, now = new Date()): Promise<SlotCheckDTO> {
    const duration = excludeId
      ? (await requireAppointment(excludeId)).durationMinutes
      : (await requireProcedure(procedureId)).durationMinutes;
    return availabilityService.checkSlot(duration, date, time, now, prisma, excludeId);
  },

  /** Agendamento lançado pela profissional. Pode ser encaixe fora do expediente; nunca sobreposto. */
  async create(input: z.output<typeof adminAppointmentSchema>, actor: Actor, now = new Date()) {
    const procedure = await requireProcedure(input.procedureId);
    const startsAt = zonedDateTime(input.date, input.time);
    const endsAt = new Date(startsAt.getTime() + procedure.durationMinutes * MINUTE);
    if (startsAt < now) throw inThePast();

    return guardOverlap(() =>
      prisma.$transaction(async (tx) => {
        await appointmentsRepository.expireStalePending(now, tx);
        const check = await availabilityService.checkSlot(procedure.durationMinutes, input.date, input.time, now, tx);
        if (check.conflict) throw slotTaken();

        const client = await clientsRepository.upsertByPhoneAsStaff({ name: input.name, phone: input.phone, email: input.email }, tx);
        const created = await tx.appointment.create({
          data: {
            clientId: client.id,
            procedureId: procedure.id,
            startsAt,
            endsAt,
            durationMinutes: procedure.durationMinutes,
            status: input.status,
            notes: input.notes,
            source: 'admin',
            contactName: input.name,
            contactEmail: input.email,
          },
          include: appointmentInclude,
        });
        const dto = toAdminAppointmentDTO(created, now);
        await auditService.log(
          actor,
          {
            action: 'appointment.create',
            entity: 'appointment',
            entityId: created.id,
            description: `Criou agendamento de ${client.name} — ${procedure.name}, ${when(dto)}${check.outsideHours ? ' (encaixe fora do expediente)' : ''}`,
          },
          tx,
        );
        return dto;
      }),
    );
  },

  async reschedule(id: string, target: { date: string; time: string }, actor: Actor, now = new Date()) {
    const startsAt = zonedDateTime(target.date, target.time);
    if (startsAt < now) throw inThePast();

    return guardOverlap(() =>
      prisma.$transaction(async (tx) => {
        await appointmentsRepository.expireStalePending(now, tx);
        const current = await requireAppointment(id, tx);
        const status = effectiveStatus(current, now);
        if (status !== 'PENDING' && status !== 'CONFIRMED') {
          throw invalidStatus('Só é possível alterar agendamentos confirmados ou aguardando confirmação.');
        }
        const check = await availabilityService.checkSlot(current.durationMinutes, target.date, target.time, now, tx, id);
        if (check.conflict) throw slotTaken();

        const before = toAdminAppointmentDTO(current, now);
        const updated = await guardedUpdate(
          tx,
          id,
          activeAppointmentWhere(now),
          { startsAt, endsAt: new Date(startsAt.getTime() + current.durationMinutes * MINUTE) },
          'Só é possível alterar agendamentos confirmados ou aguardando confirmação.',
        );
        const after = toAdminAppointmentDTO(updated, now);
        const change = before.date === after.date ? `${formatDateBR(after.date)}: ${before.time} → ${after.time}` : `${when(before)} → ${when(after)}`;
        await auditService.log(
          actor,
          {
            action: 'appointment.reschedule',
            entity: 'appointment',
            entityId: id,
            description: `Alterou agendamento de ${current.client.name} (${current.procedure.name}) — ${change}`,
            metadata: { from: { date: before.date, time: before.time }, to: { date: after.date, time: after.time } },
          },
          tx,
        );
        return after;
      }),
    );
  },

  /**
   * Cancelamento individual pela clínica: status CANCELADO (sem apagar — fica no histórico)
   * e, em seguida, aviso por e-mail para a cliente. Falha no e-mail não desfaz o cancelamento.
   */
  async cancel(id: string, reason: string | null, actor: Actor, now = new Date()) {
    const cancelled = await cancelRecord(id, reason, actor, now);
    const result = await appointmentEmailService.deliver('cancellation', id);
    await logCancellation(actor, cancelled, reason, result, false);
    return this.get(id);
  },

  /**
   * Cancelamento em massa (seleção na agenda ou "todos do dia").
   * Cada agendamento é cancelado na própria transação — um item com problema não impede os demais —
   * e cada cliente recebe o PRÓPRIO e-mail (nunca um e-mail com vários clientes).
   */
  async bulkCancel(ids: string[], reason: string | null, actor: Actor, now = new Date()): Promise<BulkCancelResultDTO> {
    const items = new Map<string, BulkCancelItemDTO>();
    const cancelled: CancelledRecord[] = [];

    for (const id of ids) {
      try {
        cancelled.push(await cancelRecord(id, reason, actor, now));
      } catch (error) {
        const existing = await prisma.appointment.findUnique({ where: { id }, include: appointmentInclude });
        const dto = existing ? toAdminAppointmentDTO(existing, now) : null;
        items.set(id, {
          id,
          clientName: dto?.client.name ?? '—',
          procedure: dto?.procedure.name ?? '—',
          date: dto?.date ?? '',
          time: dto?.time ?? '',
          result: dto ? 'skipped' : 'not_found',
          detail: !dto
            ? 'Agendamento não encontrado.'
            : error instanceof AppError
              ? `${error.message} (situação: ${APPOINTMENT_STATUS_LABELS[dto.status]})`
              : 'Erro inesperado ao cancelar.',
          email: null,
        });
      }
    }

    // E-mails individuais, poucos por vez (não sobrecarrega o servidor de e-mail)
    await forEachLimit(cancelled, 3, async (record) => {
      const result = await appointmentEmailService.deliver('cancellation', record.id);
      await logCancellation(actor, record, reason, result, true);
      const dto = toAdminAppointmentDTO(record, now);
      items.set(record.id, {
        id: record.id,
        clientName: record.client.name,
        procedure: record.procedure.name,
        date: dto.date,
        time: dto.time,
        result: 'cancelled',
        detail: null,
        email: { status: result.status, to: result.to, error: result.error },
      });
    });

    const ordered = ids.map((id) => items.get(id)).filter((i): i is BulkCancelItemDTO => Boolean(i));
    const summary: BulkCancelResultDTO = {
      requested: ids.length,
      cancelled: cancelled.length,
      skipped: ordered.filter((i) => i.result !== 'cancelled').length,
      emailsSent: ordered.filter((i) => i.email?.status === 'SENT').length,
      emailsFailed: ordered.filter((i) => i.email?.status === 'FAILED').length,
      noEmail: ordered.filter((i) => i.email?.status === 'SKIPPED').length,
      items: ordered,
    };

    await auditService.log(actor, {
      action: 'appointment.bulk_cancel',
      entity: 'appointment',
      description:
        `Cancelamento em massa — ${summary.cancelled} de ${summary.requested} agendamento(s) cancelado(s)` +
        `${reason ? ` · Motivo: ${reason}` : ''}` +
        ` · Resultado: ${summary.emailsSent} e-mail(s) enviado(s), ${summary.emailsFailed} falha(s), ${summary.noEmail} sem e-mail` +
        `${summary.skipped ? `, ${summary.skipped} ignorado(s) (não estavam mais ativos)` : ''}`,
      metadata: {
        reason,
        requested: summary.requested,
        cancelled: summary.cancelled,
        emailsSent: summary.emailsSent,
        emailsFailed: summary.emailsFailed,
        noEmail: summary.noEmail,
        skipped: summary.skipped,
        ids,
      },
    });
    return summary;
  },

  async setStatus(id: string, status: Extract<AppointmentStatus, 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW'>, actor: Actor, now = new Date()) {
    if (status === 'CONFIRMED') return this.confirm(id, actor, now);

    return prisma.$transaction(async (tx) => {
      const current = await requireAppointment(id, tx);
      const currentStatus = effectiveStatus(current, now);
      if (currentStatus !== 'CONFIRMED' && currentStatus !== 'PENDING') throw invalidStatus('Status atual não permite esta alteração.');
      if (current.startsAt > now) throw invalidStatus('O atendimento ainda não começou.');

      const updated = await guardedUpdate(
        tx,
        id,
        { status: { in: ['CONFIRMED', 'PENDING'] }, startsAt: { lte: now } },
        { status },
        'Status atual não permite esta alteração.',
      );
      const dto = toAdminAppointmentDTO(updated, now);
      await auditService.log(
        actor,
        {
          action: status === 'COMPLETED' ? 'appointment.complete' : 'appointment.no_show',
          entity: 'appointment',
          entityId: id,
          description: `${status === 'COMPLETED' ? 'Marcou como realizado o' : 'Marcou falta no'} agendamento de ${current.client.name} (${current.procedure.name}, ${when(dto)})`,
        },
        tx,
      );
      return dto;
    });
  },

  /**
   * Confirmação pela profissional: PENDENTE → CONFIRMADO (com data/hora e quem confirmou)
   * e, em seguida, envio do e-mail de confirmação para a cliente.
   * A confirmação é gravada ANTES do envio: se o e-mail falhar, o agendamento continua
   * confirmado e o painel oferece "Enviar novamente".
   */
  async confirm(id: string, actor: Actor, now = new Date()) {
    const confirmed = await guardOverlap(() =>
      prisma.$transaction(async (tx) => {
        const current = await requireAppointment(id, tx);
        const currentStatus = effectiveStatus(current, now);
        // Pré-reserva expirada ainda pode ser confirmada se o horário continuar livre (a constraint garante)
        if (currentStatus !== 'PENDING' && currentStatus !== 'EXPIRED') throw invalidStatus('Só pré-reservas podem ser confirmadas.');
        if (current.endsAt <= now) throw invalidStatus('Este horário já passou.');
        return guardedUpdate(
          tx,
          id,
          { status: { in: ['PENDING', 'EXPIRED'] }, endsAt: { gt: now } },
          {
            status: 'CONFIRMED',
            expiresAt: null,
            confirmedAt: now,
            confirmedById: actor.userId,
            // Reserva o envio: impede mensagem duplicada se houver um segundo clique
            ...(reserveEmailData('confirmation') as Prisma.AppointmentUncheckedUpdateManyInput),
          },
          'Só pré-reservas podem ser confirmadas.',
        );
      }),
    );

    const result = await appointmentEmailService.deliver('confirmation', id);
    const dto = toAdminAppointmentDTO(confirmed, now);
    await auditService.log(actor, {
      action: 'appointment.confirm',
      entity: 'appointment',
      entityId: id,
      description: `Confirmou o agendamento — Cliente: ${confirmed.client.name} · Procedimento: ${confirmed.procedure.name} · Data: ${formatDateBR(dto.date)} · Horário: ${dto.time} · E-mail: ${result.status === 'SENT' ? `confirmação enviada para ${result.to}` : `falha no envio (${result.error})`}`,
      metadata: { email: { status: result.status, to: result.to, error: result.error } },
    });
    return this.get(id);
  },

  /** "Enviar novamente" (ou primeiro envio de um agendamento lançado já confirmado). */
  async resendConfirmationEmail(id: string, actor: Actor, now = new Date()) {
    return this.resendEmail('confirmation', id, actor, now);
  },

  /** "Enviar novamente" o aviso de cancelamento. */
  async resendCancellationEmail(id: string, actor: Actor, now = new Date()) {
    return this.resendEmail('cancellation', id, actor, now);
  },

  async resendEmail(kind: AppointmentEmailKind, id: string, actor: Actor, now = new Date()) {
    const current = await requireAppointment(id);
    const label = kind === 'confirmation' ? 'o e-mail de confirmação' : 'o aviso de cancelamento';
    if (kind === 'confirmation') {
      if (current.status !== 'CONFIRMED') throw invalidStatus('Só agendamentos confirmados recebem o e-mail de confirmação.');
      if (current.startsAt <= now) throw invalidStatus('Este horário já passou.');
    } else if (current.status !== 'CANCELLED' || current.cancelledBy !== 'admin') {
      throw invalidStatus('Só agendamentos cancelados pela clínica recebem o aviso de cancelamento.');
    }
    if (!(await appointmentEmailService.claim(kind, id, now))) {
      throw new AppError(409, 'ALREADY_SENT', kind === 'confirmation'
        ? 'O e-mail de confirmação já foi enviado ou está sendo enviado agora.'
        : 'O aviso de cancelamento já foi enviado ou está sendo enviado agora.');
    }
    const result = await appointmentEmailService.deliver(kind, id);
    await auditService.log(actor, {
      action: result.status === 'SENT' ? 'appointment.email_resend' : 'appointment.email_failed',
      entity: 'appointment',
      entityId: id,
      description: `Reenviou ${label} para ${current.client.name} (${current.procedure.name}) — ${describeDelivery(result)}`,
    });
    return this.get(id);
  },
};

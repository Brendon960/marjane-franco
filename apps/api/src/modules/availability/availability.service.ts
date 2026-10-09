import {
  addDays,
  dayOfWeek,
  daysInMonth,
  minutesToTime,
  timeToMinutes,
  toBusinessDate,
  zonedDateTime,
  type DayAvailabilityDTO,
  type SlotCheckDTO,
} from '@mf/shared';
import type { Procedure } from '@prisma/client';
import { prisma, type Db } from '../../lib/prisma';
import { appointmentsRepository } from '../appointments/appointments.repository';
import { scheduleRepository } from '../schedule/schedule.repository';
import { computeSlots } from './slots';

const MINUTE = 60_000;

interface ScheduleContext {
  settings: Awaited<ReturnType<typeof scheduleRepository.getSettings>>;
  hours: Awaited<ReturnType<typeof scheduleRepository.listActiveHours>>;
  busy: { start: Date; end: Date }[];
}

export interface SlotOptions {
  /** Ignora este agendamento na checagem de conflito (remarcação). */
  excludeAppointmentId?: string;
  /**
   * Painel da profissional: sem antecedência mínima e sem limite de dias à frente.
   * Continua sem oferecer horários que já passaram.
   */
  staff?: boolean;
}

/** Carrega expediente, bloqueios e agendamentos que afetam o período [from, to). */
async function loadContext(from: Date, to: Date, now: Date, db: Db = prisma, excludeId?: string): Promise<ScheduleContext> {
  const settings = await scheduleRepository.getSettings(db);
  const buffer = settings.bufferMinutes * MINUTE;
  const [hours, blocked, appointments] = await Promise.all([
    scheduleRepository.listActiveHours(db),
    scheduleRepository.listBlockedBetween(from, to, db),
    appointmentsRepository.listActiveBetween(new Date(from.getTime() - buffer), new Date(to.getTime() + buffer), now, db, excludeId),
  ]);
  return {
    settings,
    hours,
    busy: [
      ...blocked.map((b) => ({ start: b.startsAt, end: b.endsAt })),
      // a folga entre atendimentos é aplicada em volta de cada agendamento existente
      ...appointments.map((a) => ({
        start: new Date(a.startsAt.getTime() - buffer),
        end: new Date(a.endsAt.getTime() + buffer),
      })),
    ],
  };
}

function slotsForDay(date: string, durationMinutes: number, ctx: ScheduleContext, now: Date, staff = false): string[] {
  const today = toBusinessDate(now);
  if (date < today || (!staff && date > addDays(today, ctx.settings.maxDaysAhead))) return [];

  const weekday = dayOfWeek(date);
  const intervals = ctx.hours
    .filter((h) => h.dayOfWeek === weekday)
    .map((h) => ({ start: timeToMinutes(h.startTime), end: timeToMinutes(h.endTime) }));
  if (intervals.length === 0) return [];

  const dayStart = zonedDateTime(date).getTime();
  const toDayMinutes = (instant: Date) => (instant.getTime() - dayStart) / MINUTE;

  return computeSlots({
    intervals,
    busy: ctx.busy.map((b) => ({ start: toDayMinutes(b.start), end: toDayMinutes(b.end) })),
    durationMinutes,
    stepMinutes: ctx.settings.slotIntervalMinutes,
    earliestStart: toDayMinutes(now) + (staff ? 0 : ctx.settings.minNoticeMinutes),
  }).map(minutesToTime);
}

export const availabilityService = {
  /** Horários livres de um procedimento em uma data. Aceita transação para revalidar no momento do agendamento. */
  async slotsFor(procedure: Procedure, date: string, now = new Date(), db: Db = prisma, options: SlotOptions = {}): Promise<string[]> {
    return this.freeSlots(procedure.durationMinutes, date, now, db, options);
  },

  /** Inícios livres para um atendimento de `durationMinutes` em uma data. */
  async freeSlots(durationMinutes: number, date: string, now = new Date(), db: Db = prisma, options: SlotOptions = {}) {
    const ctx = await loadContext(zonedDateTime(date), zonedDateTime(addDays(date, 1)), now, db, options.excludeAppointmentId);
    return slotsForDay(date, durationMinutes, ctx, now, options.staff);
  },

  /**
   * Confere um horário escolhido livremente pela profissional (encaixe).
   * Bloqueia só o que não pode acontecer — sobrepor outro agendamento ou marcar no passado;
   * fora do expediente e dentro de bloqueio são apenas avisos.
   */
  async checkSlot(
    durationMinutes: number,
    date: string,
    time: string,
    now = new Date(),
    db: Db = prisma,
    excludeAppointmentId?: string,
  ): Promise<SlotCheckDTO> {
    const startsAt = zonedDateTime(date, time);
    const endsAt = new Date(startsAt.getTime() + durationMinutes * MINUTE);
    const [appointments, blocked, hours] = await Promise.all([
      appointmentsRepository.listActiveBetween(startsAt, endsAt, now, db, excludeAppointmentId),
      scheduleRepository.listBlockedBetween(startsAt, endsAt, db),
      scheduleRepository.listActiveHours(db),
    ]);
    const start = timeToMinutes(time);
    const end = start + durationMinutes;
    const weekday = dayOfWeek(date);
    const insideHours = hours.some(
      (h) => h.dayOfWeek === weekday && timeToMinutes(h.startTime) <= start && end <= timeToMinutes(h.endTime),
    );
    const conflict = appointments.length > 0;
    const past = startsAt.getTime() < now.getTime();
    return { ok: !conflict && !past, conflict, past, outsideHours: !insideHours, blocked: blocked.length > 0 };
  },

  /** Quais dias do mês têm pelo menos um horário livre — usado para bloquear dias no calendário. */
  async daysFor(procedure: Procedure, month: string, now = new Date()): Promise<DayAvailabilityDTO[]> {
    const days = daysInMonth(month);
    const ctx = await loadContext(zonedDateTime(days[0]!), zonedDateTime(addDays(days.at(-1)!, 1)), now);
    return days.map((date) => ({ date, available: slotsForDay(date, procedure.durationMinutes, ctx, now).length > 0 }));
  },
};

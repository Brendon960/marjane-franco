import type { Prisma } from '@prisma/client';
import { prisma, type Db } from '../../lib/prisma';

/** Agendamentos que ocupam a agenda: confirmados e pré-reservas ainda dentro do prazo. */
export function activeAppointmentWhere(now: Date): Prisma.AppointmentWhereInput {
  return {
    OR: [
      { status: 'CONFIRMED' },
      { status: 'PENDING', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    ],
  };
}

export const appointmentsRepository = {
  /** Agendamentos ativos que se sobrepõem ao intervalo [from, to). `excludeId`: ignora um (remarcação). */
  listActiveBetween(from: Date, to: Date, now: Date, db: Db = prisma, excludeId?: string) {
    return db.appointment.findMany({
      where: {
        startsAt: { lt: to },
        endsAt: { gt: from },
        ...activeAppointmentWhere(now),
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { startsAt: true, endsAt: true },
    });
  },

  /**
   * Marca como expiradas as pré-reservas vencidas. Roda antes de cada novo
   * agendamento, liberando o horário para a constraint de sobreposição sem
   * depender de um job agendado.
   */
  expireStalePending(now: Date, db: Db = prisma) {
    return db.appointment.updateMany({
      where: { status: 'PENDING', expiresAt: { lte: now } },
      data: { status: 'EXPIRED' },
    });
  },

  hasActiveFutureBooking(clientId: string, procedureId: string, now: Date, db: Db = prisma) {
    return db.appointment
      .count({ where: { clientId, procedureId, startsAt: { gt: now }, ...activeAppointmentWhere(now) } })
      .then((count) => count > 0);
  },

  create(data: Prisma.AppointmentUncheckedCreateInput, db: Db = prisma) {
    return db.appointment.create({ data });
  },
};

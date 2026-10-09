import type { BusinessSettings, Prisma } from '@prisma/client';
import { prisma, type Db } from '../../lib/prisma';

const DEFAULT_SETTINGS: Omit<BusinessSettings, 'updatedAt'> = {
  id: 1,
  slotIntervalMinutes: 30,
  bufferMinutes: 0,
  minNoticeMinutes: 120,
  maxDaysAhead: 60,
  pendingHoldHours: 12,
  clientCancelNoticeHours: 24,
  paymentMethods: [],
  address: null,
};

export const scheduleRepository = {
  async getSettings(db: Db = prisma) {
    return (await db.businessSettings.findUnique({ where: { id: 1 } })) ?? DEFAULT_SETTINGS;
  },

  updateSettings(data: Omit<Prisma.BusinessSettingsCreateInput, 'id'>, db: Db = prisma) {
    return db.businessSettings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
  },

  listActiveHours(db: Db = prisma) {
    return db.businessHour.findMany({
      where: { active: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  },

  /** Substitui todo o expediente semanal (usado pelo painel, dentro de transação). */
  async replaceHours(rows: { dayOfWeek: number; startTime: string; endTime: string }[], db: Db) {
    await db.businessHour.deleteMany({});
    if (rows.length) await db.businessHour.createMany({ data: rows });
  },

  /** Bloqueios que se sobrepõem ao intervalo [from, to). */
  listBlockedBetween(from: Date, to: Date, db: Db = prisma) {
    return db.blockedTime.findMany({
      where: { startsAt: { lt: to }, endsAt: { gt: from } },
      select: { startsAt: true, endsAt: true },
    });
  },

  /** Bloqueios completos (painel) que terminam depois de `from`. */
  listBlocksFrom(from: Date, to?: Date, db: Db = prisma) {
    return db.blockedTime.findMany({
      where: { endsAt: { gt: from }, ...(to && { startsAt: { lt: to } }) },
      orderBy: { startsAt: 'asc' },
      include: { createdBy: { select: { name: true } } },
    });
  },
};

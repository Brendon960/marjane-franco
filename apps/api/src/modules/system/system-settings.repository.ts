import type { SystemSettingsDTO } from '@mf/shared';
import { prisma, type Db } from '../../lib/prisma';

const DEFAULTS: SystemSettingsDTO = { onlineBookingEnabled: true, sessionIdleMinutes: 480, sessionMaxDays: 7 };

// Lido a cada requisição autenticada: um cache curto evita uma consulta extra por chamada.
let cache: { value: SystemSettingsDTO; at: number } | undefined;
const CACHE_MS = 30_000;

export const systemSettingsRepository = {
  async get(db: Db = prisma): Promise<SystemSettingsDTO> {
    if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
    const row = await db.systemSettings.findUnique({ where: { id: 1 } });
    const value = row
      ? { onlineBookingEnabled: row.onlineBookingEnabled, sessionIdleMinutes: row.sessionIdleMinutes, sessionMaxDays: row.sessionMaxDays }
      : DEFAULTS;
    cache = { value, at: Date.now() };
    return value;
  },

  async update(data: SystemSettingsDTO, db: Db = prisma): Promise<SystemSettingsDTO> {
    await db.systemSettings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
    cache = undefined;
    return this.get(db);
  },
};

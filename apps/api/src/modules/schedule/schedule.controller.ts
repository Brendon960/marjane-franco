import type { BusinessInfoDTO } from '@mf/shared';
import type { FastifyInstance } from 'fastify';
import { systemSettingsRepository } from '../system/system-settings.repository';
import { scheduleRepository } from './schedule.repository';

export async function scheduleController(app: FastifyInstance) {
  /** Informações públicas: horário de funcionamento, formas de pagamento, endereço. */
  app.get('/business-info', async (_req, reply): Promise<BusinessInfoDTO> => {
    const [settings, hours, system] = await Promise.all([
      scheduleRepository.getSettings(),
      scheduleRepository.listActiveHours(),
      systemSettingsRepository.get(),
    ]);
    // Curto: mudanças feitas no painel aparecem no site em até 1 minuto
    reply.header('Cache-Control', 'public, max-age=60');
    return {
      hours: hours.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })),
      paymentMethods: settings.paymentMethods,
      address: settings.address,
      maxDaysAhead: settings.maxDaysAhead,
      pendingHoldHours: settings.pendingHoldHours,
      onlineBookingEnabled: system.onlineBookingEnabled,
    };
  });
}

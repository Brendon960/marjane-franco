import { systemSettingsSchema, type SystemInfoDTO, type SystemSettingsDTO } from '@mf/shared';
import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { validate } from '../../lib/validate';
import { actorFrom, auditService } from '../audit/audit.service';
import { requirePermission } from '../auth/auth.guard';
import { mailer } from '../notifications/mailer';
import { systemSettingsRepository } from './system-settings.repository';

const VERSION = process.env.npm_package_version ?? '1.0.0';

const SETTING_LABELS: Record<keyof SystemSettingsDTO, string> = {
  onlineBookingEnabled: 'agenda online',
  sessionIdleMinutes: 'tempo de inatividade da sessão',
  sessionMaxDays: 'duração máxima da sessão',
};

/**
 * Painel técnico (SUPER_ADMIN): estado do sistema e configurações técnicas.
 * Nunca expõe segredos — DATABASE_URL, chaves e senhas ficam só nas variáveis de ambiente.
 */
export async function systemController(app: FastifyInstance) {
  app.addHook('preHandler', requirePermission('system:manage'));

  app.get('/system', async (): Promise<SystemInfoDTO> => {
    const started = performance.now();
    const dbOk = await prisma.$queryRaw`SELECT 1`.then(
      () => true,
      () => false,
    );
    const latencyMs = dbOk ? Math.round(performance.now() - started) : null;
    const [users, activeUsers, clients, appointments, procedures, media, settings] = await Promise.all([
      prisma.user.count({ where: { role: { not: 'CLIENT' } } }),
      prisma.user.count({ where: { role: { not: 'CLIENT' }, active: true } }),
      prisma.client.count(),
      prisma.appointment.count(),
      prisma.procedure.count(),
      prisma.media.count(),
      systemSettingsRepository.get(),
    ]);
    return {
      version: VERSION,
      nodeVersion: process.version,
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      database: { ok: dbOk, latencyMs },
      counts: { users, activeUsers, clients, appointments, procedures, media },
      settings,
      email: mailer.status(),
    };
  });

  /** Testa a conexão SMTP agora (sem enviar e-mail). */
  app.post('/system/email-check', async (req) => {
    const result = await mailer.verify();
    await auditService.log(actorFrom(req), {
      action: 'system.email_check',
      entity: 'system_settings',
      description: result.ok ? 'Testou a conexão de e-mail (SMTP): OK' : `Testou a conexão de e-mail (SMTP): falhou — ${result.error}`,
    });
    return mailer.status();
  });

  app.get('/system-settings', () => systemSettingsRepository.get());

  app.put('/system-settings', async (req): Promise<SystemSettingsDTO> => {
    const data = validate(systemSettingsSchema, req.body);
    const before = await systemSettingsRepository.get();
    const changed = (Object.keys(data) as (keyof SystemSettingsDTO)[]).filter((k) => before[k] !== data[k]);
    const saved = await systemSettingsRepository.update(data);
    if (changed.length) {
      await auditService.log(actorFrom(req), {
        action: 'system.settings_update',
        entity: 'system_settings',
        description:
          changed.length === 1 && changed[0] === 'onlineBookingEnabled'
            ? data.onlineBookingEnabled
              ? 'Reativou a agenda online'
              : 'Pausou a agenda online'
            : `Alterou configurações do sistema (${changed.map((k) => SETTING_LABELS[k]).join(', ')})`,
        metadata: { before: Object.fromEntries(changed.map((k) => [k, before[k]])), after: Object.fromEntries(changed.map((k) => [k, data[k]])) },
      });
    }
    return saved;
  });
}

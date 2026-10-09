import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { ApiErrorBody } from '@mf/shared';
import Fastify from 'fastify';
import { env } from './config/env';
import { AppError } from './lib/errors';
import { prisma } from './lib/prisma';
import { redactUrl } from './lib/security';
import { ValidationError } from './lib/validate';
import { appointmentsAdminController } from './modules/appointments/appointments.admin.controller';
import { appointmentsController } from './modules/appointments/appointments.controller';
import { manageController } from './modules/appointments/manage.controller';
import { auditController } from './modules/audit/audit.controller';
import { authController } from './modules/auth/auth.controller';
import { requireSameOrigin } from './modules/auth/auth.guard';
import { availabilityController } from './modules/availability/availability.controller';
import { clientsAdminController } from './modules/clients/clients.admin.controller';
import { mediaController } from './modules/media/media.controller';
import { proceduresAdminController } from './modules/procedures/procedures.admin.controller';
import { proceduresController } from './modules/procedures/procedures.controller';
import { scheduleAdminController } from './modules/schedule/schedule.admin.controller';
import { scheduleController } from './modules/schedule/schedule.controller';
import { systemController } from './modules/system/system.controller';
import { usersController } from './modules/users/users.controller';

export async function buildApp() {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'test'
        ? false
        : {
            // Logs mínimos: método e caminho mascarado. Sem IP, porta, host, cabeçalhos ou cookies.
            serializers: {
              req: (req) => ({ method: req.method, url: redactUrl(req.url ?? '') }),
              res: (res) => ({ statusCode: res.statusCode }),
            },
          },
    // A1: confia só no número de proxies configurado (cada salto à direita do X-Forwarded-For)
    trustProxy:
      typeof env.TRUST_PROXY === 'number'
        ? (_address: string, hop: number) => hop < (env.TRUST_PROXY as number)
        : env.TRUST_PROXY,
    bodyLimit: 16 * 1024,
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: env.WEB_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });
  await app.register(cookie);
  app.decorateRequest('user', null);
  // hook preHandler (B3): o corpo já foi lido quando o 429 sai — o navegador recebe a resposta
  // "Muitas tentativas" em vez de uma conexão interrompida.
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute', hook: 'preHandler' });

  app.setErrorHandler<Error & { statusCode?: number }>((error, request, reply) => {
    let status = 500;
    let body: ApiErrorBody = {
      error: 'INTERNAL_ERROR',
      message: 'Ocorreu um erro inesperado. Tente novamente ou fale conosco pelo WhatsApp.',
    };

    if (error instanceof ValidationError) {
      status = 400;
      body = { error: error.code, message: error.message, fields: error.fields };
    } else if (error instanceof AppError) {
      status = error.statusCode;
      body = { error: error.code, message: error.message };
    } else if (error.statusCode === 413) {
      status = 413;
      body = { error: 'FILE_TOO_LARGE', message: 'Arquivo grande demais. O limite é de 5 MB.' };
    } else if (error.statusCode === 429) {
      status = 429;
      body = { error: 'RATE_LIMITED', message: 'Muitas tentativas em pouco tempo. Aguarde um pouco ou fale conosco pelo WhatsApp.' };
    } else if (error.statusCode && error.statusCode < 500) {
      status = error.statusCode;
      body = { error: 'BAD_REQUEST', message: 'Requisição inválida.' };
    } else {
      request.log.error(error);
    }

    return reply.status(status).send(body);
  });

  app.setNotFoundHandler((_req, reply) =>
    reply.status(404).send({ error: 'NOT_FOUND', message: 'Rota não encontrada.' } satisfies ApiErrorBody),
  );

  await app.register(
    async (api) => {
      api.get('/health', async () => {
        await prisma.$queryRaw`SELECT 1`;
        return { status: 'ok' };
      });
      // Site público (sem login)
      await api.register(proceduresController);
      await api.register(scheduleController);
      await api.register(availabilityController);
      await api.register(appointmentsController);
      await api.register(manageController);
      await api.register(mediaController);

      // Login e áreas restritas. Cada rota confere a permissão no servidor (requirePermission);
      // alterações só são aceitas vindas do próprio site (requireSameOrigin).
      await api.register(async (restricted) => {
        restricted.addHook('preHandler', requireSameOrigin);
        restricted.addHook('onSend', async (_req, reply) => {
          reply.header('Cache-Control', 'no-store');
        });

        await restricted.register(authController);

        await restricted.register(
          async (admin) => {
            await admin.register(appointmentsAdminController);
            await admin.register(clientsAdminController);
            await admin.register(proceduresAdminController);
            await admin.register(scheduleAdminController);
          },
          { prefix: '/admin' },
        );

        await restricted.register(
          async (superAdmin) => {
            await superAdmin.register(usersController);
            await superAdmin.register(auditController);
            await superAdmin.register(systemController);
          },
          { prefix: '/super-admin' },
        );
      });
    },
    { prefix: '/api' },
  );

  return app;
}

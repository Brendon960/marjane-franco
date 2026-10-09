import { changePasswordSchema, loginSchema } from '@mf/shared';
import type { FastifyInstance } from 'fastify';
import { unauthorized } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { validate } from '../../lib/validate';
import { actorFrom, auditService } from '../audit/audit.service';
import { SESSION_COOKIE, loadUser, requireAuth, sessionCookieOptions } from './auth.guard';
import { authService, toSessionUser } from './auth.service';
import { sessionsRepository } from './sessions.repository';

export async function authController(app: FastifyInstance) {
  app.post(
    '/auth/login',
    { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    async (req, reply) => {
      const { email, password } = validate(loginSchema, req.body);
      const { user, token, expiresAt } = await authService.login(email, password, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      reply.setCookie(SESSION_COOKIE, token, { ...sessionCookieOptions, expires: expiresAt });
      return user;
    },
  );

  app.post('/auth/logout', async (req, reply) => {
    const user = await loadUser(req);
    if (user) {
      await sessionsRepository.revoke(user.sessionId);
      await auditService.log(actorFrom(req), {
        action: 'auth.logout',
        entity: 'user',
        entityId: user.id,
        description: 'Saiu do painel',
      });
    }
    reply.clearCookie(SESSION_COOKIE, sessionCookieOptions);
    return reply.status(204).send();
  });

  app.get('/auth/me', async (req) => {
    const user = await loadUser(req);
    if (!user) throw unauthorized('Sessão expirada. Faça login novamente.');
    return toSessionUser(await prisma.user.findUniqueOrThrow({ where: { id: user.id } }));
  });

  app.post(
    '/auth/password',
    { preHandler: requireAuth, config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    async (req, reply) => {
      const { currentPassword, newPassword } = validate(changePasswordSchema, req.body);
      await authService.changePassword(req.user!.id, req.user!.sessionId, currentPassword, newPassword, req.ip);
      return reply.status(204).send();
    },
  );
}

import { randomToken, sha256 } from '../../lib/crypto';
import { prisma } from '../../lib/prisma';
import { systemSettingsRepository } from '../system/system-settings.repository';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const sessionsRepository = {
  /** Cria a sessão e devolve o token puro (vai só para o cookie; o banco guarda o hash). */
  async create(userId: string, meta: { ip?: string; userAgent?: string }) {
    const { sessionMaxDays } = await systemSettingsRepository.get();
    const token = randomToken();
    const expiresAt = new Date(Date.now() + sessionMaxDays * DAY);
    await prisma.session.create({
      data: {
        userId,
        tokenHash: sha256(token),
        expiresAt,
        ip: meta.ip?.slice(0, 45),
        userAgent: meta.userAgent?.slice(0, 200),
      },
    });
    return { token, expiresAt };
  },

  /**
   * Sessão válida para o token, com o usuário. Expirada (tempo total ou inatividade),
   * de usuário desativado ou sem acesso ao painel: é apagada e retorna null.
   */
  async resolve(token: string) {
    const session = await prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
    if (!session) return null;

    const now = Date.now();
    const { sessionIdleMinutes } = await systemSettingsRepository.get();
    const expired =
      session.expiresAt.getTime() <= now || session.lastSeenAt.getTime() + sessionIdleMinutes * MINUTE <= now;
    if (expired || !session.user.active || session.user.role === 'CLIENT') {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      return null;
    }

    // Atualiza "visto por último" no máximo uma vez por minuto
    if (now - session.lastSeenAt.getTime() > MINUTE) {
      await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } }).catch(() => undefined);
    }
    return session;
  },

  revoke(sessionId: string) {
    return prisma.session.deleteMany({ where: { id: sessionId } });
  },

  /** Encerra todas as sessões do usuário (opcionalmente mantendo a atual). */
  revokeAllForUser(userId: string, exceptSessionId?: string) {
    return prisma.session.deleteMany({ where: { userId, ...(exceptSessionId && { id: { not: exceptSessionId } }) } });
  },
};

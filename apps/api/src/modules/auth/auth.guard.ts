import { can, type Permission, type StaffRole } from '@mf/shared';
import type { FastifyRequest } from 'fastify';
import { env } from '../../config/env';
import { AppError, forbidden, unauthorized } from '../../lib/errors';
import { sessionsRepository } from './sessions.repository';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  sessionId: string;
  mustChangePassword: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null;
  }
}

const isProduction = env.NODE_ENV === 'production';

/** Em produção o prefixo __Host- obriga o navegador a só aceitar o cookie via HTTPS, no domínio exato. */
export const SESSION_COOKIE = isProduction ? '__Host-mf_session' : 'mf_session';

export const sessionCookieOptions = {
  httpOnly: true, // inacessível a JavaScript (protege contra roubo por XSS)
  secure: isProduction,
  sameSite: 'strict' as const, // não é enviado em requisições vindas de outros sites
  path: '/',
};

/** Carrega o usuário da sessão (cookie) em req.user. Não bloqueia: só identifica. */
export async function loadUser(req: FastifyRequest) {
  if (req.user) return req.user;
  const token = req.cookies[SESSION_COOKIE];
  if (!token || token.length > 100) return null;
  const session = await sessionsRepository.resolve(token);
  if (!session) return null;
  req.user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role as StaffRole,
    sessionId: session.id,
    mustChangePassword: session.user.mustChangePassword,
  };
  return req.user;
}

/** Exige login. */
export async function requireAuth(req: FastifyRequest) {
  if (!(await loadUser(req))) throw unauthorized();
}

/**
 * Exige login E a permissão — a verificação real fica aqui, nunca só na interface.
 * Conta com senha provisória (M4) não usa nenhuma função do painel até trocar a senha:
 * só /auth/me, /auth/password e /auth/logout (que não passam por aqui) continuam liberados.
 */
export function requirePermission(permission: Permission) {
  return async (req: FastifyRequest) => {
    const user = await loadUser(req);
    if (!user) throw unauthorized();
    if (user.mustChangePassword) {
      throw new AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'Troque a senha provisória para continuar.');
    }
    if (!can(user.role, permission)) throw forbidden();
  };
}

const allowedOrigins = new Set(env.WEB_ORIGIN);

/**
 * Proteção contra requisições forjadas (CSRF): além do cookie SameSite=Strict,
 * toda alteração feita com sessão precisa vir do próprio site (cabeçalho Origin).
 */
export async function requireSameOrigin(req: FastifyRequest) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return;
  const origin = req.headers.origin;
  if (!origin || !allowedOrigins.has(origin)) throw forbidden('Origem da requisição não permitida.');
}

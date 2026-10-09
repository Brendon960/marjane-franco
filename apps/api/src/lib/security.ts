/**
 * Regras de segurança puras (sem banco/ambiente), testadas em security.test.ts.
 */

/**
 * Caminho seguro para log (A3): sem query string (buscas por nome/telefone, filtros) e
 * sem o token do link privado da cliente (/manage/<token>).
 */
export function redactUrl(url: string): string {
  const [path = '', query] = url.split('?');
  const safe = path.replace(/(\/manage\/)[^/]+/, '$1[oculto]');
  return query === undefined ? safe : `${safe}?[oculto]`;
}

/** M5: o link privado deixa de funcionar 30 dias depois do horário do agendamento. */
export const MANAGE_LINK_VALID_DAYS = 30;

export function isManageLinkExpired(startsAt: Date, now = new Date()): boolean {
  return now.getTime() > startsAt.getTime() + MANAGE_LINK_VALID_DAYS * 24 * 3_600_000;
}

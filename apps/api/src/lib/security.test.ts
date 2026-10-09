import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MANAGE_LINK_VALID_DAYS, isManageLinkExpired, redactUrl } from './security';

test('logs: token do link privado é mascarado', () => {
  assert.equal(redactUrl('/api/manage/5j4XqY0abcDEF123456789xyz'), '/api/manage/[oculto]');
  assert.equal(redactUrl('/api/manage/5j4XqY0abcDEF123456789xyz/cancel'), '/api/manage/[oculto]/cancel');
});

test('logs: query string (buscas com nome/telefone) nunca é registrada', () => {
  assert.equal(redactUrl('/api/admin/clients?search=31999998888'), '/api/admin/clients?[oculto]');
  assert.equal(redactUrl('/api/admin/agenda?date=2026-10-20'), '/api/admin/agenda?[oculto]');
  assert.equal(redactUrl('/api/procedures'), '/api/procedures');
});

test('link privado: válido até 30 dias depois do horário, expirado depois', () => {
  const startsAt = new Date('2026-10-01T12:00:00Z');
  const day = 24 * 3_600_000;
  assert.equal(isManageLinkExpired(startsAt, new Date(startsAt.getTime() - day)), false); // antes
  assert.equal(isManageLinkExpired(startsAt, new Date(startsAt.getTime() + 10 * day)), false);
  assert.equal(isManageLinkExpired(startsAt, new Date(startsAt.getTime() + MANAGE_LINK_VALID_DAYS * day)), false);
  assert.equal(isManageLinkExpired(startsAt, new Date(startsAt.getTime() + (MANAGE_LINK_VALID_DAYS + 1) * day)), true);
});

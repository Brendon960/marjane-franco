import assert from 'node:assert/strict';
import { test } from 'node:test';

// Configuração fictícia ANTES de carregar os módulos (o .env real não sobrescreve o que já existe).
// Banco e SMTP são falsos em memória: nenhum e-mail real sai e nenhum banco é acessado.
const FAKE_PASS = 'senha-de-teste-NAO-REAL';
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://teste:teste@localhost:5432/teste',
  WEB_ORIGIN: 'http://localhost:5173',
  SMTP_HOST: 'smtp.teste.invalid',
  SMTP_USER: 'clinica@teste.invalid',
  SMTP_PASS: FAKE_PASS,
  EMAIL_FROM: '',
});
const { prisma } = await import('../../lib/prisma');
const { mailer, setTransportForTests } = await import('./mailer');
const { appointmentEmailService, describeDelivery, reserveEmailData } = await import('./appointment-email.service');

type Row = Record<string, unknown>;

/** Tabela de agendamentos em memória, com a mesma semântica de where/data usada pelo serviço. */
function fakeAppointments(rows: Row[]) {
  const matches = (row: Row, where: Row): boolean =>
    Object.entries(where).every(([key, cond]) => {
      if (key === 'OR') return (cond as Row[]).some((c) => matches(row, c));
      if (cond === null) return row[key] == null;
      if (typeof cond !== 'object') return row[key] === cond;
      const c = cond as { in?: unknown[]; lt?: Date };
      if (c.in) return c.in.includes(row[key]);
      if (c.lt) return (row[key] as Date) < c.lt;
      throw new Error(`condição não suportada no falso: ${key}`);
    });
  const apply = (row: Row, data: Row) => {
    for (const [key, value] of Object.entries(data)) {
      const inc = (value as { increment?: number } | null)?.increment;
      row[key] = inc !== undefined ? ((row[key] as number) ?? 0) + inc : value;
    }
    row.updatedAt = new Date();
  };
  const updates: Row[] = [];
  const table = {
    async updateMany({ where, data }: { where: Row; data: Row }) {
      const hit = rows.filter((r) => matches(r, where));
      hit.forEach((r) => apply(r, data));
      return { count: hit.length };
    },
    async findUniqueOrThrow({ where }: { where: { id: string } }) {
      const row = rows.find((r) => r.id === where.id);
      if (!row) throw new Error('not found');
      return { ...row, client: row.client, procedure: row.procedure };
    },
    async update({ where, data }: { where: { id: string }; data: Row }) {
      updates.push(data);
      const row = rows.find((r) => r.id === where.id)!;
      apply(row, data);
      return row;
    },
    // Qualquer tentativa de criar agendamento derruba o teste.
    async create() {
      throw new Error('o envio de e-mail NUNCA pode criar agendamento');
    },
  };
  Object.defineProperty(prisma, 'appointment', { value: table, configurable: true });
  return { rows, updates };
}

/** Agendamento recém-confirmado: a confirmação já gravou status + reserva do e-mail (PENDING). */
function confirmedAppointment(): Row {
  const row: Row = {
    id: 'apt-1',
    status: 'CONFIRMED',
    startsAt: new Date('2026-12-15T17:00:00Z'),
    contactEmail: 'cliente@teste.invalid',
    contactName: 'Ana Souza',
    cancelReason: null,
    client: { name: 'Ana Souza', email: 'cliente@teste.invalid' },
    procedure: { name: 'Botox' },
    confirmationEmailStatus: null,
    confirmationEmailAttempts: 0,
    updatedAt: new Date(),
  };
  for (const [key, value] of Object.entries(reserveEmailData('confirmation'))) {
    const inc = (value as { increment?: number } | null)?.increment;
    row[key] = inc !== undefined ? (row[key] as number) + inc : value;
  }
  return row;
}

function smtp(behavior: 'ok' | 'auth' | 'timeout') {
  const sent: unknown[] = [];
  setTransportForTests({
    verify: (async () => true) as never,
    sendMail: (async (m: unknown) => {
      sent.push(m);
      if (behavior === 'auth') throw Object.assign(new Error(`535 bad credentials ${FAKE_PASS}`), { code: 'EAUTH' });
      if (behavior === 'timeout') throw Object.assign(new Error('Connection timeout'), { code: 'ETIMEDOUT' });
      return { messageId: '<ok@teste>', rejected: [] };
    }) as never,
  });
  return sent;
}

test('falha de autenticação SMTP: agendamento continua CONFIRMADO e a falha fica registrada', async () => {
  const { rows, updates } = fakeAppointments([confirmedAppointment()]);
  smtp('auth');
  const result = await appointmentEmailService.deliver('confirmation', 'apt-1');

  assert.equal(result.status, 'FAILED');
  assert.match(result.error ?? '', /Usuário ou senha do e-mail da clínica/);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'CONFIRMED');
  assert.equal(rows[0].confirmationEmailStatus, 'FAILED');
  assert.equal(rows[0].confirmationEmailTo, 'cliente@teste.invalid');
  assert.match(rows[0].confirmationEmailError as string, /Usuário ou senha/);
  // O registro do resultado só mexe nos campos do e-mail, nunca no status do agendamento
  assert.ok(updates.every((data) => !('status' in data)));
  assert.equal(describeDelivery(result), `falha no envio (${result.error})`);
});

test('falha de conexão/timeout também não desfaz a confirmação', async () => {
  const { rows } = fakeAppointments([confirmedAppointment()]);
  smtp('timeout');
  const result = await appointmentEmailService.deliver('confirmation', 'apt-1');
  assert.equal(result.status, 'FAILED');
  assert.match(result.error ?? '', /Não foi possível conectar/);
  assert.equal(rows[0].status, 'CONFIRMED');
});

test('SMTP não configurado: registra a falha sem tentar enviar', async (t) => {
  const { rows } = fakeAppointments([confirmedAppointment()]);
  const sent = smtp('ok');
  t.mock.method(mailer, 'isConfigured', () => false);
  const result = await appointmentEmailService.deliver('confirmation', 'apt-1');
  assert.equal(result.status, 'FAILED');
  assert.match(result.error ?? '', /não configurado/);
  assert.equal(sent.length, 0);
  assert.equal(rows[0].status, 'CONFIRMED');
});

test('reenvio após falha: envia uma vez, registra SENT e não cria outro agendamento', async () => {
  const { rows } = fakeAppointments([confirmedAppointment()]);
  smtp('auth');
  await appointmentEmailService.deliver('confirmation', 'apt-1');
  assert.equal(rows[0].confirmationEmailStatus, 'FAILED');

  const sent = smtp('ok');
  assert.equal(await appointmentEmailService.claim('confirmation', 'apt-1'), true);
  assert.equal(rows[0].confirmationEmailStatus, 'PENDING');
  assert.equal(rows[0].confirmationEmailAttempts, 2);

  const result = await appointmentEmailService.deliver('confirmation', 'apt-1');
  assert.equal(result.status, 'SENT');
  assert.equal(sent.length, 1);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'CONFIRMED');
  assert.equal(rows[0].confirmationEmailStatus, 'SENT');
  assert.equal(rows[0].confirmationEmailError, null);
  assert.ok(rows[0].confirmationEmailSentAt instanceof Date);
});

test('cliques repetidos no reenvio: só a primeira reserva vale; e-mail já enviado não sai de novo', async () => {
  const row = confirmedAppointment();
  row.confirmationEmailStatus = 'FAILED';
  const { rows } = fakeAppointments([row]);
  const sent = smtp('ok');

  const now = new Date();
  assert.equal(await appointmentEmailService.claim('confirmation', 'apt-1', now), true);
  assert.equal(await appointmentEmailService.claim('confirmation', 'apt-1', now), false); // 2º clique
  await appointmentEmailService.deliver('confirmation', 'apt-1');
  assert.equal(await appointmentEmailService.claim('confirmation', 'apt-1', now), false); // já SENT
  assert.equal(sent.length, 1);
  assert.equal(rows[0].confirmationEmailAttempts, 2);
});

test('envio travado em PENDING (servidor caiu no meio) pode ser tentado de novo depois de 2 min', async () => {
  const row = confirmedAppointment();
  row.updatedAt = new Date(Date.now() - 3 * 60_000);
  fakeAppointments([row]);
  assert.equal(await appointmentEmailService.claim('confirmation', 'apt-1'), true);
});

test('reenvio de confirmação não vale para agendamento que não está confirmado', async () => {
  const row = confirmedAppointment();
  row.status = 'CANCELLED';
  row.confirmationEmailStatus = 'FAILED';
  fakeAppointments([row]);
  assert.equal(await appointmentEmailService.claim('confirmation', 'apt-1'), false);
});

test('a senha SMTP nunca é gravada no registro do envio', async () => {
  const { rows } = fakeAppointments([confirmedAppointment()]);
  smtp('auth');
  const result = await appointmentEmailService.deliver('confirmation', 'apt-1');
  assert.doesNotMatch(JSON.stringify(result), new RegExp(FAKE_PASS));
  assert.doesNotMatch(JSON.stringify(rows[0]), new RegExp(FAKE_PASS));
});

test('rota "Enviar novamente": exige login, permissão e origem do próprio site', async (t) => {
  const { buildApp } = await import('../../app');
  const { sessionsRepository } = await import('../auth/sessions.repository');
  const app = await buildApp();
  t.after(() => app.close());
  const sent = smtp('ok');
  const url = '/api/admin/appointments/00000000-0000-4000-8000-000000000000/confirmation-email';
  const origin = 'http://localhost:5173';

  // sem login
  assert.equal((await app.inject({ method: 'POST', url, headers: { origin } })).statusCode, 401);
  // de outro site (CSRF)
  assert.equal((await app.inject({ method: 'POST', url, headers: { origin: 'https://malicioso.example' } })).statusCode, 403);

  const session = (role: string, mustChangePassword = false) =>
    t.mock.method(sessionsRepository, 'resolve', async () => ({
      id: 's1',
      user: { id: 'u1', name: 'Teste', email: 'teste@teste.invalid', role, mustChangePassword },
    }));
  const asUser = () => app.inject({ method: 'POST', url, headers: { origin }, cookies: { mf_session: 'token-falso' } });

  // papel sem permissão de agenda
  session('CLIENT');
  assert.equal((await asUser()).statusCode, 403);
  t.mock.restoreAll();
  // senha provisória ainda não trocada
  session('ADMIN', true);
  assert.equal((await asUser()).statusCode, 403);

  assert.equal(sent.length, 0);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';

// Configuração fictícia ANTES de carregar o módulo: o .env real (com a senha de verdade)
// não sobrescreve variáveis já definidas, e o transporte é sempre um falso — nenhum e-mail sai.
const FAKE_PASS = 'senha-de-teste-NAO-REAL';
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://teste:teste@localhost:5432/teste',
  SMTP_HOST: 'smtp.teste.invalid',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: 'clinica@teste.invalid',
  SMTP_PASS: FAKE_PASS,
  EMAIL_FROM: '',
  EMAIL_REPLY_TO: '',
});
const { MailSendError, describeMailError, mailer, setTransportForTests } = await import('./mailer');

const smtpError = (code: string, message = 'erro do servidor') => Object.assign(new Error(message), { code });
const message = { to: 'cliente@teste.invalid', subject: 'Teste', text: 'oi', html: '<p>oi</p>' };

function fakeTransport(behavior: { verify?: () => Promise<true>; sendMail?: (m: unknown) => Promise<unknown> }) {
  const sent: unknown[] = [];
  setTransportForTests({
    verify: (behavior.verify ?? (async () => true)) as never,
    sendMail: (async (m: unknown) => {
      sent.push(m);
      return behavior.sendMail ? behavior.sendMail(m) : { messageId: '<id-1@teste>', rejected: [] };
    }) as never,
  });
  return sent;
}

test('configuração SMTP válida: considera configurado e o teste de conexão passa', async () => {
  fakeTransport({});
  assert.equal(mailer.isConfigured(), true);
  assert.deepEqual(mailer.missingConfig(), []);
  const result = await mailer.verify();
  assert.deepEqual(result.ok, true);
  assert.equal(mailer.status().host, 'smtp.teste.invalid:587');
});

test('configuração obrigatória ausente: aponta só os NOMES que faltam e não tenta conectar', async () => {
  const { env } = await import('../../config/env');
  const saved = { SMTP_USER: env.SMTP_USER, SMTP_PASS: env.SMTP_PASS };
  Object.assign(env, { SMTP_USER: undefined, SMTP_PASS: undefined });
  try {
    let connected = false;
    fakeTransport({ verify: async () => { connected = true; return true; } });
    assert.equal(mailer.isConfigured(), false);
    assert.deepEqual(mailer.missingConfig(), ['SMTP_USER', 'SMTP_PASS']);
    const result = await mailer.verify();
    assert.equal(result.ok, false);
    assert.equal(result.error, 'Faltando: SMTP_USER, SMTP_PASS');
    assert.equal(connected, false);
  } finally {
    Object.assign(env, saved);
  }
});

test('envio bem-sucedido: usa remetente da clínica e devolve o id da mensagem', async () => {
  const sent = fakeTransport({});
  assert.equal(await mailer.send(message), '<id-1@teste>');
  assert.equal(sent.length, 1);
  assert.deepEqual((sent[0] as { from: unknown }).from, { name: 'Dra. Marjane Franco', address: 'clinica@teste.invalid' });
  assert.equal((sent[0] as { to: string }).to, 'cliente@teste.invalid');
});

test('falha de autenticação vira mensagem clara, sem detalhes do servidor', async () => {
  fakeTransport({ sendMail: async () => { throw smtpError('EAUTH', 'Invalid login: 535-5.7.8 Username and Password not accepted'); } });
  await assert.rejects(mailer.send(message), (error: Error) => {
    assert.ok(error instanceof MailSendError);
    assert.match(error.message, /Usuário ou senha do e-mail da clínica \(SMTP\) inválidos/);
    return true;
  });
  fakeTransport({ verify: async () => { throw smtpError('EAUTH'); } });
  const check = await mailer.verify();
  assert.equal(check.ok, false);
  assert.match(check.error ?? '', /Usuário ou senha/);
});

test('falha de conexão ou timeout vira "não foi possível conectar"', async () => {
  for (const code of ['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'EDNS']) {
    assert.equal(describeMailError(smtpError(code)), 'Não foi possível conectar ao servidor de e-mail. Tente novamente.');
  }
  fakeTransport({ sendMail: async () => { throw smtpError('ETIMEDOUT', 'Connection timeout'); } });
  await assert.rejects(mailer.send(message), /Não foi possível conectar/);
});

test('destinatário recusado pelo servidor vira erro de endereço', async () => {
  fakeTransport({ sendMail: async () => ({ messageId: '<x>', rejected: ['cliente@teste.invalid'] }) });
  await assert.rejects(mailer.send(message), /recusou o endereço da cliente/);
});

test('a senha nunca aparece em mensagens de erro (nem em erro desconhecido)', async () => {
  const leaked = describeMailError(smtpError('EOUTRO', `falha com credencial ${FAKE_PASS} no meio`));
  assert.doesNotMatch(leaked, new RegExp(FAKE_PASS));
  assert.match(leaked, /\[oculto\]/);

  fakeTransport({ sendMail: async () => { throw smtpError('EAUTH', `535 auth ${FAKE_PASS}`); } });
  await assert.rejects(mailer.send(message), (error: Error) => !error.message.includes(FAKE_PASS));
  assert.doesNotMatch(JSON.stringify(mailer.status()), new RegExp(FAKE_PASS));
});

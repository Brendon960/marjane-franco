import { buildApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { mailer } from './modules/notifications/mailer';

const app = await buildApp();

const shutdown = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: env.PORT, host: env.HOST });

// Testa a conexão SMTP na inicialização (conecta e autentica, sem enviar e-mail).
// O log nunca inclui a senha — só host, remetente e o motivo da falha.
if (mailer.isConfigured()) {
  const { ok, error } = await mailer.verify();
  if (ok) app.log.info(`E-mail: conexão SMTP OK (${env.SMTP_HOST}:${env.SMTP_PORT}, remetente ${mailer.sender()})`);
  else app.log.warn(`E-mail: falha na conexão SMTP (${env.SMTP_HOST}:${env.SMTP_PORT}) — ${error}`);
} else {
  await mailer.verify();
  app.log.warn(`E-mail de confirmação DESATIVADO — preencha em apps/api/.env: ${mailer.missingConfig().join(', ')}`);
}

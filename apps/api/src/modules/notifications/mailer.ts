import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env';

/**
 * Envio de e-mail por SMTP. As credenciais ficam só em variáveis de ambiente do servidor
 * (nunca no site) e nunca são registradas em log.
 */

export class MailSendError extends Error {}

let transport: Transporter | undefined;

/** Último teste de conexão (exibido ao Super Admin, sem segredos). */
let lastCheck: { ok: boolean; error: string | null; at: Date } | null = null;

function getTransport(): Transporter {
  transport ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transport;
}

/** Erros comuns do SMTP traduzidos para a profissional entender o que aconteceu. */
function describe(error: unknown): string {
  const code = (error as { code?: string }).code;
  switch (code) {
    case 'EAUTH':
      return 'Usuário ou senha do e-mail da clínica (SMTP) inválidos (responsável técnico).';
    case 'ECONNECTION':
    case 'ETIMEDOUT':
    case 'ESOCKET':
    case 'EDNS':
      return 'Não foi possível conectar ao servidor de e-mail. Tente novamente.';
    case 'EENVELOPE':
      return 'O servidor de e-mail recusou o endereço da cliente. Confira o e-mail cadastrado.';
    default:
      return `Erro ao enviar o e-mail: ${(error as Error).message?.slice(0, 200) ?? 'desconhecido'}`;
  }
}

export const mailer = {
  isConfigured(): boolean {
    return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
  },

  /** Variáveis que faltam para ativar o envio (só os NOMES, nunca os valores). */
  missingConfig(): string[] {
    return (['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'] as const).filter((k) => !env[k]);
  },

  /** Endereço que aparece como remetente. */
  sender(): string | null {
    return env.EMAIL_FROM ?? env.SMTP_USER ?? null;
  },

  /** Conecta e autentica no servidor SMTP SEM enviar e-mail. */
  async verify(): Promise<{ ok: boolean; error: string | null }> {
    if (!this.isConfigured()) {
      lastCheck = { ok: false, error: `Faltando: ${this.missingConfig().join(', ')}`, at: new Date() };
      return lastCheck;
    }
    try {
      await getTransport().verify();
      lastCheck = { ok: true, error: null, at: new Date() };
    } catch (error) {
      lastCheck = { ok: false, error: describe(error), at: new Date() };
    }
    return lastCheck;
  },

  status() {
    return {
      configured: this.isConfigured(),
      ok: lastCheck?.ok ?? null,
      host: env.SMTP_HOST ? `${env.SMTP_HOST}:${env.SMTP_PORT}` : null,
      sender: this.sender(),
      error: lastCheck?.error ?? null,
      checkedAt: lastCheck?.at.toISOString() ?? null,
    };
  },

  /** Envia e retorna o id da mensagem. "Enviado" = aceito pelo servidor SMTP. */
  async send(message: { to: string; subject: string; text: string; html: string }): Promise<string> {
    try {
      const info = await getTransport().sendMail({
        from: env.EMAIL_FROM ?? { name: 'Dra. Marjane Franco', address: env.SMTP_USER! },
        replyTo: env.EMAIL_REPLY_TO ?? env.ADMIN_EMAIL,
        ...message,
      });
      if (info.rejected?.length) throw Object.assign(new Error('rejected'), { code: 'EENVELOPE' });
      return info.messageId;
    } catch (error) {
      throw new MailSendError(describe(error));
    }
  },
};

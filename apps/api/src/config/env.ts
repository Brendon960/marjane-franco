import { z } from 'zod';

// Carrega apps/api/.env quando existir (Node 22+). Em produção as variáveis vêm do ambiente.
try {
  process.loadEnvFile();
} catch {
  // sem .env: segue com process.env
}

/** Variável opcional: string vazia conta como não definida. */
const optional = () =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined);

/**
 * TRUST_PROXY (A1): quais proxies são confiáveis para ler o IP real do X-Forwarded-For.
 *   vazio/false → nenhum (o cabeçalho é ignorado; IP = conexão direta)
 *   true ou 1   → 1 proxy na frente (Render, Railway, Vercel/Nginx…) — usa só o último salto
 *   N           → N proxies (ex.: CDN + balanceador = 2)
 *   lista de IPs/CIDR (ex.: "10.0.0.0/8,127.0.0.1") → só esses endereços
 * Nunca "confiar em tudo": isso deixaria qualquer cliente forjar o próprio IP.
 */
const trustProxySchema = z
  .string()
  .trim()
  .default('false')
  .transform((v, ctx): number | string[] | false => {
    const value = v.toLowerCase();
    if (value === '' || value === 'false' || value === '0') return false;
    if (value === 'true') return 1;
    if (/^\d+$/.test(value)) return Number(value);
    const list = v.split(',').map((x) => x.trim()).filter(Boolean);
    if (list.every((x) => /^[0-9a-f.:]+(\/\d{1,3})?$/i.test(x))) return list;
    ctx.addIssue({ code: 'custom', message: 'TRUST_PROXY inválido: use false, número de proxies ou lista de IPs/CIDR' });
    return z.NEVER;
  });

/** WEB_ORIGIN: origens exatas do site (nunca "*", que liberaria o painel para qualquer site). */
const originsSchema = z
  .string()
  .default('http://localhost:5173')
  .transform((v, ctx) => {
    const list = v.split(',').map((o) => o.trim()).filter(Boolean);
    for (const origin of list) {
      let ok = false;
      try {
        ok = new URL(origin).origin === origin;
      } catch {
        ok = false;
      }
      if (!ok) ctx.addIssue({ code: 'custom', message: `WEB_ORIGIN inválido: "${origin}" (use a origem exata, ex.: https://www.seusite.com.br)` });
    }
    return list;
  });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL não configurada (veja apps/api/.env.example)'),
  PORT: z.coerce.number().int().positive().default(3333),
  /** Padrão: só nesta máquina em desenvolvimento (B1); todas as interfaces em produção. */
  HOST: z.string().optional(),
  WEB_ORIGIN: originsSchema,
  TRUST_PROXY: trustProxySchema,

  // E-mail de confirmação ao cliente (SMTP: Gmail, Outlook, Zoho, provedor do domínio…).
  // Vazio = envio desligado: a confirmação do agendamento continua funcionando normalmente.
  SMTP_HOST: optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  /** true para a porta 465 (SSL direto); false para 587 (STARTTLS) */
  SMTP_SECURE: z.stringbool().default(false),
  SMTP_USER: optional(),
  SMTP_PASS: optional(),
  /** Remetente, ex.: "Dra. Marjane Franco <contato@seudominio.com.br>" (padrão: SMTP_USER) */
  EMAIL_FROM: optional(),
  /** Respostas da cliente vão para este endereço (opcional; padrão: ADMIN_EMAIL) */
  EMAIL_REPLY_TO: optional(),
  /** E-mail do administrador do sistema */
  ADMIN_EMAIL: optional(),
  /** WhatsApp da clínica exibido no e-mail como contato */
  CLINIC_WHATSAPP_NUMBER: optional(),
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  HOST: parsed.HOST ?? (parsed.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'),
};

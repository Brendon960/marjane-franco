import { z } from 'zod';
import { normalizePhone } from './phone';
import { ISO_MONTH_RE, TIME_RE, isValidDate } from './time';

/** Remove caracteres de controle e espaços repetidos. */
export const singleLine = (value: string) =>
  value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();

/** Como singleLine, mas preserva quebras de linha (observações). */
export const multiLine = (value: string) =>
  value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const slugSchema = z.string().regex(/^[a-z0-9-]{1,80}$/, 'Procedimento inválido');
export const dateSchema = z.string().refine(isValidDate, 'Data inválida');
export const monthSchema = z.string().regex(ISO_MONTH_RE, 'Mês inválido');
export const timeSchema = z.string().regex(TIME_RE, 'Horário inválido');

/** Dados preenchidos pela cliente na etapa 4 — validados igual no site e na API. */
export const clientDetailsSchema = z.object({
  name: z
    .string()
    .transform(singleLine)
    .pipe(
      z
        .string()
        .min(5, 'Informe seu nome completo')
        .max(100, 'Nome muito longo')
        .regex(/^[\p{L}' .-]+$/u, 'Use apenas letras no nome')
        .refine((v) => v.includes(' '), 'Informe nome e sobrenome'),
    ),
  phone: z.string().transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({ code: 'custom', message: 'Informe um WhatsApp válido com DDD' });
      return z.NEVER;
    }
    return phone;
  }),
  /** Obrigatório: a confirmação do agendamento é enviada por e-mail. */
  email: z
    .string({ error: 'Informe seu e-mail para receber a confirmação' })
    .trim()
    .toLowerCase()
    .min(1, 'Informe seu e-mail para receber a confirmação')
    .max(120, 'E-mail muito longo')
    .pipe(z.email('E-mail inválido')),
  notes: z
    .string()
    .max(500, 'Máximo de 500 caracteres')
    .optional()
    .transform((v) => (v ? multiLine(v) || undefined : undefined)),
  consent: z.literal(true, { error: 'É preciso aceitar a política de privacidade' }),
});

export const bookingRequestSchema = clientDetailsSchema.extend({
  procedureSlug: slugSchema,
  date: dateSchema,
  time: timeSchema,
  /** Honeypot anti-robô: campo invisível que precisa chegar vazio. */
  website: z.string().max(0).optional(),
});

export type ClientDetailsInput = z.input<typeof clientDetailsSchema>;
export type BookingRequestInput = z.input<typeof bookingRequestSchema>;
export type BookingRequest = z.output<typeof bookingRequestSchema>;

export const slotsQuerySchema = z.object({ procedure: slugSchema, date: dateSchema });
export const daysQuerySchema = z.object({ procedure: slugSchema, month: monthSchema });

/** Converte erros do Zod em { campo: mensagem } para exibir no formulário. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    fields[key] ??= issue.message;
  }
  return fields;
}

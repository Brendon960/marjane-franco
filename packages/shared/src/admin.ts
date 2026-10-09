/**
 * Painel administrativo: validações (mesmo schema no painel e na API) e formatos
 * trocados entre os dois. Só o painel importa este arquivo no site, então ele não
 * pesa no carregamento da landing page.
 */
import { z } from 'zod';
import { STAFF_ROLES, type Permission, type StaffRole } from './permissions';
import { normalizePhone } from './phone';
import { dateSchema, multiLine, singleLine, timeSchema } from './schemas';
import { timeToMinutes } from './time';
import type { ProcedureCategory, ProcedureDTO } from './types';

// ---------------------------------------------------------------------------
// Campos reutilizados
// ---------------------------------------------------------------------------

export const idSchema = z.uuid('Identificador inválido');

const pageSchema = z.coerce.number().int().min(1).max(10_000).default(1);

const searchSchema = z
  .string()
  .max(100)
  .optional()
  .transform((v) => (v ? singleLine(v) || undefined : undefined));

const text = (min: number, max: number, label: string) =>
  z
    .string()
    .transform(singleLine)
    .pipe(
      z
        .string()
        .min(min, min <= 1 ? `Informe ${label}` : `${label[0]!.toUpperCase()}${label.slice(1)} muito curto(a)`)
        .max(max, `Máximo de ${max} caracteres`),
    );

const optionalText = (max: number) =>
  z
    .string()
    .max(max, `Máximo de ${max} caracteres`)
    .optional()
    .nullable()
    .transform((v) => (v ? singleLine(v) || null : null));

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(120, 'E-mail muito longo')
  .pipe(z.email('E-mail inválido'));

const optionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(120, 'E-mail muito longo')
  .pipe(z.union([z.literal(''), z.email('E-mail inválido')]))
  .optional()
  .nullable()
  .transform((v) => v || null);

const phoneSchema = z.string().transform((value, ctx) => {
  const phone = normalizePhone(value);
  if (!phone) {
    ctx.addIssue({ code: 'custom', message: 'Informe um WhatsApp válido com DDD' });
    return z.NEVER;
  }
  return phone;
});

const int = (min: number, max: number, label: string) =>
  z.coerce
    .number({ error: `Informe ${label}` })
    .int(`Use um número inteiro em ${label}`)
    .min(min, `${label[0]!.toUpperCase()}${label.slice(1)}: mínimo ${min}`)
    .max(max, `${label[0]!.toUpperCase()}${label.slice(1)}: máximo ${max}`);

// ---------------------------------------------------------------------------
// Login e usuários
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Informe o e-mail').max(120, 'E-mail inválido'),
  password: z.string().min(1, 'Informe a senha').max(128, 'Senha inválida'),
});

export const newPasswordSchema = z
  .string()
  .min(10, 'A senha precisa ter pelo menos 10 caracteres')
  .max(128, 'Máximo de 128 caracteres')
  .refine((v) => /[A-Za-zÀ-ÿ]/.test(v) && /\d/.test(v), 'Use letras e números');

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual').max(128),
  newPassword: newPasswordSchema,
});

const staffRoleSchema = z.enum(STAFF_ROLES, { error: 'Perfil inválido' });

export const userCreateSchema = z.object({
  name: text(2, 100, 'o nome'),
  email: emailSchema,
  role: staffRoleSchema,
  password: newPasswordSchema,
});

export const userUpdateSchema = z.object({
  name: text(2, 100, 'o nome').optional(),
  email: emailSchema.optional(),
  role: staffRoleSchema.optional(),
  active: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Agendamentos e agenda
// ---------------------------------------------------------------------------

export const APPOINTMENT_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'COMPLETED', 'NO_SHOW'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'Aguardando confirmação',
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Pré-reserva expirada',
  COMPLETED: 'Realizado',
  NO_SHOW: 'Não compareceu',
};

/** Envio de e-mail ao cliente. SENT = aceito pelo servidor de e-mail; SKIPPED = cliente sem e-mail. */
export const NOTIFICATION_STATUSES = ['PENDING', 'SENT', 'FAILED', 'SKIPPED'] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const agendaQuerySchema = z.object({ date: dateSchema });

export const appointmentsQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  search: searchSchema,
  page: pageSchema,
});

/** Horários sugeridos e conferência de um horário específico (painel). */
export const adminSlotsQuerySchema = z.object({
  procedureId: idSchema,
  date: dateSchema,
  /** Ao remarcar: ignora o próprio agendamento na checagem de conflito. */
  excludeId: idSchema.optional(),
});

export const slotCheckQuerySchema = adminSlotsQuerySchema.extend({ time: timeSchema });

export const rescheduleSchema = z.object({ date: dateSchema, time: timeSchema });

export const cancelAppointmentSchema = z.object({ reason: optionalText(200) });

/** Cancelamento em massa (seleção na agenda ou "todos do dia"). */
export const BULK_CANCEL_MAX = 200;
export const bulkCancelSchema = z.object({
  ids: z
    .array(idSchema)
    .min(1, 'Selecione ao menos um agendamento')
    .max(BULK_CANCEL_MAX, `No máximo ${BULK_CANCEL_MAX} agendamentos por vez`)
    .refine((ids) => new Set(ids).size === ids.length, 'Agendamentos repetidos na seleção'),
  reason: optionalText(200),
});

/** Mudanças de status feitas pela profissional (cancelar tem rota própria). */
export const appointmentStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'COMPLETED', 'NO_SHOW'], { error: 'Status inválido' }),
});

/** Agendamento lançado pela profissional (ex.: marcado por telefone). Pode ser fora do expediente. */
export const adminAppointmentSchema = z.object({
  name: text(2, 100, 'o nome da cliente'),
  phone: phoneSchema,
  email: optionalEmailSchema,
  procedureId: idSchema,
  date: dateSchema,
  time: timeSchema,
  notes: z
    .string()
    .max(500, 'Máximo de 500 caracteres')
    .optional()
    .nullable()
    .transform((v) => (v ? multiLine(v) || null : null)),
  status: z.enum(['CONFIRMED', 'PENDING']).default('CONFIRMED'),
});

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export const clientsQuerySchema = z.object({ search: searchSchema, page: pageSchema });

export const clientUpdateSchema = z.object({
  name: text(2, 100, 'o nome'),
  phone: phoneSchema,
  email: optionalEmailSchema,
});

// ---------------------------------------------------------------------------
// Procedimentos
// ---------------------------------------------------------------------------

export const procedureInputSchema = z.object({
  name: text(2, 120, 'o nome'),
  category: z.enum(['PELE', 'HARMONIZACAO', 'CORPORAL', 'AVALIACAO'] satisfies ProcedureCategory[], {
    error: 'Escolha a categoria',
  }),
  shortDescription: text(10, 300, 'o resumo'),
  description: z
    .string()
    .transform(multiLine)
    .pipe(z.string().min(10, 'Descrição muito curta').max(4000, 'Máximo de 4000 caracteres')),
  highlights: z.array(text(1, 80, 'o destaque')).max(6, 'No máximo 6 destaques').default([]),
  durationMinutes: int(5, 600, 'a duração').refine((v) => v % 5 === 0, 'Use múltiplos de 5 minutos'),
  /** null = "valor sob avaliação" */
  price: z.coerce
    .number({ error: 'Preço inválido' })
    .min(0, 'Preço inválido')
    .max(99_999, 'Preço muito alto')
    .transform((v) => Math.round(v * 100) / 100)
    .nullable()
    .default(null),
  requiresEvaluation: z.boolean().default(false),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: int(0, 999, 'a ordem').default(100),
});

export const procedureUpdateSchema = procedureInputSchema.partial();

/** Regras das fotos enviadas pelo painel (conferidas no navegador e de novo na API). */
export const IMAGE_UPLOAD_RULES = {
  maxBytes: 5 * 1024 * 1024,
  minWidth: 800,
  minHeight: 600,
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  extensions: '.jpg,.jpeg,.png,.webp',
  /** Tamanho final, recortado em 4:3 */
  outputWidth: 1200,
  outputHeight: 900,
} as const;

// ---------------------------------------------------------------------------
// Expediente, bloqueios e configurações
// ---------------------------------------------------------------------------

const intervalSchema = z
  .object({ start: timeSchema, end: timeSchema })
  .refine((i) => i.end > i.start, 'O horário final precisa ser depois do inicial');

export const businessHoursSchema = z
  .object({
    days: z
      .array(
        z.object({
          dayOfWeek: z.number().int().min(0).max(6),
          intervals: z.array(intervalSchema).max(4, 'No máximo 4 períodos por dia'),
        }),
      )
      .length(7),
  })
  .superRefine(({ days }, ctx) => {
    if (new Set(days.map((d) => d.dayOfWeek)).size !== 7) {
      ctx.addIssue({ code: 'custom', path: ['days'], message: 'Informe os 7 dias da semana' });
    }
    for (const day of days) {
      const sorted = [...day.intervals].sort((a, b) => a.start.localeCompare(b.start));
      for (let i = 1; i < sorted.length; i++) {
        if (timeToMinutes(sorted[i]!.start) < timeToMinutes(sorted[i - 1]!.end)) {
          ctx.addIssue({ code: 'custom', path: ['days'], message: 'Há períodos sobrepostos no mesmo dia' });
          return;
        }
      }
    }
  });

export const blockedTimeSchema = z
  .object({
    startDate: dateSchema,
    /** Último dia bloqueado (dia inteiro). Vazio = só startDate. */
    endDate: dateSchema.optional().nullable(),
    allDay: z.boolean(),
    startTime: timeSchema.optional().nullable(),
    endTime: timeSchema.optional().nullable(),
    reason: optionalText(120),
  })
  .superRefine((b, ctx) => {
    if (b.allDay) {
      if (b.endDate && b.endDate < b.startDate) {
        ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'A data final precisa ser igual ou depois da inicial' });
      }
      return;
    }
    if (!b.startTime) ctx.addIssue({ code: 'custom', path: ['startTime'], message: 'Informe o horário inicial' });
    if (!b.endTime) ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'Informe o horário final' });
    if (b.startTime && b.endTime && b.endTime <= b.startTime) {
      ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'O horário final precisa ser depois do inicial' });
    }
  });

export const blockedTimesQuerySchema = z.object({ from: dateSchema.optional() });

export const businessSettingsSchema = z.object({
  slotIntervalMinutes: int(5, 120, 'o intervalo entre horários'),
  bufferMinutes: int(0, 120, 'a folga entre atendimentos'),
  minNoticeMinutes: int(0, 10_080, 'a antecedência mínima'),
  maxDaysAhead: int(1, 365, 'os dias de agenda aberta'),
  pendingHoldHours: int(1, 72, 'o prazo da pré-reserva'),
  clientCancelNoticeHours: int(0, 168, 'o prazo de cancelamento'),
  paymentMethods: z.array(text(1, 60, 'a forma de pagamento')).max(10, 'No máximo 10 formas de pagamento'),
  address: optionalText(200),
});

export const systemSettingsSchema = z.object({
  onlineBookingEnabled: z.boolean(),
  sessionIdleMinutes: int(15, 1440, 'o tempo de inatividade'),
  sessionMaxDays: int(1, 30, 'a duração máxima da sessão'),
});

export const auditLogsQuerySchema = z.object({
  search: searchSchema,
  entity: z.string().regex(/^[a-z_]{1,40}$/).optional(),
  page: pageSchema,
});

// ---------------------------------------------------------------------------
// Formatos de resposta
// ---------------------------------------------------------------------------

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface SessionUserDTO {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  permissions: Permission[];
  /** Senha provisória: o painel só libera a troca de senha até ela ser alterada */
  mustChangePassword: boolean;
}

export interface AdminAppointmentDTO {
  id: string;
  code: string;
  /** PENDING com prazo vencido já chega como EXPIRED */
  status: AppointmentStatus;
  date: string;
  time: string;
  endTime: string;
  durationMinutes: number;
  procedure: { id: string; name: string; slug: string };
  client: { id: string; name: string; phone: string; email: string | null };
  /** Contato informado neste agendamento (null = usa o cadastro da cliente) */
  contactName: string | null;
  contactEmail: string | null;
  notes: string | null;
  source: string;
  expiresAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  /** Nome de quem cancelou no painel */
  cancelledByName: string | null;
  /** Aviso de cancelamento enviado à cliente por e-mail (null = não se aplica) */
  cancellationEmail: EmailNotificationDTO | null;
  /** Confirmação feita no painel */
  confirmedAt: string | null;
  confirmedBy: string | null;
  /** E-mail de confirmação enviado à cliente (null = ainda não enviado) */
  confirmationEmail: EmailNotificationDTO | null;
  createdAt: string;
}

export interface EmailNotificationDTO {
  status: NotificationStatus;
  to: string | null;
  sentAt: string | null;
  error: string | null;
  attempts: number;
}

/** Resultado de um agendamento dentro do cancelamento em massa. */
export interface BulkCancelItemDTO {
  id: string;
  clientName: string;
  procedure: string;
  date: string;
  time: string;
  /** cancelled = cancelado agora; skipped = não estava mais ativo (já cancelado, expirado…) */
  result: 'cancelled' | 'skipped' | 'not_found';
  detail: string | null;
  email: { status: NotificationStatus; to: string | null; error: string | null } | null;
}

export interface BulkCancelResultDTO {
  requested: number;
  cancelled: number;
  skipped: number;
  emailsSent: number;
  emailsFailed: number;
  noEmail: number;
  items: BulkCancelItemDTO[];
}

export interface AgendaDayDTO {
  date: string;
  /** Expediente do dia (vazio = dia sem atendimento) */
  intervals: { start: string; end: string }[];
  /** Bloqueios recortados para o dia; "24:00" = até o fim do dia */
  blocks: { id: string; start: string; end: string; reason: string | null }[];
  /** Ativos e cancelados do dia, em ordem de horário */
  appointments: AdminAppointmentDTO[];
}

export interface DashboardDTO {
  date: string;
  counts: { total: number; confirmed: number; pending: number; cancelled: number };
  pendingToConfirm: AdminAppointmentDTO[];
  upcoming: AdminAppointmentDTO[];
  /** Inícios livres hoje (no intervalo padrão da agenda) */
  freeSlotsToday: string[];
  busyToday: AdminAppointmentDTO[];
  recentCancellations: AdminAppointmentDTO[];
}

export interface SlotCheckDTO {
  /** Pode salvar (não sobrepõe outro agendamento e não é no passado) */
  ok: boolean;
  conflict: boolean;
  past: boolean;
  /** Avisos — permitidos para a profissional (encaixe) */
  outsideHours: boolean;
  blocked: boolean;
}

export interface ClientAppointmentRef {
  date: string;
  time: string;
  procedure: string;
  status: AppointmentStatus;
}

export interface ClientSummaryDTO {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  totalAppointments: number;
  lastAppointment: ClientAppointmentRef | null;
  nextAppointment: ClientAppointmentRef | null;
}

export interface ClientDetailDTO extends ClientSummaryDTO {
  createdAt: string;
  history: AdminAppointmentDTO[];
}

export interface AdminProcedureDTO extends ProcedureDTO {
  id: string;
  active: boolean;
  sortOrder: number;
  /** Foto enviada pelo painel (false = foto temporária/padrão do site) */
  hasUploadedImage: boolean;
}

export interface BusinessHoursDTO {
  days: { dayOfWeek: number; intervals: { start: string; end: string }[] }[];
}

export interface BlockedTimeDTO {
  id: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  createdBy: string | null;
}

export interface BlockedTimeCreatedDTO {
  block: BlockedTimeDTO;
  /** Agendamentos ativos que já existiam no período bloqueado (não são cancelados automaticamente) */
  conflicts: number;
}

export interface BusinessSettingsDTO {
  slotIntervalMinutes: number;
  bufferMinutes: number;
  minNoticeMinutes: number;
  maxDaysAhead: number;
  pendingHoldHours: number;
  clientCancelNoticeHours: number;
  paymentMethods: string[];
  address: string | null;
}

export interface SystemSettingsDTO {
  onlineBookingEnabled: boolean;
  sessionIdleMinutes: number;
  sessionMaxDays: number;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UserPasswordResetDTO {
  /** Senha provisória — exibida uma única vez */
  temporaryPassword: string;
}

export interface AuditLogDTO {
  id: string;
  createdAt: string;
  actorName: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  description: string;
  ip: string | null;
}

export interface SystemInfoDTO {
  version: string;
  nodeVersion: string;
  environment: string;
  uptimeSeconds: number;
  database: { ok: boolean; latencyMs: number | null };
  counts: { users: number; activeUsers: number; clients: number; appointments: number; procedures: number; media: number };
  settings: SystemSettingsDTO;
  /** Envio de e-mail (SMTP). Nunca inclui a senha. */
  email: {
    configured: boolean;
    /** Resultado do último teste de conexão (null = ainda não testado) */
    ok: boolean | null;
    host: string | null;
    sender: string | null;
    error: string | null;
    checkedAt: string | null;
  };
}

/** O que a cliente vê pelo link privado — o mínimo necessário. */
export interface ManageBookingDTO {
  code: string;
  status: AppointmentStatus;
  procedureName: string;
  date: string;
  time: string;
  endTime: string;
  clientFirstName: string;
  canCancel: boolean;
  cancelNoticeHours: number;
}

import { toBusinessDate, toBusinessTime, type NotificationStatus } from '@mf/shared';
import type { AppointmentStatus, Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { cancellationEmail } from './cancellation-email.template';
import { confirmationEmail } from './confirmation-email.template';
import { MailSendError, mailer } from './mailer';

/**
 * E-mails automáticos ligados a um agendamento — um registro de envio por tipo:
 *   confirmation  → quando a profissional CONFIRMA  (campos confirmation_email_*)
 *   cancellation  → quando a clínica CANCELA        (campos cancellation_email_*)
 *
 * Cada envio é "reservado" de forma atômica antes de sair, então recarregar a página,
 * clicar de novo ou consultar o status nunca gera e-mail duplicado.
 * Falhas não desfazem a confirmação/cancelamento: ficam registradas para "Enviar novamente".
 */
export type AppointmentEmailKind = 'confirmation' | 'cancellation';

export interface DeliveryResult {
  status: NotificationStatus;
  to: string | null;
  error: string | null;
}

const KINDS = {
  confirmation: {
    appointmentStatus: 'CONFIRMED' as AppointmentStatus,
    // Confirmação sem e-mail continua como falha (comportamento existente preservado)
    noEmailStatus: 'FAILED' as NotificationStatus,
    noEmailError: 'Cliente sem e-mail cadastrado. Edite o cadastro da cliente e envie novamente.',
  },
  cancellation: {
    appointmentStatus: 'CANCELLED' as AppointmentStatus,
    noEmailStatus: 'SKIPPED' as NotificationStatus,
    noEmailError: 'Cliente sem e-mail cadastrado — notificação não enviada.',
  },
} as const;

const NOT_CONFIGURED = 'Envio de e-mail ainda não configurado no servidor (SMTP).';
/** Envio "travado" em PENDING há mais que isso pode ser tentado de novo (ex.: servidor reiniciou no meio). */
const STALE_PENDING_MS = 2 * 60_000;

/** Campos de cada tipo, montados por nome (confirmationEmailStatus, cancellationEmailStatus…). */
function fields(kind: AppointmentEmailKind) {
  const p = `${kind}Email` as const;
  return {
    status: `${p}Status`,
    sentAt: `${p}SentAt`,
    error: `${p}Error`,
    to: `${p}To`,
    attempts: `${p}Attempts`,
  } as const;
}

/** Valores para gravar no início do envio (usado também dentro da transação de confirmar/cancelar). */
export function reserveEmailData(kind: AppointmentEmailKind): Prisma.AppointmentUncheckedUpdateInput {
  const f = fields(kind);
  return { [f.status]: 'PENDING', [f.error]: null, [f.attempts]: { increment: 1 } } as Prisma.AppointmentUncheckedUpdateInput;
}

export const appointmentEmailService = {
  /**
   * Reserva o envio (ex.: "Enviar novamente"). Só reserva se o agendamento estiver no status do tipo
   * e o e-mail ainda não tiver sido enviado (nunca tentado, falhou, sem e-mail ou travado).
   */
  async claim(kind: AppointmentEmailKind, appointmentId: string, now = new Date()): Promise<boolean> {
    const f = fields(kind);
    const { count } = await prisma.appointment.updateMany({
      where: {
        id: appointmentId,
        status: KINDS[kind].appointmentStatus,
        OR: [
          { [f.status]: null },
          { [f.status]: { in: ['FAILED', 'SKIPPED'] } },
          { [f.status]: 'PENDING', updatedAt: { lt: new Date(now.getTime() - STALE_PENDING_MS) } },
        ],
      } as Prisma.AppointmentWhereInput,
      data: reserveEmailData(kind) as Prisma.AppointmentUpdateManyMutationInput,
    });
    return count === 1;
  },

  /** Envia (agendamento já reservado em PENDING) e grava o resultado. Nunca lança erro. */
  async deliver(kind: AppointmentEmailKind, appointmentId: string): Promise<DeliveryResult> {
    const f = fields(kind);
    const appointment = await prisma.appointment.findUniqueOrThrow({
      where: { id: appointmentId },
      include: { client: { select: { name: true, email: true } }, procedure: { select: { name: true } } },
    });
    // A2: o contato informado NESTE agendamento; registros antigos usam o cadastro da cliente
    const to = appointment.contactEmail ?? appointment.client.email;

    const save = async (result: DeliveryResult) => {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          [f.status]: result.status,
          [f.error]: result.error?.slice(0, 300) ?? null,
          [f.to]: result.to,
          ...(result.status === 'SENT' && { [f.sentAt]: new Date() }),
        } as Prisma.AppointmentUpdateInput,
      });
      return result;
    };

    if (!to) return save({ status: KINDS[kind].noEmailStatus, to: null, error: KINDS[kind].noEmailError });
    if (!mailer.isConfigured()) return save({ status: 'FAILED', to, error: NOT_CONFIGURED });

    const data = {
      clientName: appointment.contactName ?? appointment.client.name,
      procedure: appointment.procedure.name,
      date: toBusinessDate(appointment.startsAt),
      time: toBusinessTime(appointment.startsAt),
      clinicWhatsapp: env.CLINIC_WHATSAPP_NUMBER,
    };
    try {
      await mailer.send({
        to,
        ...(kind === 'confirmation' ? confirmationEmail(data) : cancellationEmail({ ...data, reason: appointment.cancelReason })),
      });
      return save({ status: 'SENT', to, error: null });
    } catch (error) {
      return save({ status: 'FAILED', to, error: error instanceof MailSendError ? error.message : 'Erro inesperado ao enviar o e-mail.' });
    }
  },
};

/** Texto curto do resultado para os logs. */
export function describeDelivery(result: DeliveryResult): string {
  if (result.status === 'SENT') return `enviado para ${result.to}`;
  if (result.status === 'SKIPPED') return 'não enviado — cliente sem e-mail cadastrado';
  return `falha no envio (${result.error})`;
}

import { toBusinessDate, toBusinessTime, type AdminAppointmentDTO, type AppointmentStatus } from '@mf/shared';
import type { Appointment, Client, Procedure, User } from '@prisma/client';

export type AppointmentWithRelations = Appointment & {
  client: Pick<Client, 'id' | 'name' | 'phone' | 'email'>;
  procedure: Pick<Procedure, 'id' | 'name' | 'slug'>;
  confirmedBy?: Pick<User, 'name'> | null;
  cancelledByUser?: Pick<User, 'name'> | null;
};

/** include padrão para montar AdminAppointmentDTO */
export const appointmentInclude = {
  client: { select: { id: true, name: true, phone: true, email: true } },
  procedure: { select: { id: true, name: true, slug: true } },
  confirmedBy: { select: { name: true } },
  cancelledByUser: { select: { name: true } },
} as const;

/** Código curto exibido à cliente e usado na mensagem do WhatsApp. */
export const appointmentCode = (id: string) => id.slice(0, 6).toUpperCase();

/** Status real: pré-reserva com prazo vencido aparece como expirada, mesmo antes do banco ser atualizado. */
export function effectiveStatus(a: Pick<Appointment, 'status' | 'expiresAt'>, now = new Date()): AppointmentStatus {
  if (a.status === 'PENDING' && a.expiresAt && a.expiresAt <= now) return 'EXPIRED';
  return a.status;
}

export function toAdminAppointmentDTO(a: AppointmentWithRelations, now = new Date()): AdminAppointmentDTO {
  return {
    id: a.id,
    code: appointmentCode(a.id),
    status: effectiveStatus(a, now),
    date: toBusinessDate(a.startsAt),
    time: toBusinessTime(a.startsAt),
    endTime: toBusinessTime(a.endsAt),
    durationMinutes: a.durationMinutes,
    procedure: a.procedure,
    client: a.client,
    notes: a.notes,
    contactName: a.contactName,
    contactEmail: a.contactEmail,
    source: a.source,
    expiresAt: a.expiresAt?.toISOString() ?? null,
    cancelledAt: a.cancelledAt?.toISOString() ?? null,
    cancelledBy: a.cancelledBy,
    cancelReason: a.cancelReason,
    cancelledByName: a.cancelledByUser?.name ?? null,
    cancellationEmail: a.cancellationEmailStatus
      ? {
          status: a.cancellationEmailStatus,
          to: a.cancellationEmailTo,
          sentAt: a.cancellationEmailSentAt?.toISOString() ?? null,
          error: a.cancellationEmailError,
          attempts: a.cancellationEmailAttempts,
        }
      : null,
    confirmedAt: a.confirmedAt?.toISOString() ?? null,
    confirmedBy: a.confirmedBy?.name ?? null,
    confirmationEmail: a.confirmationEmailStatus
      ? {
          status: a.confirmationEmailStatus,
          to: a.confirmationEmailTo,
          sentAt: a.confirmationEmailSentAt?.toISOString() ?? null,
          error: a.confirmationEmailError,
          attempts: a.confirmationEmailAttempts,
        }
      : null,
    createdAt: a.createdAt.toISOString(),
  };
}

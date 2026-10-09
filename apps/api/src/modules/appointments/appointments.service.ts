import { formatDateBR, toBusinessTime, zonedDateTime, type BookingDTO, type BookingRequest } from '@mf/shared';
import type { Prisma } from '@prisma/client';
import { randomToken, sha256 } from '../../lib/crypto';
import { AppError } from '../../lib/errors';
import { isOverlapViolation, prisma } from '../../lib/prisma';
import { auditService, type Actor } from '../audit/audit.service';
import { availabilityService } from '../availability/availability.service';
import { systemSettingsRepository } from '../system/system-settings.repository';
import { clientsRepository } from '../clients/clients.repository';
import { proceduresService } from '../procedures/procedures.service';
import { scheduleRepository } from '../schedule/schedule.repository';
import { appointmentsRepository } from './appointments.repository';

/** M3 — pré-reservas aguardando confirmação ao mesmo tempo (evita ocupar a agenda com reservas falsas). */
export const MAX_PENDING_PER_PHONE = 2;
export const MAX_PENDING_PER_EMAIL = 3;
const tooManyPending = () =>
  new AppError(
    429,
    'TOO_MANY_PENDING',
    'Você já tem pré-reservas aguardando a confirmação da clínica. Aguarde a confirmação ou fale conosco pelo WhatsApp.',
  );

const slotTaken = () =>
  new AppError(409, 'SLOT_UNAVAILABLE', 'Este horário acabou de ficar indisponível. Por favor, escolha outro horário.');

export const appointmentsService = {
  /**
   * Cria uma pré-reserva vinda do site.
   *
   * Proteções contra conflito, em camadas:
   * 1. o horário é recalculado no servidor (não confiamos no que o navegador mostrou);
   * 2. dentro da transação, pré-reservas vencidas são expiradas e o cadastro é verificado;
   * 3. a constraint `appointments_no_overlap` do PostgreSQL rejeita qualquer sobreposição,
   *    inclusive de duas pessoas confirmando o mesmo horário no mesmo instante.
   */
  async createFromSite(input: BookingRequest, now = new Date(), actor?: Pick<Actor, 'ip'>): Promise<BookingDTO> {
    if (!(await systemSettingsRepository.get()).onlineBookingEnabled) {
      throw new AppError(503, 'BOOKING_DISABLED', 'A agenda online está temporariamente pausada. Agende pelo WhatsApp.');
    }
    const procedure = await proceduresService.requireActive(input.procedureSlug);
    const settings = await scheduleRepository.getSettings();

    const startsAt = zonedDateTime(input.date, input.time);
    const endsAt = new Date(startsAt.getTime() + procedure.durationMinutes * 60_000);
    const expiresAt = new Date(now.getTime() + settings.pendingHoldHours * 3_600_000);
    // Link privado da cliente: o token vai só para ela; o banco guarda o hash
    const manageToken = randomToken(18);

    try {
      const appointment = await prisma.$transaction(async (tx) => {
        await appointmentsRepository.expireStalePending(now, tx);

        const available = await availabilityService.slotsFor(procedure, input.date, now, tx);
        if (!available.includes(input.time)) throw slotTaken();

        // M3: limite de pré-reservas ativas por telefone e por e-mail (além do limite por IP)
        const activePending: Prisma.AppointmentWhereInput = {
          status: 'PENDING',
          startsAt: { gt: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        };
        const [byPhone, byEmail] = await Promise.all([
          tx.appointment.count({ where: { ...activePending, client: { phone: input.phone } } }),
          tx.appointment.count({ where: { ...activePending, contactEmail: input.email } }),
        ]);
        if (byPhone >= MAX_PENDING_PER_PHONE || byEmail >= MAX_PENDING_PER_EMAIL) throw tooManyPending();

        const client = await clientsRepository.findOrCreateByPhone(
          { name: input.name, phone: input.phone, email: input.email },
          tx,
        );

        // Mensagem propositalmente genérica: não revela dados de um agendamento a quem digitou o telefone.
        if (await appointmentsRepository.hasActiveFutureBooking(client.id, procedure.id, now, tx)) {
          throw new AppError(
            409,
            'DUPLICATE_BOOKING',
            'Já existe um agendamento ativo deste procedimento para este WhatsApp. Para alterar ou remarcar, fale conosco pelo WhatsApp.',
          );
        }

        const created = await appointmentsRepository.create(
          {
            clientId: client.id,
            procedureId: procedure.id,
            startsAt,
            endsAt,
            durationMinutes: procedure.durationMinutes,
            status: 'PENDING',
            notes: input.notes,
            source: 'site',
            expiresAt,
            // A2: contato informado NESTE agendamento (não altera o cadastro da cliente)
            contactName: input.name,
            contactEmail: input.email,
            manageTokenHash: sha256(manageToken),
          },
          tx,
        );
        await auditService.log(
          { userId: null, name: `${client.name} (cliente)`, ip: actor?.ip },
          {
            action: 'appointment.site_create',
            entity: 'appointment',
            entityId: created.id,
            description: `Pré-reserva pelo site — ${procedure.name}, ${formatDateBR(input.date)} ${input.time}`,
          },
          tx,
        );
        return created;
      });

      return {
        id: appointment.id,
        code: appointment.id.slice(0, 6).toUpperCase(),
        status: 'PENDING',
        procedure: { slug: procedure.slug, name: procedure.name, requiresEvaluation: procedure.requiresEvaluation },
        date: input.date,
        time: input.time,
        endTime: toBusinessTime(endsAt),
        clientName: input.name,
        phone: input.phone,
        expiresAt: appointment.expiresAt?.toISOString() ?? null,
        manageToken,
      };
    } catch (error) {
      if (isOverlapViolation(error)) throw slotTaken();
      throw error;
    }
  },
};

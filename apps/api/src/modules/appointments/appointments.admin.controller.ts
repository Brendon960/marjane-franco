import {
  adminAppointmentSchema,
  adminSlotsQuerySchema,
  agendaQuerySchema,
  appointmentStatusSchema,
  appointmentsQuerySchema,
  bulkCancelSchema,
  cancelAppointmentSchema,
  idSchema,
  rescheduleSchema,
  slotCheckQuerySchema,
} from '@mf/shared';
import type { FastifyInstance } from 'fastify';
import { validate } from '../../lib/validate';
import { actorFrom } from '../audit/audit.service';
import { requirePermission } from '../auth/auth.guard';
import { appointmentsAdminService as service } from './appointments.admin.service';

type IdParams = { Params: { id: string } };

/** Dashboard, agenda e gestão de agendamentos (ADMIN). */
export async function appointmentsAdminController(app: FastifyInstance) {
  app.get('/dashboard', { preHandler: requirePermission('dashboard:view') }, () => service.dashboard());

  app.register(async (agenda) => {
    agenda.addHook('preHandler', requirePermission('agenda:manage'));

    agenda.get('/agenda', async (req) => service.agenda(validate(agendaQuerySchema, req.query).date));

    agenda.get('/appointments', async (req) => service.list(validate(appointmentsQuerySchema, req.query)));

    agenda.get<IdParams>('/appointments/:id', async (req) => service.get(validate(idSchema, req.params.id)));

    agenda.get('/slots', async (req) => {
      const { procedureId, date, excludeId } = validate(adminSlotsQuerySchema, req.query);
      return { date, slots: await service.suggestSlots(procedureId, date, excludeId) };
    });

    agenda.get('/slots/check', async (req) => {
      const { procedureId, date, time, excludeId } = validate(slotCheckQuerySchema, req.query);
      return service.checkSlot(procedureId, date, time, excludeId);
    });

    agenda.post('/appointments', async (req, reply) => {
      const created = await service.create(validate(adminAppointmentSchema, req.body), actorFrom(req));
      return reply.status(201).send(created);
    });

    agenda.post<IdParams>('/appointments/:id/reschedule', async (req) =>
      service.reschedule(validate(idSchema, req.params.id), validate(rescheduleSchema, req.body), actorFrom(req)),
    );

    agenda.post<IdParams>('/appointments/:id/cancel', async (req) =>
      service.cancel(validate(idSchema, req.params.id), validate(cancelAppointmentSchema, req.body ?? {}).reason, actorFrom(req)),
    );

    agenda.post(
      '/appointments/bulk-cancel',
      { config: { rateLimit: { max: 10, timeWindow: '10 minutes' } } },
      async (req) => {
        const { ids, reason } = validate(bulkCancelSchema, req.body);
        return service.bulkCancel(ids, reason, actorFrom(req));
      },
    );

    agenda.post<IdParams>(
      '/appointments/:id/cancellation-email',
      { config: { rateLimit: { max: 20, timeWindow: '10 minutes' } } },
      async (req) => service.resendCancellationEmail(validate(idSchema, req.params.id), actorFrom(req)),
    );

    agenda.post<IdParams>(
      '/appointments/:id/confirmation-email',
      { config: { rateLimit: { max: 20, timeWindow: '10 minutes' } } },
      async (req) => service.resendConfirmationEmail(validate(idSchema, req.params.id), actorFrom(req)),
    );

    agenda.post<IdParams>('/appointments/:id/status', async (req) =>
      service.setStatus(validate(idSchema, req.params.id), validate(appointmentStatusSchema, req.body).status, actorFrom(req)),
    );
  });
}

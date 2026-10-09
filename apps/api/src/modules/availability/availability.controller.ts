import { daysQuerySchema, slotsQuerySchema, type SlotsDTO } from '@mf/shared';
import type { FastifyInstance } from 'fastify';
import { validate } from '../../lib/validate';
import { proceduresService } from '../procedures/procedures.service';
import { availabilityService } from './availability.service';

export async function availabilityController(app: FastifyInstance) {
  // Disponibilidade muda a cada agendamento: nunca cachear.
  app.addHook('onSend', async (_req, reply) => {
    reply.header('Cache-Control', 'no-store');
  });

  app.get('/availability/days', async (req) => {
    const { procedure, month } = validate(daysQuerySchema, req.query);
    return availabilityService.daysFor(await proceduresService.requireActive(procedure), month);
  });

  app.get('/availability/slots', async (req): Promise<SlotsDTO> => {
    const { procedure, date } = validate(slotsQuerySchema, req.query);
    const slots = await availabilityService.slotsFor(await proceduresService.requireActive(procedure), date);
    return { date, procedureSlug: procedure, slots };
  });
}

import { bookingRequestSchema } from '@mf/shared';
import type { FastifyInstance } from 'fastify';
import { validate } from '../../lib/validate';
import { appointmentsService } from './appointments.service';

export async function appointmentsController(app: FastifyInstance) {
  app.post(
    '/appointments',
    {
      // Limite mais rígido que o global: evita robôs enchendo a agenda de pré-reservas.
      // Não pode ser baixo demais: clientes da mesma operadora de celular costumam sair pelo mesmo IP.
      // A duplicidade por WhatsApp + procedimento já é barrada no serviço.
      config: { rateLimit: { max: 20, timeWindow: '1 hour' } },
    },
    async (req, reply) => {
      const booking = await appointmentsService.createFromSite(validate(bookingRequestSchema, req.body), new Date(), { ip: req.ip });
      return reply.status(201).send(booking);
    },
  );
}

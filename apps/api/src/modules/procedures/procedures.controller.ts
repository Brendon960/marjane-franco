import { slugSchema } from '@mf/shared';
import type { FastifyInstance } from 'fastify';
import { validate } from '../../lib/validate';
import { proceduresService, toProcedureDTO } from './procedures.service';

export async function proceduresController(app: FastifyInstance) {
  app.get('/procedures', async (_req, reply) => {
    reply.header('Cache-Control', 'public, max-age=60');
    return proceduresService.list();
  });

  app.get<{ Params: { slug: string } }>('/procedures/:slug', async (req, reply) => {
    const procedure = await proceduresService.requireActive(validate(slugSchema, req.params.slug));
    reply.header('Cache-Control', 'public, max-age=60');
    return toProcedureDTO(procedure);
  });
}

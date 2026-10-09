import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { notFound } from '../../lib/errors';
import { mediaService } from './media.service';

/** Serve as fotos enviadas pelo painel (públicas: aparecem no site). */
export async function mediaController(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/media/:id', async (req, reply) => {
    const id = z.uuid().safeParse(req.params.id);
    const media = id.success ? await mediaService.get(id.data) : null;
    if (!media) throw notFound('Imagem não encontrada.');
    return reply
      .header('Content-Type', media.mime)
      // Cada envio gera um id novo: o arquivo nunca muda, pode ficar em cache para sempre
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      // Permite exibir a imagem mesmo se o site estiver em outro domínio
      .header('Cross-Origin-Resource-Policy', 'cross-origin')
      .send(Buffer.from(media.data));
  });
}

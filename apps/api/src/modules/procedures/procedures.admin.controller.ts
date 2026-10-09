import multipart from '@fastify/multipart';
import {
  IMAGE_UPLOAD_RULES,
  idSchema,
  procedureInputSchema,
  procedureUpdateSchema,
  type AdminProcedureDTO,
} from '@mf/shared';
import { Prisma, type Procedure } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { AppError, notFound } from '../../lib/errors';
import { prisma, type Db } from '../../lib/prisma';
import { validate } from '../../lib/validate';
import { actorFrom, auditService } from '../audit/audit.service';
import { requirePermission } from '../auth/auth.guard';
import { mediaIdFromUrl, mediaService, mediaUrl } from '../media/media.service';
import { toProcedureDTO } from './procedures.service';

const FIELD_LABELS: Record<string, string> = {
  name: 'nome',
  category: 'categoria',
  shortDescription: 'resumo',
  description: 'descrição',
  highlights: 'destaques',
  durationMinutes: 'duração',
  price: 'preço',
  requiresEvaluation: 'avaliação prévia',
  featured: 'destaque',
  active: 'ativo',
  sortOrder: 'ordem',
};

export function toAdminProcedureDTO(p: Procedure): AdminProcedureDTO {
  return { ...toProcedureDTO(p), id: p.id, active: p.active, sortOrder: p.sortOrder, hasUploadedImage: !!mediaIdFromUrl(p.imageUrl) };
}

/** "Harmonização de Lábios" → "harmonizacao-de-labios" (único). O slug não muda depois: é a URL pública. */
async function uniqueSlug(name: string, db: Db) {
  const base =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 70) || 'procedimento';
  const taken = new Set((await db.procedure.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } })).map((p) => p.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

async function requireProcedure(id: string, db: Db = prisma) {
  const procedure = await db.procedure.findUnique({ where: { id } });
  if (!procedure) throw notFound('Procedimento não encontrado.');
  return procedure;
}

const priceValue = (p: number | null | undefined) => (p === undefined ? undefined : p === null ? null : new Prisma.Decimal(p));

/** Procedimentos e fotos (ADMIN). */
export async function proceduresAdminController(app: FastifyInstance) {
  app.addHook('preHandler', requirePermission('procedures:manage'));
  // Upload só aqui: fora desta rota, o limite de 16 KB por requisição continua valendo
  await app.register(multipart, { limits: { fileSize: IMAGE_UPLOAD_RULES.maxBytes, files: 1, fields: 0, parts: 1 } });

  app.get('/procedures', async (): Promise<AdminProcedureDTO[]> => {
    const procedures = await prisma.procedure.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    return procedures.map(toAdminProcedureDTO);
  });

  app.post('/procedures', async (req, reply) => {
    const input = validate(procedureInputSchema, req.body);
    const created = await prisma.$transaction(async (tx) => {
      const procedure = await tx.procedure.create({
        data: { ...input, price: priceValue(input.price), slug: await uniqueSlug(input.name, tx) },
      });
      await auditService.log(
        actorFrom(req),
        { action: 'procedure.create', entity: 'procedure', entityId: procedure.id, description: `Criou o procedimento ${procedure.name}` },
        tx,
      );
      return procedure;
    });
    return reply.status(201).send(toAdminProcedureDTO(created));
  });

  app.patch<{ Params: { id: string } }>('/procedures/:id', async (req) => {
    const id = validate(idSchema, req.params.id);
    const input = validate(procedureUpdateSchema, req.body);
    const updated = await prisma.$transaction(async (tx) => {
      const before = await requireProcedure(id, tx);
      const procedure = await tx.procedure.update({ where: { id }, data: { ...input, price: priceValue(input.price) } });

      const changed = Object.keys(input).filter((k) => {
        const a = before[k as keyof Procedure];
        const b = procedure[k as keyof Procedure];
        return JSON.stringify(a instanceof Prisma.Decimal ? a.toNumber() : a) !== JSON.stringify(b instanceof Prisma.Decimal ? b.toNumber() : b);
      });
      if (changed.length) {
        const onlyToggle = changed.length === 1 && changed[0] === 'active';
        await auditService.log(
          actorFrom(req),
          {
            action: onlyToggle ? (procedure.active ? 'procedure.activate' : 'procedure.deactivate') : 'procedure.update',
            entity: 'procedure',
            entityId: id,
            description: onlyToggle
              ? `${procedure.active ? 'Ativou' : 'Desativou'} o procedimento ${procedure.name}`
              : `Editou o procedimento ${procedure.name} (${changed.map((k) => FIELD_LABELS[k] ?? k).join(', ')})`,
          },
          tx,
        );
      }
      return procedure;
    });
    return toAdminProcedureDTO(updated);
  });

  // B5: limite próprio de envio de fotos (processar imagem é caro)
  app.post<{ Params: { id: string } }>('/procedures/:id/image', { config: { rateLimit: { max: 20, timeWindow: '10 minutes' } } }, async (req) => {
    const id = validate(idSchema, req.params.id);
    if (!req.isMultipart()) throw new AppError(400, 'INVALID_IMAGE', 'Envie a foto como arquivo.');
    const file = await req.file();
    if (!file) throw new AppError(400, 'INVALID_IMAGE', 'Nenhum arquivo recebido.');
    if (!(IMAGE_UPLOAD_RULES.mimeTypes as readonly string[]).includes(file.mimetype)) {
      throw new AppError(400, 'INVALID_IMAGE', 'Formato não aceito. Envie JPG, PNG ou WEBP.');
    }
    const image = await mediaService.process(await file.toBuffer());

    const updated = await prisma.$transaction(async (tx) => {
      const before = await requireProcedure(id, tx);
      const media = await mediaService.create(image, req.user!.id, tx);
      const procedure = await tx.procedure.update({ where: { id }, data: { imageUrl: mediaUrl(media.id) } });
      await mediaService.deleteByUrl(before.imageUrl, tx);
      await auditService.log(
        actorFrom(req),
        {
          action: 'procedure.image_update',
          entity: 'procedure',
          entityId: id,
          description: `Alterou a imagem do procedimento ${procedure.name}`,
        },
        tx,
      );
      return procedure;
    });
    return toAdminProcedureDTO(updated);
  });

  /** Volta para a foto padrão do site (arquivo em public/images/procedimentos). */
  app.delete<{ Params: { id: string } }>('/procedures/:id/image', async (req) => {
    const id = validate(idSchema, req.params.id);
    const updated = await prisma.$transaction(async (tx) => {
      const before = await requireProcedure(id, tx);
      const procedure = await tx.procedure.update({ where: { id }, data: { imageUrl: null } });
      await mediaService.deleteByUrl(before.imageUrl, tx);
      await auditService.log(
        actorFrom(req),
        {
          action: 'procedure.image_remove',
          entity: 'procedure',
          entityId: id,
          description: `Voltou a foto padrão do procedimento ${procedure.name}`,
        },
        tx,
      );
      return procedure;
    });
    return toAdminProcedureDTO(updated);
  });
}

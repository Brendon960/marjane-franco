import type { ProcedureDTO } from '@mf/shared';
import type { Procedure } from '@prisma/client';
import { notFound } from '../../lib/errors';
import { proceduresRepository } from './procedures.repository';

export function toProcedureDTO(p: Procedure): ProcedureDTO {
  return {
    slug: p.slug,
    name: p.name,
    category: p.category,
    shortDescription: p.shortDescription,
    description: p.description,
    highlights: p.highlights,
    durationMinutes: p.durationMinutes,
    price: p.price === null ? null : p.price.toNumber(),
    imageUrl: p.imageUrl,
    requiresEvaluation: p.requiresEvaluation,
    featured: p.featured,
  };
}

export const proceduresService = {
  async list(): Promise<ProcedureDTO[]> {
    return (await proceduresRepository.listActive()).map(toProcedureDTO);
  },

  /** Procedimento ativo pelo slug — 404 se não existir ou estiver desativado. */
  async requireActive(slug: string): Promise<Procedure> {
    const procedure = await proceduresRepository.findActiveBySlug(slug);
    if (!procedure) throw notFound('Procedimento não encontrado.');
    return procedure;
  },
};

import type { Prisma } from '@prisma/client';
import type { FastifyRequest } from 'fastify';
import { prisma, type Db } from '../../lib/prisma';

export interface Actor {
  userId: string | null;
  name: string;
  ip?: string;
}

/** Quem está agindo na requisição: o usuário logado ou, sem login, a cliente pelo site. */
export function actorFrom(req: FastifyRequest, fallbackName = 'Cliente (site)'): Actor {
  return req.user
    ? { userId: req.user.id, name: req.user.name, ip: req.ip }
    : { userId: null, name: fallbackName, ip: req.ip };
}

interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string | null;
  description: string;
  metadata?: Prisma.InputJsonValue;
}

export const auditService = {
  /** Registra uma ação. Aceita transação, para o log só existir se a ação for gravada. */
  log(actor: Actor, entry: AuditEntry, db: Db = prisma) {
    return db.auditLog.create({
      data: {
        userId: actor.userId,
        actorName: actor.name.slice(0, 100),
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        description: entry.description.slice(0, 500),
        metadata: entry.metadata,
        ip: actor.ip?.slice(0, 45),
      },
    });
  },
};

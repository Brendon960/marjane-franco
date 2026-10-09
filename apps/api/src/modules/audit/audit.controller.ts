import { auditLogsQuerySchema, type AuditLogDTO, type Paginated } from '@mf/shared';
import type { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma';
import { validate } from '../../lib/validate';
import { requirePermission } from '../auth/auth.guard';

const PAGE_SIZE = 50;

/** Logs do sistema (SUPER_ADMIN). Somente leitura: registros de auditoria nunca são alterados. */
export async function auditController(app: FastifyInstance) {
  app.addHook('preHandler', requirePermission('logs:view'));

  app.get('/audit-logs', async (req): Promise<Paginated<AuditLogDTO>> => {
    const { search, entity, page } = validate(auditLogsQuerySchema, req.query);
    const where: Prisma.AuditLogWhereInput = {
      ...(entity && { entity }),
      ...(search && {
        OR: [
          { description: { contains: search, mode: 'insensitive' } },
          { actorName: { contains: search, mode: 'insensitive' } },
          { action: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
      prisma.auditLog.count({ where }),
    ]);
    return {
      items: items.map((l) => ({
        id: l.id,
        createdAt: l.createdAt.toISOString(),
        actorName: l.actorName,
        userId: l.userId,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        description: l.description,
        ip: l.ip,
      })),
      page,
      pageSize: PAGE_SIZE,
      total,
    };
  });
}

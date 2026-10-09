import { prisma, type Db } from '../../lib/prisma';

export const proceduresRepository = {
  listActive(db: Db = prisma) {
    return db.procedure.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  findActiveBySlug(slug: string, db: Db = prisma) {
    return db.procedure.findFirst({ where: { slug, active: true } });
  },
};

import { prisma, type Db } from '../../lib/prisma';

export const clientsRepository = {
  /**
   * Localiza a cliente pelo WhatsApp ou cria um cadastro novo.
   * Um cadastro EXISTENTE nunca é alterado pelo formulário público (A2): qualquer pessoa pode
   * digitar qualquer telefone. O nome e o e-mail informados ficam no próprio agendamento
   * (contact_name / contact_email), e é para esse contato que os e-mails daquele agendamento vão.
   */
  async findOrCreateByPhone(data: { name: string; phone: string; email?: string }, db: Db = prisma) {
    await insertIfMissing(data, db);
    return db.client.findUniqueOrThrow({ where: { phone: data.phone } });
  },

  /** Versão do painel: a profissional é confiável, então nome e e-mail informados atualizam o cadastro. */
  async upsertByPhoneAsStaff(data: { name: string; phone: string; email: string | null }, db: Db = prisma) {
    await insertIfMissing(data, db);
    return db.client.update({
      where: { phone: data.phone },
      data: { name: data.name, ...(data.email && { email: data.email }) },
    });
  },
};

/**
 * INSERT … ON CONFLICT DO NOTHING. O upsert do Prisma (SELECT e depois INSERT) falhava com
 * violação de unicidade quando duas pré-reservas do MESMO telefone novo chegavam juntas (duplo
 * clique/retry); aqui a segunda transação espera a primeira e segue sem erro.
 */
function insertIfMissing(data: { name: string; phone: string; email?: string | null }, db: Db) {
  return db.client.createMany({ data: [data], skipDuplicates: true });
}

import { prisma, type Db } from '../../lib/prisma';

export const clientsRepository = {
  /**
   * Localiza a cliente pelo WhatsApp ou cria um cadastro novo.
   * Um cadastro EXISTENTE nunca é alterado pelo formulário público (A2): qualquer pessoa pode
   * digitar qualquer telefone. O nome e o e-mail informados ficam no próprio agendamento
   * (contact_name / contact_email), e é para esse contato que os e-mails daquele agendamento vão.
   */
  findOrCreateByPhone(data: { name: string; phone: string; email?: string }, db: Db = prisma) {
    return db.client.upsert({ where: { phone: data.phone }, create: data, update: {} });
  },

  /** Versão do painel: a profissional é confiável, então nome e e-mail informados atualizam o cadastro. */
  upsertByPhoneAsStaff(data: { name: string; phone: string; email: string | null }, db: Db = prisma) {
    return db.client.upsert({
      where: { phone: data.phone },
      create: data,
      update: { name: data.name, ...(data.email && { email: data.email }) },
    });
  },
};

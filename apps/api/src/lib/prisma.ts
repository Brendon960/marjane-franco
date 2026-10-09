import { Prisma, PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

/** Cliente normal ou cliente de transação — repositórios aceitam os dois. */
export type Db = PrismaClient | Prisma.TransactionClient;

/** Violação da constraint que impede agendamentos sobrepostos (SQLSTATE 23P01). */
export function isOverlapViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return message.includes('appointments_no_overlap') || message.includes('23P01');
}

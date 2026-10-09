/**
 * Popula o banco com os dados iniciais. Pode ser executado mais de uma vez:
 * não sobrescreve procedimentos, horários ou configurações já existentes.
 *
 *   npm run db:seed
 */
import { PROCEDURE_CATALOG, addDays, zonedDateTime } from '@mf/shared';
import { PrismaClient } from '@prisma/client';

try {
  process.loadEnvFile();
} catch {
  // sem .env
}

const prisma = new PrismaClient();

/**
 * Horário de funcionamento INICIAL (exemplo do briefing — confirmar com a profissional).
 * 0 = domingo … 6 = sábado. Dois intervalos no mesmo dia = pausa para almoço.
 */
const BUSINESS_HOURS = [
  ...[1, 2, 3, 4, 5].flatMap((dayOfWeek) => [
    { dayOfWeek, startTime: '08:00', endTime: '12:00' },
    { dayOfWeek, startTime: '13:30', endTime: '18:00' },
  ]),
  { dayOfWeek: 6, startTime: '08:00', endTime: '13:00' },
];

/** Feriados nacionais restantes de 2026 (dia inteiro bloqueado). */
const HOLIDAYS = [
  { date: '2026-10-12', reason: 'Feriado — Nossa Senhora Aparecida' },
  { date: '2026-11-02', reason: 'Feriado — Finados' },
  { date: '2026-11-20', reason: 'Feriado — Consciência Negra' },
  { date: '2026-12-25', reason: 'Feriado — Natal' },
];

async function main() {
  for (const { sortOrder, ...item } of PROCEDURE_CATALOG) {
    await prisma.procedure.upsert({
      where: { slug: item.slug },
      create: { ...item, sortOrder },
      update: {},
    });
  }

  if ((await prisma.businessHour.count()) === 0) {
    await prisma.businessHour.createMany({ data: BUSINESS_HOURS });
  }

  await prisma.businessSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      // Formas de pagamento: editar conforme a profissional informar
      paymentMethods: [],
    },
    update: {},
  });

  for (const holiday of HOLIDAYS) {
    const startsAt = zonedDateTime(holiday.date);
    const exists = await prisma.blockedTime.findFirst({ where: { startsAt } });
    if (!exists) {
      await prisma.blockedTime.create({
        data: { startsAt, endsAt: zonedDateTime(addDays(holiday.date, 1)), reason: holiday.reason },
      });
    }
  }

  console.log(`Seed concluído: ${PROCEDURE_CATALOG.length} procedimentos, expediente e feriados.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

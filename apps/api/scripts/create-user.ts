/**
 * Cria um usuário do painel pelo terminal — usado para o PRIMEIRO acesso (o Super Administrador).
 * Os demais usuários (ex.: a Dra. Marjane) são criados depois, pelo próprio painel.
 *
 *   npm run user:create -- --name "Seu Nome" --email voce@email.com --role SUPER_ADMIN
 *
 * Não existe senha padrão no código: uma senha provisória forte é gerada e exibida UMA vez.
 * Troque-a no primeiro acesso, em "Minha conta".
 */
import { emailSchema, ROLE_LABELS, STAFF_ROLES, type StaffRole } from '@mf/shared';
import { PrismaClient } from '@prisma/client';
import { parseArgs } from 'node:util';
import { generateTemporaryPassword, hashPassword } from '../src/modules/auth/password';

try {
  process.loadEnvFile();
} catch {
  // sem .env
}

const { values } = parseArgs({
  options: {
    name: { type: 'string' },
    email: { type: 'string' },
    role: { type: 'string', default: 'SUPER_ADMIN' },
  },
});

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  console.error('Uso: npm run user:create -- --name "Nome" --email email@exemplo.com --role SUPER_ADMIN|ADMIN\n');
  process.exit(1);
}

const name = values.name?.trim();
if (!name || name.length < 2) fail('Informe o nome com --name');
const email = emailSchema.safeParse(values.email ?? '');
if (!email.success) fail('Informe um e-mail válido com --email');
const role = values.role as StaffRole;
if (!STAFF_ROLES.includes(role)) fail('Perfil inválido: use SUPER_ADMIN ou ADMIN');

const prisma = new PrismaClient();
try {
  if (await prisma.user.findUnique({ where: { email: email.data } })) fail(`Já existe um usuário com o e-mail ${email.data}`);

  const password = generateTemporaryPassword(16);
  const user = await prisma.user.create({
    data: { name, email: email.data, role, passwordHash: await hashPassword(password), mustChangePassword: true },
  });
  await prisma.auditLog.create({
    data: {
      actorName: 'Terminal (create-user)',
      action: 'user.create',
      entity: 'user',
      entityId: user.id,
      description: `Criou o usuário ${user.name} (${ROLE_LABELS[role]}) pelo terminal`,
    },
  });

  console.log(`\n✔ Usuário criado: ${user.name} <${user.email}> — ${ROLE_LABELS[role]}`);
  console.log(`\n  Senha provisória: ${password}\n`);
  console.log('  Ela não será exibida de novo. No primeiro acesso em /admin/login o painel exige a troca.\n');
} finally {
  await prisma.$disconnect();
}

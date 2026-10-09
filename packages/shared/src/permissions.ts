/**
 * Controle de acesso por papel — fonte única usada pela API (que é quem de fato
 * bloqueia) e pelo painel (que só esconde o que a pessoa não pode usar).
 *
 * CLIENT não faz login: a cliente usa o site público e o link privado do agendamento.
 */
export const ROLES = ['CLIENT', 'ADMIN', 'SUPER_ADMIN'] as const;
export type Role = (typeof ROLES)[number];

/** Papéis que podem entrar no painel. */
export const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const satisfies readonly Role[];
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  CLIENT: 'Cliente',
  ADMIN: 'Administradora',
  SUPER_ADMIN: 'Super Administrador',
};

export const PERMISSIONS = [
  'dashboard:view',
  'agenda:manage',
  'clients:manage',
  'procedures:manage',
  'schedule:manage',
  'settings:manage',
  'users:manage',
  'logs:view',
  'system:manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Operação da clínica: tudo o que a profissional administra no dia a dia. */
const CLINIC_PERMISSIONS: Permission[] = [
  'dashboard:view',
  'agenda:manage',
  'clients:manage',
  'procedures:manage',
  'schedule:manage',
  'settings:manage',
];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  CLIENT: [],
  ADMIN: CLINIC_PERMISSIONS,
  SUPER_ADMIN: [...CLINIC_PERMISSIONS, 'users:manage', 'logs:view', 'system:manage'],
};

export function permissionsFor(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function can(role: Role | null | undefined, permission: Permission): boolean {
  return !!role && ROLE_PERMISSIONS[role].includes(permission);
}

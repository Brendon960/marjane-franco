import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PERMISSIONS, can, permissionsFor } from './permissions';

test('CLIENT não tem nenhuma permissão do painel', () => {
  assert.deepEqual(permissionsFor('CLIENT'), []);
  for (const p of PERMISSIONS) assert.equal(can('CLIENT', p), false);
});

test('ADMIN administra a clínica, mas não usuários, logs nem sistema', () => {
  for (const p of ['dashboard:view', 'agenda:manage', 'clients:manage', 'procedures:manage', 'schedule:manage', 'settings:manage'] as const) {
    assert.equal(can('ADMIN', p), true, p);
  }
  for (const p of ['users:manage', 'logs:view', 'system:manage'] as const) {
    assert.equal(can('ADMIN', p), false, p);
  }
});

test('SUPER_ADMIN tem todas as permissões', () => {
  for (const p of PERMISSIONS) assert.equal(can('SUPER_ADMIN', p), true, p);
});

test('sem usuário, nada é permitido', () => {
  assert.equal(can(null, 'dashboard:view'), false);
  assert.equal(can(undefined, 'agenda:manage'), false);
});

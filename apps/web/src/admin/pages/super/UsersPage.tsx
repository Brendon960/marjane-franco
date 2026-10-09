import { ROLE_LABELS, STAFF_ROLES, type StaffRole, type UserDTO } from '@mf/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { useAsync } from '../../../hooks/useAsync';
import { ApiError } from '../../../services/api';
import { adminApi } from '../../api';
import { useAuth } from '../../auth';
import { Badge, Dialog, ErrorState, Input, Loading, Notice, PageHeader, Select, useConfirm, useToast } from '../../ui';

function randomPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const values = crypto.getRandomValues(new Uint32Array(14));
  const base = Array.from(values, (v) => chars[v % chars.length]).join('');
  return /\d/.test(base) && /[a-z]/i.test(base) ? base : `${base.slice(0, 12)}a7`;
}

interface FormState {
  name: string;
  email: string;
  role: StaffRole;
  password: string;
}

function UserFormDialog({ user, open, onClose, onSaved }: { user: UserDTO | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>({ name: '', email: '', role: 'ADMIN', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setForm(user ? { name: user.name, email: user.email, role: user.role, password: '' } : { name: '', email: '', role: 'ADMIN', password: randomPassword() });
      setErrors({});
      setError(null);
    }
  }

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setError(null);
    try {
      if (user) {
        await adminApi.updateUser(user.id, { name: form.name, email: form.email, role: form.role });
        toast('Usuário atualizado.');
      } else {
        await adminApi.createUser(form);
        toast('Usuário criado. Envie a senha inicial por um canal seguro.');
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={user ? 'Editar usuário' : 'Novo usuário'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="user-form" icon="check" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={save} className="space-y-4" noValidate>
        <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required />
        <Input label="E-mail (login)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} required />
        <Select label="Perfil" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })} error={errors.role}>
          {STAFF_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
        {form.role === 'SUPER_ADMIN' && (
          <Notice tone="warning">Super Administrador tem acesso total, inclusive usuários, logs e configurações do sistema.</Notice>
        )}
        {!user && (
          <div>
            <Input
              label="Senha inicial"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              error={errors.password}
              hint="Mínimo de 10 caracteres, com letras e números. Peça para trocar no primeiro acesso."
              autoComplete="off"
            />
            <button type="button" onClick={() => setForm({ ...form, password: randomPassword() })} className="mt-1 text-xs font-semibold text-rose-deep hover:underline">
              Gerar outra senha
            </button>
          </div>
        )}
        {error && !Object.keys(errors).length && <Notice tone="danger">{error}</Notice>}
      </form>
    </Dialog>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const { confirm, confirmElement } = useConfirm();
  const { data, loading, error, retry } = useAsync((signal) => adminApi.users(signal), []);
  const [editing, setEditing] = useState<{ user: UserDTO | null } | null>(null);
  const [tempPassword, setTempPassword] = useState<{ name: string; password: string } | null>(null);

  useEffect(() => {
    document.title = 'Usuários | Super Admin';
  }, []);

  const act = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast(success);
      retry();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const toggleActive = async (u: UserDTO) => {
    if (u.active) {
      const ok = await confirm({
        title: 'Desativar usuário',
        message: `${u.name} perderá o acesso ao painel imediatamente. Você pode reativar depois.`,
        confirmLabel: 'Desativar',
        danger: true,
      });
      if (!ok) return;
    }
    act(() => adminApi.updateUser(u.id, { active: !u.active }), u.active ? 'Usuário desativado.' : 'Usuário reativado.');
  };

  const resetPassword = async (u: UserDTO) => {
    const ok = await confirm({
      title: 'Resetar senha',
      message: `Uma senha provisória será gerada para ${u.name} e as sessões abertas serão encerradas.`,
      confirmLabel: 'Gerar senha provisória',
    });
    if (!ok) return;
    try {
      const { temporaryPassword } = await adminApi.resetUserPassword(u.id);
      setTempPassword({ name: u.name, password: temporaryPassword });
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const remove = async (u: UserDTO) => {
    const ok = await confirm({
      title: 'Excluir usuário',
      message: (
        <>
          <p>Você realmente deseja excluir {u.name}?</p>
          <p className="mt-2 font-semibold text-red-700">Esta ação não poderá ser desfeita.</p>
          <p className="mt-2 text-sm text-muted">O histórico de logs continua registrado. Para só bloquear o acesso, prefira desativar.</p>
        </>
      ),
      confirmLabel: 'Excluir definitivamente',
      danger: true,
    });
    if (ok) act(() => adminApi.deleteUser(u.id), 'Usuário excluído.');
  };

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Quem acessa o painel e com qual perfil."
        actions={
          <Button icon="plus" onClick={() => setEditing({ user: null })}>
            Novo usuário
          </Button>
        }
      />

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={retry} />
      ) : (
        <ul className="divide-y divide-line/70 overflow-hidden rounded-2xl border border-line bg-white">
          {data?.map((u) => {
            const self = u.id === me?.id;
            return (
              <li key={u.id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {u.name} {self && <span className="text-xs font-normal text-muted">(você)</span>}
                  </p>
                  <p className="truncate text-sm text-muted">{u.email}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge tone={u.role === 'SUPER_ADMIN' ? 'rose' : 'muted'}>{u.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN'} · {ROLE_LABELS[u.role]}</Badge>
                    {u.active ? <Badge tone="success">Ativo</Badge> : <Badge tone="danger">Inativo</Badge>}
                    <span className="text-xs text-muted">
                      Último acesso: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'nunca'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button variant="outline" icon="edit" onClick={() => setEditing({ user: u })}>
                    Editar
                  </Button>
                  {!self && (
                    <>
                      <Button variant="ghost" onClick={() => toggleActive(u)}>
                        {u.active ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button variant="ghost" icon="lock" onClick={() => resetPassword(u)}>
                        Resetar senha
                      </Button>
                      <button
                        type="button"
                        onClick={() => remove(u)}
                        className="rounded-full p-2.5 text-muted hover:bg-red-50 hover:text-red-700"
                        aria-label={`Excluir ${u.name}`}
                      >
                        <Icon name="trash" size={18} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <UserFormDialog
        open={!!editing}
        user={editing?.user ?? null}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          retry();
        }}
      />

      <Dialog
        open={!!tempPassword}
        onClose={() => setTempPassword(null)}
        title="Senha provisória"
        footer={<Button onClick={() => setTempPassword(null)}>Pronto</Button>}
      >
        <p className="text-sm text-ink/80">
          Nova senha de <strong>{tempPassword?.name}</strong>. Ela <strong>não será exibida novamente</strong> — envie por um canal seguro e peça para
          trocar no primeiro acesso.
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
          <code className="font-mono text-lg tracking-wider">{tempPassword?.password}</code>
          <button
            type="button"
            onClick={() => tempPassword && navigator.clipboard?.writeText(tempPassword.password).then(() => toast('Senha copiada.'))}
            className="rounded-full p-2 text-muted hover:bg-sand hover:text-ink"
            aria-label="Copiar senha"
          >
            <Icon name="copy" size={18} />
          </button>
        </div>
      </Dialog>
      {confirmElement}
    </>
  );
}

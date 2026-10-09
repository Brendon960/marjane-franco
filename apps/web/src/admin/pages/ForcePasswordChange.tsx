import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { ApiError } from '../../services/api';
import { adminApi } from '../api';
import { useAuth } from '../auth';
import { Input, Notice } from '../ui';

/**
 * Troca obrigatória da senha provisória (criação da conta ou redefinição pelo Super Admin).
 * Usa o mesmo endpoint e o mesmo hash (Argon2id) de "Minha conta"; enquanto não trocar,
 * a API recusa todas as outras funções do painel.
 */
export function ForcePasswordChange() {
  const { user, refresh, logout } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = 'Trocar senha | Painel';
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setError(null);
    if (form.newPassword !== form.confirm) {
      setErrors({ confirm: 'As senhas não conferem.' });
      return;
    }
    setSaving(true);
    try {
      await adminApi.changePassword(form.currentPassword, form.newPassword);
      await refresh();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-linear-to-br from-cream via-sand/60 to-nude/50 px-4 py-10">
      <form onSubmit={submit} noValidate className="w-full max-w-md space-y-5 rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8">
        <div>
          <span className="grid size-12 place-items-center rounded-full bg-rose/15 text-rose-deep">
            <Icon name="lock" size={22} />
          </span>
          <h1 className="mt-4 text-3xl font-medium">Trocar senha</h1>
          <p className="mt-1 text-sm text-muted">
            Olá, {user?.name}. Você entrou com uma senha provisória. Crie uma senha pessoal para continuar.
          </p>
        </div>

        <Input
          label="Senha provisória"
          type="password"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          error={errors.currentPassword}
          autoFocus
        />
        <Input
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          error={errors.newPassword}
          hint="Mínimo de 10 caracteres, com letras e números. Precisa ser diferente da provisória."
        />
        <Input
          label="Repita a nova senha"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          error={errors.confirm}
        />
        {error && !Object.keys(errors).length && <Notice tone="danger">{error}</Notice>}

        <Button type="submit" size="lg" className="w-full" icon="check" disabled={saving || !form.currentPassword || !form.newPassword}>
          {saving ? 'Salvando…' : 'Salvar nova senha'}
        </Button>
        <button type="button" onClick={logout} className="w-full text-center text-sm text-muted hover:text-rose-deep">
          Sair
        </button>
      </form>
    </div>
  );
}

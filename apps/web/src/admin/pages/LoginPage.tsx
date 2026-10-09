import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { ApiError } from '../../services/api';
import { useAuth } from '../auth';
import { Input, Notice } from '../ui';

/** Só aceita voltar para páginas do próprio painel (evita redirecionamento para fora). */
function safeNext(next: string | null) {
  return next && /^\/(admin|super-admin)(\/|$)/.test(next) && !next.startsWith('/admin/login') ? next : '/admin';
}

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Entrar | Painel Dra. Marjane Franco';
  }, []);

  if (!loading && user) return <Navigate to={safeNext(params.get('next'))} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Informe e-mail e senha.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(safeNext(params.get('next')), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar. Tente novamente.');
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-linear-to-br from-cream via-sand/60 to-nude/50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Link to="/" className="font-serif text-3xl">
            <span className="text-rose-deep italic">Dra.</span> Marjane Franco
          </Link>
          <p className="mt-1 text-xs font-semibold tracking-[0.22em] text-gold uppercase">Painel administrativo</p>
        </div>

        <form onSubmit={submit} noValidate className="mt-8 space-y-5 rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8">
          <div>
            <h1 className="text-3xl font-medium">Entrar</h1>
            <p className="mt-1 text-sm text-muted">Acesso restrito à equipe da clínica.</p>
          </div>

          {error && <Notice tone="danger">{error}</Notice>}

          <Input
            label="E-mail"
            type="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <div className="relative">
            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 bottom-2.5 rounded-md px-1.5 py-1 text-xs font-semibold text-muted hover:text-rose-deep"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={submitting} icon="lock">
            {submitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <Icon name="shield" size={14} /> Conexão protegida · sessão expira após inatividade
        </p>
      </div>
    </div>
  );
}

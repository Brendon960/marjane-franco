import { can, type Permission, type SessionUserDTO, type StaffRole } from '@mf/shared';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ApiError } from '../services/api';
import { UNAUTHORIZED_EVENT, adminApi } from './api';
import { ForcePasswordChange } from './pages/ForcePasswordChange';

interface AuthState {
  user: SessionUserDTO | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionUserDTO>;
  logout: () => Promise<void>;
  /** Recarrega o usuário da sessão (ex.: depois de trocar a senha provisória) */
  refresh: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

// Mantém a sessão entre /admin e /super-admin sem piscar a tela de carregamento.
let cachedUser: SessionUserDTO | null | undefined;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUserDTO | null>(cachedUser ?? null);
  const [loading, setLoading] = useState(cachedUser === undefined);

  const update = useCallback((next: SessionUserDTO | null) => {
    cachedUser = next;
    setUser(next);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    adminApi.me(controller.signal).then(
      (me) => update(me),
      (error: unknown) => {
        if ((error as Error).name === 'AbortError') return;
        if (error instanceof ApiError && error.status === 401) update(null);
      },
    ).finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [update]);

  // Qualquer chamada que receba 401 (sessão expirada) derruba o usuário
  useEffect(() => {
    const onUnauthorized = () => update(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [update]);

  const login = useCallback(
    async (email: string, password: string) => {
      const me = await adminApi.login(email, password);
      update(me);
      return me;
    },
    [update],
  );

  const refresh = useCallback(async () => {
    update(await adminApi.me());
  }, [update]);

  const logout = useCallback(async () => {
    await adminApi.logout().catch(() => undefined);
    update(null);
  }, [update]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh, can: (p) => can(user?.role, p) }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}

/**
 * Protege as telas do painel. É só conveniência de navegação:
 * quem garante o acesso é a API, que confere a permissão em cada chamada.
 */
export function RequireRole({ roles, children }: { roles: readonly StaffRole[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-cream">
        <span className="size-8 animate-spin rounded-full border-2 border-rose/30 border-t-rose-deep" aria-label="Carregando" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  // M4: senha provisória — nenhuma tela do painel até trocar (a API também bloqueia)
  if (user.mustChangePassword) return <ForcePasswordChange />;
  if (!roles.includes(user.role)) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

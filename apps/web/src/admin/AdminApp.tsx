import { useEffect, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { AdminLayout } from './AdminLayout';
import { AuthProvider, RequireRole } from './auth';
import LoginPage from './pages/LoginPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AgendaPage = lazy(() => import('./pages/AgendaPage'));
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'));
const ProceduresPage = lazy(() => import('./pages/ProceduresPage'));
const PhotosPage = lazy(() => import('./pages/PhotosPage'));
const HoursPage = lazy(() => import('./pages/HoursPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SystemOverviewPage = lazy(() => import('./pages/super/SystemOverviewPage'));
const UsersPage = lazy(() => import('./pages/super/UsersPage'));
const LogsPage = lazy(() => import('./pages/super/LogsPage'));
const SystemSettingsPage = lazy(() => import('./pages/super/SystemSettingsPage'));

/** Painel não deve aparecer no Google. */
function useNoIndex() {
  useEffect(() => {
    const meta = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex, nofollow' });
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

/**
 * Painel administrativo (carregado sob demanda — não pesa no site público).
 * /admin/*        → ADMIN e SUPER_ADMIN (operação da clínica)
 * /super-admin/*  → somente SUPER_ADMIN
 */
export default function AdminApp({ area }: { area: 'admin' | 'super-admin' }) {
  useNoIndex();

  return (
    <AuthProvider>
      {area === 'admin' ? (
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route
            element={
              <RequireRole roles={['ADMIN', 'SUPER_ADMIN']}>
                <AdminLayout />
              </RequireRole>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="agendamentos" element={<AppointmentsPage />} />
            <Route path="clientes" element={<ClientsPage />} />
            <Route path="clientes/:id" element={<ClientDetailPage />} />
            <Route path="procedimentos" element={<ProceduresPage />} />
            <Route path="fotos" element={<PhotosPage />} />
            <Route path="horarios" element={<HoursPage />} />
            <Route path="configuracoes" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Routes>
      ) : (
        <Routes>
          <Route
            element={
              <RequireRole roles={['SUPER_ADMIN']}>
                <AdminLayout />
              </RequireRole>
            }
          >
            <Route index element={<SystemOverviewPage />} />
            <Route path="usuarios" element={<UsersPage />} />
            <Route path="logs" element={<LogsPage />} />
            <Route path="sistema" element={<SystemSettingsPage />} />
            <Route path="*" element={<Navigate to="/super-admin" replace />} />
          </Route>
        </Routes>
      )}
    </AuthProvider>
  );
}

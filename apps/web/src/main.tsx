import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { Layout } from './components/layout/Layout';
import HomePage from './pages/HomePage';
import './styles.css';

// A landing carrega primeiro; as demais páginas são baixadas só quando acessadas.
const BookingPage = lazy(() => import('./pages/BookingPage'));
const ProcedurePage = lazy(() => import('./pages/ProcedurePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PrivacyPage = lazy(() => import('./pages/LegalPage').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/LegalPage').then((m) => ({ default: m.TermsPage })));
const ManageBookingPage = lazy(() => import('./pages/ManageBookingPage'));
// Painel administrativo: pacote separado, baixado só por quem acessa /admin
const AdminApp = lazy(() => import('./admin/AdminApp'));

const adminFallback = <div className="min-h-dvh bg-cream" />;

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/agendar', element: <BookingPage /> },
      { path: '/procedimentos/:slug', element: <ProcedurePage /> },
      { path: '/privacidade', element: <PrivacyPage /> },
      { path: '/termos', element: <TermsPage /> },
      { path: '/agendamento/:token', element: <ManageBookingPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/admin/*',
    element: (
      <Suspense fallback={adminFallback}>
        <AdminApp area="admin" />
      </Suspense>
    ),
  },
  {
    path: '/super-admin/*',
    element: (
      <Suspense fallback={adminFallback}>
        <AdminApp area="super-admin" />
      </Suspense>
    ),
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

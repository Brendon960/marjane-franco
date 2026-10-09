import { ROLE_LABELS, type Permission } from '@mf/shared';
import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Icon, type IconName } from '../components/ui/Icon';
import { cn } from '../lib/format';
import { useAuth } from './auth';
import { Loading, ToastProvider } from './ui';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  permission: Permission;
  end?: boolean;
}

const CLINIC_NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: 'grid', permission: 'dashboard:view', end: true },
  { to: '/admin/agenda', label: 'Agenda', icon: 'calendar', permission: 'agenda:manage' },
  { to: '/admin/agendamentos', label: 'Agendamentos', icon: 'list', permission: 'agenda:manage' },
  { to: '/admin/clientes', label: 'Clientes', icon: 'users', permission: 'clients:manage' },
  { to: '/admin/procedimentos', label: 'Procedimentos', icon: 'sparkles', permission: 'procedures:manage' },
  { to: '/admin/fotos', label: 'Fotos', icon: 'image', permission: 'procedures:manage' },
  { to: '/admin/horarios', label: 'Horários', icon: 'clock', permission: 'schedule:manage' },
  { to: '/admin/configuracoes', label: 'Configurações', icon: 'settings', permission: 'settings:manage' },
];

const SUPER_NAV: NavItem[] = [
  { to: '/super-admin', label: 'Visão geral', icon: 'server', permission: 'system:manage', end: true },
  { to: '/super-admin/usuarios', label: 'Usuários', icon: 'shield', permission: 'users:manage' },
  { to: '/super-admin/logs', label: 'Logs', icon: 'file', permission: 'logs:view' },
  { to: '/super-admin/sistema', label: 'Configurações do Sistema', icon: 'lock', permission: 'system:manage' },
];

function NavGroup({ title, items, onNavigate }: { title?: string; items: NavItem[]; onNavigate: () => void }) {
  const { can } = useAuth();
  const visible = items.filter((i) => can(i.permission));
  if (!visible.length) return null;
  return (
    <div>
      {title && <p className="mb-2 px-3 text-[0.7rem] font-semibold tracking-[0.18em] text-gold uppercase">{title}</p>}
      <ul className="space-y-0.5">
        {visible.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive ? 'bg-rose-deep text-white shadow-soft' : 'text-ink/75 hover:bg-white hover:text-ink',
                )
              }
            >
              <Icon name={item.icon} size={19} />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col">
      <Link to="/admin" onClick={onNavigate} className="block px-3 pt-1 pb-6">
        <span className="font-serif text-2xl leading-none">
          <span className="text-rose-deep italic">Dra.</span> Marjane Franco
        </span>
        <span className="mt-1 block text-[0.7rem] font-semibold tracking-[0.2em] text-gold uppercase">Painel</span>
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto" aria-label="Menu do painel">
        <NavGroup items={CLINIC_NAV} onNavigate={onNavigate} />
        <NavGroup title="Super Admin" items={SUPER_NAV} onNavigate={onNavigate} />
      </nav>

      <div className="mt-6 space-y-1 border-t border-line pt-4">
        <div className="flex items-center gap-3 px-3 py-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-rose/15 font-serif text-lg text-rose-deep">
            {user?.name.replace(/^dra?\.?\s*/i, '')[0]?.toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{user?.name}</span>
            <span className="block text-xs text-muted">{user && ROLE_LABELS[user.role]}</span>
          </span>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink/75 hover:bg-white hover:text-ink">
          <Icon name="external" size={18} /> Ver o site
        </a>
        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate('/admin/login', { replace: true });
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink/75 hover:bg-white hover:text-red-700"
        >
          <Icon name="logout" size={18} /> Sair
        </button>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-[#f7f2ed]">
        {/* Desktop */}
        <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-sand/60 px-4 py-6 lg:block">
          <Sidebar onNavigate={() => undefined} />
        </aside>

        {/* Celular: barra superior + menu lateral */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-cream/90 px-4 py-3 backdrop-blur lg:hidden">
          <Link to="/admin" className="font-serif text-xl">
            <span className="text-rose-deep italic">Dra.</span> Marjane
          </Link>
          <button type="button" onClick={() => setOpen(true)} className="rounded-full p-2 hover:bg-sand" aria-label="Abrir menu" aria-expanded={open}>
            <Icon name="menu" size={24} />
          </button>
        </header>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <button type="button" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-label="Fechar menu" />
            <div className="absolute inset-y-0 left-0 w-[min(18rem,85vw)] animate-fade-up bg-cream px-4 py-5 shadow-lift">
              <button type="button" onClick={() => setOpen(false)} className="absolute top-4 right-3 rounded-full p-2 hover:bg-sand" aria-label="Fechar menu">
                <Icon name="close" size={20} />
              </button>
              <Sidebar onNavigate={() => setOpen(false)} />
            </div>
          </div>
        )}

        <main className="px-4 py-6 sm:px-6 sm:py-8 lg:ml-64 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-6xl">
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}

/** Mensagem pronta para conversar com a cliente pelo WhatsApp. */
export function clientWhatsappUrl(phone: string, message?: string) {
  return `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

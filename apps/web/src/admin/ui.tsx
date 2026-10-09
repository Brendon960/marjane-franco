/** Peças visuais do painel — mesma paleta e tipografia do site. */
import { APPOINTMENT_STATUS_LABELS, type AppointmentStatus } from '@mf/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Button } from '../components/ui/Button';
import { Icon, type IconName } from '../components/ui/Icon';
import { cn } from '../lib/format';

// ---------------------------------------------------------------------------
// Estrutura de página
// ---------------------------------------------------------------------------

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-medium sm:text-4xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgb(59_47_43/0.04)] sm:p-6', className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-sans text-base font-semibold text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, tone = 'default', icon }: { label: string; value: number | string; tone?: 'default' | 'success' | 'warning' | 'muted'; icon: IconName }) {
  const tones = {
    default: 'bg-rose/12 text-rose-deep',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    muted: 'bg-sand text-muted',
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 sm:p-5">
      <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', tones[tone])}>
        <Icon name={icon} size={20} />
      </span>
      <div>
        <p className="text-3xl leading-none font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800 ring-amber-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 ring-red-200',
  EXPIRED: 'bg-stone-100 text-stone-600 ring-stone-200',
  COMPLETED: 'bg-sky-50 text-sky-800 ring-sky-200',
  NO_SHOW: 'bg-stone-100 text-stone-700 ring-stone-300',
};

export function StatusBadge({ status, short }: { status: AppointmentStatus; short?: boolean }) {
  const label = short && status === 'PENDING' ? 'Pendente' : short && status === 'EXPIRED' ? 'Expirada' : APPOINTMENT_STATUS_LABELS[status];
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap', STATUS_STYLES[status])}>
      {label}
    </span>
  );
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'success' | 'danger' | 'rose' }) {
  const tones = {
    muted: 'bg-sand text-muted ring-line',
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    danger: 'bg-red-50 text-red-700 ring-red-200',
    rose: 'bg-rose/10 text-rose-deep ring-rose/30',
  };
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', tones[tone])}>{children}</span>;
}

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-muted" role="status">
      <span className="size-5 animate-spin rounded-full border-2 border-rose/30 border-t-rose-deep" />
      {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center" role="alert">
      <Icon name="alert" className="text-red-600" />
      <p className="text-sm text-red-800">{error.message}</p>
      {onRetry && (
        <Button variant="outline" icon="refresh" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}

export function Empty({ icon = 'info', children }: { icon?: IconName; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted">
      <Icon name={icon} size={26} className="text-rose/70" />
      {children}
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'danger' | 'success'; children: ReactNode }) {
  const tones = {
    info: 'border-line bg-sand/60 text-ink/80',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  };
  return (
    <div className={cn('flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm', tones[tone])} role={tone === 'danger' ? 'alert' : undefined}>
      <Icon name={tone === 'success' ? 'check' : tone === 'info' ? 'info' : 'alert'} size={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulários
// ---------------------------------------------------------------------------

interface FieldShellProps {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: (id: string, describedBy?: string) => ReactNode;
}

function FieldShell({ label, error, hint, className, children }: FieldShellProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type FieldBase = { label: ReactNode; error?: string; hint?: ReactNode; className?: string };

export function Input({ label, error, hint, className, ...props }: FieldBase & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={className}>
      {(id, describedBy) => (
        <input id={id} aria-invalid={!!error} aria-describedby={describedBy} {...props} className={cn('field py-2.5', error && 'border-red-400')} />
      )}
    </FieldShell>
  );
}

export function Textarea({ label, error, hint, className, ...props }: FieldBase & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={className}>
      {(id, describedBy) => (
        <textarea id={id} aria-invalid={!!error} aria-describedby={describedBy} {...props} className={cn('field py-2.5', error && 'border-red-400')} />
      )}
    </FieldShell>
  );
}

export function Select({ label, error, hint, className, children, ...props }: FieldBase & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={className}>
      {(id, describedBy) => (
        <select id={id} aria-invalid={!!error} aria-describedby={describedBy} {...props} className={cn('field py-2.5', error && 'border-red-400')}>
          {children}
        </select>
      )}
    </FieldShell>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn('flex cursor-pointer items-start justify-between gap-4', disabled && 'cursor-not-allowed opacity-60')}>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-stone-300 transition peer-checked:bg-rose-deep peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-rose-deep" />
        <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="field py-2.5 pl-10"
      />
    </div>
  );
}

export function Pagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="mt-5 flex items-center justify-between gap-3 text-sm" aria-label="Paginação">
      <span className="text-muted">
        Página {page} de {pages} · {total} registros
      </span>
      <div className="flex gap-2">
        <Button variant="outline" icon="chevronLeft" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Anterior
        </Button>
        <Button variant="outline" iconRight="chevronRight" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Próxima
        </Button>
      </div>
    </nav>
  );
}

/** Valor que só muda depois de a pessoa parar de digitar. */
export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ---------------------------------------------------------------------------
// Diálogos
// ---------------------------------------------------------------------------

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

/** Modal acessível (<dialog> nativo: foco preso, Esc fecha). */
export function Dialog({ open, onClose, title, children, footer, size = 'md' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        'm-auto w-[calc(100%-1.5rem)] rounded-3xl bg-cream p-0 text-ink shadow-lift backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]',
        size === 'lg' ? 'max-w-2xl' : 'max-w-lg',
      )}
    >
      {open && (
        <div className="flex max-h-[min(90dvh,52rem)] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <h2 id={titleId} className="text-2xl font-medium">
              {title}
            </h2>
            <button type="button" onClick={onClose} className="-mr-2 rounded-full p-2 text-muted hover:bg-sand hover:text-ink" aria-label="Fechar">
              <Icon name="close" size={20} />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer && <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
}

/** Confirmação antes de ações destrutivas: `if (await confirm({...})) ...` */
export function useConfirm() {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ ...options, resolve })), []);

  const close = (ok: boolean) => {
    state?.resolve(ok);
    setState(null);
  };

  const element = (
    <Dialog
      open={!!state}
      onClose={() => close(false)}
      title={state?.title ?? ''}
      footer={
        <>
          <Button variant="outline" onClick={() => close(false)}>
            {state?.cancelLabel ?? 'Cancelar'}
          </Button>
          <button
            type="button"
            onClick={() => close(true)}
            className={cn(
              'inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-white transition',
              state?.danger ? 'bg-red-700 hover:bg-red-800' : 'bg-rose-deep hover:bg-rose-darker',
            )}
          >
            {state?.confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-ink/80">{state?.message}</div>
    </Dialog>
  );

  return { confirm, confirmElement: element };
}

// ---------------------------------------------------------------------------
// Avisos rápidos (toast)
// ---------------------------------------------------------------------------

type Toast = { id: number; message: string; tone: 'success' | 'error' | 'warning' };
const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const layer = useRef<HTMLDivElement>(null);

  // Os avisos ficam na "camada do topo" (popover) para aparecer por cima de diálogos abertos
  useEffect(() => {
    const el = layer.current;
    if (!el?.showPopover) return;
    try {
      if (el.matches(':popover-open')) el.hidePopover();
      if (toasts.length) el.showPopover();
    } catch {
      // navegador sem suporte a popover: o aviso aparece normalmente (abaixo de diálogos)
    }
  }, [toasts]);

  const show = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'success' ? 3500 : 7000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        ref={layer}
        popover="manual"
        className="pointer-events-none fixed inset-x-3 top-auto bottom-4 z-[60] m-0 flex flex-col items-center gap-2 overflow-visible border-0 bg-transparent p-0 sm:right-6 sm:left-auto sm:items-end"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex max-w-sm animate-fade-up items-start gap-2.5 rounded-2xl px-4 py-3 text-sm text-white shadow-lift',
              t.tone === 'success' ? 'bg-ink' : t.tone === 'warning' ? 'bg-amber-700' : 'bg-red-700',
            )}
          >
            <Icon name={t.tone === 'success' ? 'check' : 'alert'} size={18} className="mt-0.5 shrink-0" />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/** Primeiro nome para saudações ("Dra. Marjane" continua "Dra. Marjane"). */
export function greetingName(name: string): string {
  const parts = name.split(' ');
  return /^(dra?|sr|sra)\.?$/i.test(parts[0] ?? '') ? parts.slice(0, 2).join(' ') : (parts[0] ?? name);
}

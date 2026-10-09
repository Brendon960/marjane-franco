import {
  APPOINTMENT_STATUS_LABELS,
  addDays,
  formatDateBR,
  minutesToTime,
  timeToMinutes,
  toBusinessDate,
  type AdminAppointmentDTO,
  type AgendaDayDTO,
  type AppointmentStatus,
} from '@mf/shared';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { useAsync } from '../../hooks/useAsync';
import { cn, formatLongDate } from '../../lib/format';
import { adminApi } from '../api';
import { AppointmentDialog, NewAppointmentDialog } from '../components/AppointmentDialogs';
import { CancellationEmailIndicator, ConfirmationEmailIndicator, useConfirmAppointment } from '../components/AppointmentConfirmation';
import { BulkCancelDialog } from '../components/BulkCancelDialog';
import { ErrorState, Loading, PageHeader, StatusBadge } from '../ui';

type Segment =
  | { kind: 'appointment'; start: number; end: number; appointment: AdminAppointmentDTO }
  | { kind: 'block'; start: number; end: number; reason: string | null }
  | { kind: 'free'; start: number; end: number }
  | { kind: 'break'; start: number; end: number };

type Period = '' | 'manha' | 'tarde' | 'noite';
interface Filters {
  status: '' | AppointmentStatus;
  procedureId: string;
  period: Period;
}
const NO_FILTERS: Filters = { status: '', procedureId: '', period: '' };

const PERIODS: { id: Period; label: string; from: number; to: number }[] = [
  { id: '', label: 'Dia todo', from: 0, to: 1440 },
  { id: 'manha', label: 'Manhã (até 12h)', from: 0, to: 720 },
  { id: 'tarde', label: 'Tarde (12h às 18h)', from: 720, to: 1080 },
  { id: 'noite', label: 'Noite (após 18h)', from: 1080, to: 1440 },
];

const toMin = (t: string) => (t === '24:00' ? 1440 : timeToMinutes(t));
const label = (m: number) => (m >= 1440 ? '24:00' : minutesToTime(m));

/** Pode ser cancelado (em massa ou individualmente). */
const isActive = (a: AdminAppointmentDTO) => a.status === 'PENDING' || a.status === 'CONFIRMED';

function matches(a: AdminAppointmentDTO, f: Filters) {
  if (f.status ? a.status !== f.status : a.status === 'EXPIRED') return false;
  if (f.procedureId && a.procedure.id !== f.procedureId) return false;
  const period = PERIODS.find((p) => p.id === f.period)!;
  const start = toMin(a.time);
  return start >= period.from && start < period.to;
}

/** Tira de [start, end) os trechos ocupados. */
function subtract(start: number, end: number, busy: { start: number; end: number }[]) {
  let free = [{ start, end }];
  for (const b of busy) {
    free = free.flatMap((f) =>
      b.end <= f.start || b.start >= f.end
        ? [f]
        : [
            ...(b.start > f.start ? [{ start: f.start, end: b.start }] : []),
            ...(b.end < f.end ? [{ start: b.end, end: f.end }] : []),
          ],
    );
  }
  return free.filter((f) => f.end - f.start >= 5);
}

/** Monta a linha do tempo do dia: atendimentos, bloqueios, horários livres e intervalos. */
function buildTimeline(day: AgendaDayDTO): Segment[] {
  const appointments = day.appointments.filter((a) => a.status !== 'CANCELLED' && a.status !== 'EXPIRED');
  const busy: Segment[] = [
    ...appointments.map((a) => ({ kind: 'appointment' as const, start: toMin(a.time), end: toMin(a.endTime), appointment: a })),
    ...day.blocks.map((b) => ({ kind: 'block' as const, start: toMin(b.start), end: toMin(b.end), reason: b.reason })),
  ];
  const intervals = [...day.intervals].map((i) => ({ start: toMin(i.start), end: toMin(i.end) })).sort((a, b) => a.start - b.start);

  const free = intervals.flatMap((i) => subtract(i.start, i.end, busy).map((f) => ({ kind: 'free' as const, ...f })));
  const breaks = intervals.slice(1).flatMap((i, idx) => subtract(intervals[idx]!.end, i.start, busy).map((f) => ({ kind: 'break' as const, ...f })));

  return [...busy, ...free, ...breaks].sort((a, b) => a.start - b.start || (a.kind === 'appointment' ? -1 : 1));
}

export default function AgendaPage() {
  const [params, setParams] = useSearchParams();
  const today = toBusinessDate(new Date());
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get('data') ?? '') ? params.get('data')! : today;
  const setDate = (d: string) => setParams(d === today ? {} : { data: d }, { replace: true });

  const { data, loading, error, retry } = useAsync((signal) => adminApi.agenda(date, signal), [date]);
  const procedures = useAsync((signal) => adminApi.procedures(signal), []);
  const [selected, setSelected] = useState<AdminAppointmentDTO | null>(null);
  const [newAt, setNewAt] = useState<{ time?: string } | null>(null);
  const { confirmAppointment, busyId } = useConfirmAppointment();

  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<{ appointments: AdminAppointmentDTO[]; wholeDay: string | null } | null>(null);

  useEffect(() => {
    document.title = `Agenda ${formatDateBR(date)} | Painel`;
  }, [date]);

  // Troca de dia limpa a seleção; ao recarregar, mantém só o que continua cancelável
  useEffect(() => setChecked(new Set()), [date]);
  useEffect(() => {
    if (!data) return;
    const activeIds = new Set(data.appointments.filter(isActive).map((a) => a.id));
    setChecked((prev) => new Set([...prev].filter((id) => activeIds.has(id))));
  }, [data]);

  const current = data && data.date === date ? data : null;
  const filtering = filters.status !== '' || filters.procedureId !== '' || filters.period !== '';
  const timeline = useMemo(() => (current ? buildTimeline(current) : []), [current]);
  const filtered = useMemo(() => current?.appointments.filter((a) => matches(a, filters)) ?? [], [current, filters]);

  const cancelled = current?.appointments.filter((a) => a.status === 'CANCELLED') ?? [];
  const activeOfDay = current?.appointments.filter(isActive) ?? [];
  const activeCount = current?.appointments.filter((a) => a.status !== 'CANCELLED' && a.status !== 'EXPIRED').length ?? 0;
  const fullDayBlock = current?.blocks.find((b) => b.start === '00:00' && b.end === '24:00');

  // "Selecionar todos" = todos os canceláveis VISÍVEIS (respeita os filtros)
  const visibleSelectable = (filtering ? filtered : timeline.flatMap((s) => (s.kind === 'appointment' ? [s.appointment] : []))).filter(isActive);
  const allChecked = visibleSelectable.length > 0 && visibleSelectable.every((a) => checked.has(a.id));
  const someChecked = visibleSelectable.some((a) => checked.has(a.id));
  const selectedAppointments = activeOfDay.filter((a) => checked.has(a.id));

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setChecked((prev) => {
      const next = new Set(prev);
      for (const a of visibleSelectable) {
        if (allChecked) next.delete(a.id);
        else next.add(a.id);
      }
      return next;
    });

  const procedureOptions = procedures.data ?? [];

  return (
    <>
      <PageHeader
        title="Minha Agenda"
        description="Toque em um atendimento para confirmar, alterar o horário ou cancelar."
        actions={
          <Button icon="plus" onClick={() => setNewAt({})}>
            Novo agendamento
          </Button>
        }
      />

      <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setDate(addDays(date, -1))} className="rounded-full p-2.5 hover:bg-sand" aria-label="Dia anterior">
            <Icon name="chevronLeft" />
          </button>
          <div className="min-w-0 flex-1 text-center sm:min-w-56">
            <p className="font-serif text-2xl leading-tight first-letter:uppercase">{formatLongDate(date)}</p>
            <p className="text-xs text-muted">
              {formatDateBR(date)} · {activeCount} {activeCount === 1 ? 'agendamento' : 'agendamentos'}
            </p>
          </div>
          <button type="button" onClick={() => setDate(addDays(date, 1))} className="rounded-full p-2.5 hover:bg-sand" aria-label="Próximo dia">
            <Icon name="chevronRight" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {date !== today && (
            <Button variant="outline" onClick={() => setDate(today)}>
              Hoje
            </Button>
          )}
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="field w-auto py-2"
            aria-label="Ir para a data"
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-3 grid gap-2 rounded-2xl border border-line bg-white p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end sm:p-4">
        <label className="text-xs font-semibold text-muted">
          Status
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as Filters['status'] })}
            className="field mt-1 py-2 text-sm font-normal text-ink"
          >
            <option value="">Todos</option>
            {(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'] as const).map((s) => (
              <option key={s} value={s}>
                {APPOINTMENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Procedimento
          <select
            value={filters.procedureId}
            onChange={(e) => setFilters({ ...filters, procedureId: e.target.value })}
            className="field mt-1 py-2 text-sm font-normal text-ink"
          >
            <option value="">Todos</option>
            {procedureOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Período
          <select
            value={filters.period}
            onChange={(e) => setFilters({ ...filters, period: e.target.value as Period })}
            className="field mt-1 py-2 text-sm font-normal text-ink"
          >
            {PERIODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <Button variant="ghost" onClick={() => setFilters(NO_FILTERS)} disabled={!filtering}>
          Limpar filtros
        </Button>
      </div>

      {/* Seleção para cancelamento em massa */}
      {current && (visibleSelectable.length > 0 || activeOfDay.length > 0) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4.5 accent-rose-deep"
              checked={allChecked}
              ref={(el) => {
                if (el) el.indeterminate = someChecked && !allChecked;
              }}
              onChange={toggleAll}
              disabled={visibleSelectable.length === 0}
            />
            Selecionar todos
            {filtering && <span className="text-xs text-muted">(dos filtrados)</span>}
          </label>
          {activeOfDay.length > 0 && (
            <button
              type="button"
              onClick={() => setBulk({ appointments: activeOfDay, wholeDay: date })}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            >
              <Icon name="close" size={16} /> Cancelar todos os agendamentos deste dia
            </button>
          )}
        </div>
      )}

      {loading && !current ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={retry} />
      ) : current ? (
        <div className={cn('rounded-2xl border border-line bg-white p-3 sm:p-5', checked.size > 0 && 'mb-24')}>
          {fullDayBlock && (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-700">
              <Icon name="lock" size={16} /> Dia bloqueado{fullDayBlock.reason ? ` — ${fullDayBlock.reason}` : ''}
            </div>
          )}

          {filtering ? (
            // Com filtros: só os agendamentos que batem (facilita selecionar o que precisa cancelar)
            filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">Nenhum agendamento com esses filtros neste dia.</p>
            ) : (
              <ol className="space-y-2">
                {filtered.map((a) => (
                  <li key={a.id} className="flex gap-2 sm:gap-4">
                    <span className="w-11 shrink-0 pt-3 text-right text-sm font-semibold text-muted tabular-nums sm:w-14">{a.time}</span>
                    <AppointmentCard
                      a={a}
                      minutes={toMin(a.endTime) - toMin(a.time)}
                      checked={checked.has(a.id)}
                      onToggle={() => toggle(a.id)}
                      onOpen={() => setSelected(a)}
                      confirming={busyId === a.id}
                      onConfirm={async () => {
                        if (await confirmAppointment(a)) retry();
                      }}
                    />
                  </li>
                ))}
              </ol>
            )
          ) : timeline.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted">
              <p>Dia sem atendimento.</p>
              <button type="button" onClick={() => setNewAt({})} className="mt-2 font-semibold text-rose-deep hover:underline">
                Lançar um encaixe
              </button>
            </div>
          ) : (
            <ol className="space-y-2">
              {timeline.map((s, i) => (
                <li key={i} className="flex gap-2 sm:gap-4">
                  <span className="w-11 shrink-0 pt-3 text-right text-sm font-semibold text-muted tabular-nums sm:w-14">
                    {s.kind === 'block' && s.start === 0 && s.end === 1440 ? '' : label(s.start)}
                  </span>
                  {s.kind === 'appointment' ? (
                    <AppointmentCard
                      a={s.appointment}
                      minutes={s.end - s.start}
                      checked={checked.has(s.appointment.id)}
                      onToggle={() => toggle(s.appointment.id)}
                      onOpen={() => setSelected(s.appointment)}
                      confirming={busyId === s.appointment.id}
                      onConfirm={async () => {
                        if (await confirmAppointment(s.appointment)) retry();
                      }}
                    />
                  ) : s.kind === 'free' ? (
                    <button
                      type="button"
                      onClick={() => date >= today && setNewAt({ time: label(s.start) })}
                      className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-dashed border-emerald-300 px-4 py-3 text-left text-sm text-emerald-800 transition hover:bg-emerald-50"
                    >
                      <span>
                        <span className="font-semibold">Livre</span>
                        <span className="ml-2 text-emerald-700/80 tabular-nums">
                          {label(s.start)} – {label(s.end)}
                        </span>
                      </span>
                      {date >= today && (
                        <span className="flex items-center gap-1 text-xs font-semibold">
                          <Icon name="plus" size={14} /> Agendar
                        </span>
                      )}
                    </button>
                  ) : s.kind === 'break' ? (
                    <div className="flex flex-1 items-center gap-2 rounded-xl bg-sand/60 px-4 py-2.5 text-sm text-muted">
                      <Icon name="clock" size={16} /> Intervalo
                      <span className="tabular-nums">
                        {label(s.start)} – {label(s.end)}
                      </span>
                    </div>
                  ) : s.start === 0 && s.end === 1440 ? null : (
                    <div className="flex flex-1 items-center gap-2 rounded-xl bg-[repeating-linear-gradient(135deg,#f3eae2_0_8px,#efe4da_8px_16px)] px-4 py-3 text-sm text-stone-700">
                      <Icon name="lock" size={16} />
                      <span className="font-semibold">Bloqueado</span>
                      <span className="tabular-nums">
                        {label(s.start)} – {label(s.end)}
                      </span>
                      {s.reason && <span className="truncate text-muted">· {s.reason}</span>}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}

          {!filtering && cancelled.length > 0 && (
            <details className="mt-5 border-t border-line pt-4">
              <summary className="cursor-pointer text-sm font-semibold text-muted">Cancelados neste dia ({cancelled.length})</summary>
              <ul className="mt-3 space-y-2">
                {cancelled.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => setSelected(a)} className="flex w-full items-center justify-between gap-3 rounded-xl bg-red-50/50 px-4 py-2.5 text-left text-sm hover:bg-red-50">
                      <span className="min-w-0">
                        <span className="block truncate text-ink/60 line-through">
                          {a.time} · {a.client.name} — {a.procedure.name}
                        </span>
                        <CancellationEmailIndicator a={a} />
                      </span>
                      <StatusBadge status={a.status} />
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      ) : null}

      {/* Barra de ações da seleção */}
      {checked.size > 0 && (
        <div className="fixed inset-x-3 bottom-4 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-lift sm:right-6 sm:left-auto sm:min-w-[28rem] lg:left-[calc(16rem+1.5rem)]">
          <span className="text-sm">
            <strong>{checked.size}</strong> {checked.size === 1 ? 'agendamento selecionado' : 'agendamentos selecionados'}
            <button type="button" onClick={() => setChecked(new Set())} className="ml-3 text-white/70 underline hover:text-white">
              Limpar seleção
            </button>
          </span>
          <button
            type="button"
            onClick={() => setBulk({ appointments: selectedAppointments, wholeDay: null })}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-red-600 px-4 text-sm font-semibold hover:bg-red-700"
          >
            <Icon name="close" size={16} /> Cancelar agendamentos selecionados
          </button>
        </div>
      )}

      <BulkCancelDialog
        open={!!bulk}
        appointments={bulk?.appointments ?? []}
        wholeDay={bulk?.wholeDay}
        onClose={() => setBulk(null)}
        onDone={() => {
          setChecked(new Set());
          retry();
        }}
      />
      <AppointmentDialog
        appointment={selected}
        onClose={() => setSelected(null)}
        onChanged={(updated) => {
          setSelected(updated);
          retry();
        }}
      />
      <NewAppointmentDialog
        open={!!newAt}
        initialDate={date >= today ? date : today}
        initialTime={newAt?.time}
        onClose={() => setNewAt(null)}
        onCreated={(created) => {
          setNewAt(null);
          if (created.date !== date) setDate(created.date);
          else retry();
        }}
      />
    </>
  );
}

interface AppointmentCardProps {
  a: AdminAppointmentDTO;
  minutes: number;
  checked: boolean;
  onToggle: () => void;
  onOpen: () => void;
  confirming: boolean;
  onConfirm: () => void;
}

/** Card de um atendimento na agenda: seleção, dados, status e (pendente) "Confirmar agendamento". */
function AppointmentCard({ a, minutes, checked, onToggle, onOpen, confirming, onConfirm }: AppointmentCardProps) {
  const selectable = isActive(a);
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 items-stretch gap-1 rounded-xl border-l-4 shadow-[0_1px_2px_rgb(59_47_43/0.06)] transition hover:shadow-soft',
        a.status === 'CONFIRMED' && 'border-emerald-500 bg-emerald-50/60',
        a.status === 'PENDING' && 'border-amber-400 bg-amber-50/60',
        (a.status === 'COMPLETED' || a.status === 'NO_SHOW') && 'border-stone-300 bg-stone-50',
        a.status === 'CANCELLED' && 'border-red-300 bg-red-50/40',
        checked && 'ring-2 ring-red-400 ring-offset-1',
      )}
      style={{ minHeight: `${Math.min(8, Math.max(3.25, minutes / 15))}rem` }}
    >
      {selectable && (
        <label className="flex cursor-pointer items-center pl-3" title="Selecionar para cancelamento em massa">
          <input
            type="checkbox"
            className="size-4.5 accent-red-600"
            checked={checked}
            onChange={onToggle}
            aria-label={`Selecionar ${a.client.name} — ${a.procedure.name}, ${a.time}`}
          />
        </label>
      )}
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 flex-col items-start gap-1.5 rounded-r-xl px-3 py-3 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-3"
      >
        <span className="w-full min-w-0 sm:w-auto">
          <span className={cn('block truncate font-semibold', a.status === 'CANCELLED' && 'text-ink/60 line-through')}>{a.client.name}</span>
          <span className="block truncate text-sm text-ink/70">{a.procedure.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted tabular-nums">
            {a.time} – {a.endTime}
            <ConfirmationEmailIndicator a={a} />
            <CancellationEmailIndicator a={a} />
          </span>
        </span>
        <StatusBadge status={a.status} short />
      </button>
      {a.status === 'PENDING' && (
        <div className="flex items-center pr-2 sm:pr-3">
          <Button icon="check" aria-label="Confirmar agendamento" disabled={confirming} onClick={onConfirm} className="px-3.5 sm:px-5">
            <span className="hidden sm:inline">{confirming ? 'Confirmando…' : 'Confirmar agendamento'}</span>
          </Button>
        </div>
      )}
    </div>
  );
}

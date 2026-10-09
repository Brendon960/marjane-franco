import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  addDays,
  formatDateBR,
  formatPhoneBR,
  toBusinessDate,
  type AdminAppointmentDTO,
} from '@mf/shared';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useAsync } from '../../hooks/useAsync';
import { cn } from '../../lib/format';
import { adminApi } from '../api';
import { AppointmentDialog, NewAppointmentDialog } from '../components/AppointmentDialogs';
import { Empty, ErrorState, Loading, PageHeader, Pagination, SearchInput, StatusBadge, useDebounced } from '../ui';

type Period = 'upcoming' | 'today' | 'week' | 'past' | 'all';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'upcoming', label: 'Próximos' },
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Próximos 7 dias' },
  { id: 'past', label: 'Anteriores' },
  { id: 'all', label: 'Todos' },
];

function range(period: Period, today: string): { from?: string; to?: string } {
  switch (period) {
    case 'upcoming':
      return { from: today };
    case 'today':
      return { from: today, to: today };
    case 'week':
      return { from: today, to: addDays(today, 6) };
    case 'past':
      return { to: addDays(today, -1) };
    default:
      return {};
  }
}

export default function AppointmentsPage() {
  const today = toBusinessDate(new Date());
  const [period, setPeriod] = useState<Period>('upcoming');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search.trim());
  const [selected, setSelected] = useState<AdminAppointmentDTO | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    document.title = 'Agendamentos | Painel';
  }, []);
  useEffect(() => setPage(1), [period, status, debounced]);

  const { data, loading, error, retry } = useAsync(
    (signal) => adminApi.appointments({ ...range(period, today), status, search: debounced, page }, signal),
    [period, status, debounced, page],
  );

  return (
    <>
      <PageHeader
        title="Agendamentos"
        description="Busque por nome, WhatsApp, procedimento ou código."
        actions={
          <Button icon="plus" onClick={() => setCreating(true)}>
            Novo agendamento
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition',
                period === p.id ? 'border-rose-deep bg-rose-deep text-white' : 'border-line bg-white hover:border-rose',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_16rem]">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar agendamentos" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="field py-2.5" aria-label="Filtrar por status">
            <option value="">Todos os status</option>
            {APPOINTMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {APPOINTMENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={retry} />
      ) : data && data.items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white">
          <Empty icon="calendar">Nenhum agendamento encontrado.</Empty>
        </div>
      ) : data ? (
        <>
          <div className={cn('overflow-hidden rounded-2xl border border-line bg-white transition-opacity', loading && 'opacity-60')}>
            {/* Tabela no computador */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead className="border-b border-line bg-sand/40 text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Procedimento</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {data.items.map((a) => (
                  <tr key={a.id} onClick={() => setSelected(a)} className="cursor-pointer hover:bg-sand/40">
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      <button type="button" className="text-left font-semibold" onClick={() => setSelected(a)}>
                        {formatDateBR(a.date)} · {a.time}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-medium">{a.client.name}</span>
                      <span className="text-xs text-muted">{formatPhoneBR(a.client.phone)}</span>
                    </td>
                    <td className="px-4 py-3">{a.procedure.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} short />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Cartões no celular */}
            <ul className="divide-y divide-line/70 md:hidden">
              {data.items.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => setSelected(a)} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold tabular-nums">
                        {formatDateBR(a.date)} · {a.time}
                      </span>
                      <span className="block truncate">{a.client.name}</span>
                      <span className="block truncate text-xs text-muted">{a.procedure.name}</span>
                    </span>
                    <StatusBadge status={a.status} short />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </>
      ) : null}

      <AppointmentDialog
        appointment={selected}
        onClose={() => setSelected(null)}
        onChanged={(updated) => {
          setSelected(updated);
          retry();
        }}
      />
      <NewAppointmentDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          retry();
        }}
      />
    </>
  );
}

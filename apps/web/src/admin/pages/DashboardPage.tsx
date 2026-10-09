import { formatDateBR, type AdminAppointmentDTO } from '@mf/shared';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/Button';
import { useAsync } from '../../hooks/useAsync';
import { formatLongDate } from '../../lib/format';
import { adminApi } from '../api';
import { useAuth } from '../auth';
import { AppointmentDialog, NewAppointmentDialog } from '../components/AppointmentDialogs';
import { ConfirmationEmailIndicator, useConfirmAppointment } from '../components/AppointmentConfirmation';
import { Card, Empty, ErrorState, Loading, PageHeader, StatCard, StatusBadge, greetingName } from '../ui';

function AppointmentRow({
  a,
  onOpen,
  showDate,
  onConfirm,
  confirming,
}: {
  a: AdminAppointmentDTO;
  onOpen: (a: AdminAppointmentDTO) => void;
  showDate?: boolean;
  onConfirm?: (a: AdminAppointmentDTO) => void;
  confirming?: boolean;
}) {
  return (
    <li className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onOpen(a)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-sand/60 sm:gap-4"
      >
        <span className="w-14 shrink-0 text-center">
          <span className="block font-semibold tabular-nums">{a.time}</span>
          {showDate && <span className="block text-xs text-muted">{formatDateBR(a.date).slice(0, 5)}</span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{a.client.name}</span>
          <span className="block truncate text-xs text-muted">{a.procedure.name}</span>
          <ConfirmationEmailIndicator a={a} />
        </span>
        <StatusBadge status={a.status} short />
      </button>
      {onConfirm && a.status === 'PENDING' && (
        <Button icon="check" aria-label="Confirmar agendamento" disabled={confirming} onClick={() => onConfirm(a)}>
          <span className="hidden sm:inline">{confirming ? 'Confirmando…' : 'Confirmar agendamento'}</span>
        </Button>
      )}
    </li>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, retry } = useAsync((signal) => adminApi.dashboard(signal), []);
  const [selected, setSelected] = useState<AdminAppointmentDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const { confirmAppointment, busyId } = useConfirmAppointment();

  useEffect(() => {
    document.title = 'Dashboard | Painel';
  }, []);

  const refresh = () => retry();

  return (
    <>
      <PageHeader
        title={<>Olá, {user ? greetingName(user.name) : ''} 👋</>}
        description={data ? <>Hoje é {formatLongDate(data.date)}.</> : 'Resumo do dia'}
        actions={
          <>
            <Button to="/admin/agenda" variant="outline" icon="calendar">
              Ver agenda
            </Button>
            <Button icon="plus" onClick={() => setCreating(true)}>
              Novo agendamento
            </Button>
          </>
        }
      />

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={retry} />
      ) : data ? (
        <div className="space-y-6">
          <div>
            <p className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">Hoje</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Agendamentos" value={data.counts.total} icon="calendar" />
              <StatCard label="Confirmados" value={data.counts.confirmed} icon="check" tone="success" />
              <StatCard label="Pendentes" value={data.counts.pending} icon="clock" tone="warning" />
              <StatCard label="Cancelados" value={data.counts.cancelled} icon="close" tone="muted" />
            </div>
          </div>

          {data.pendingToConfirm.length > 0 && (
            <Card
              title={`Aguardando confirmação (${data.pendingToConfirm.length})`}
              className="border-amber-200 bg-amber-50/40"
            >
              <p className="-mt-2 mb-3 text-sm text-muted">Pré-reservas feitas pelo site. Confirme depois de falar com a cliente no WhatsApp.</p>
              <ul className="divide-y divide-line/60">
                {data.pendingToConfirm.map((a) => (
                  <AppointmentRow
                    key={a.id}
                    a={a}
                    onOpen={setSelected}
                    showDate
                    confirming={busyId === a.id}
                    onConfirm={async (item) => {
                      if (await confirmAppointment(item)) refresh();
                    }}
                  />
                ))}
              </ul>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Próximos atendimentos" actions={<Link to="/admin/agendamentos" className="text-sm font-semibold text-rose-deep hover:underline">Ver todos</Link>}>
              {data.upcoming.length ? (
                <ul className="divide-y divide-line/60">
                  {data.upcoming.map((a) => (
                    <AppointmentRow key={a.id} a={a} onOpen={setSelected} showDate />
                  ))}
                </ul>
              ) : (
                <Empty icon="calendar">Nenhum atendimento futuro.</Empty>
              )}
            </Card>

            <div className="space-y-6">
              <Card title="Horários ocupados hoje">
                {data.busyToday.length ? (
                  <ul className="divide-y divide-line/60">
                    {data.busyToday.map((a) => (
                      <AppointmentRow key={a.id} a={a} onOpen={setSelected} />
                    ))}
                  </ul>
                ) : (
                  <Empty icon="clock">Nenhum horário ocupado hoje.</Empty>
                )}
              </Card>

              <Card title="Horários disponíveis hoje">
                {data.freeSlotsToday.length ? (
                  <div className="flex flex-wrap gap-2">
                    {data.freeSlotsToday.map((t) => (
                      <span key={t} className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 tabular-nums ring-1 ring-emerald-200 ring-inset">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <Empty icon="clock">Sem horários livres no restante do dia.</Empty>
                )}
              </Card>
            </div>
          </div>

          <Card title="Cancelamentos recentes">
            {data.recentCancellations.length ? (
              <ul className="divide-y divide-line/60">
                {data.recentCancellations.map((a) => (
                  <AppointmentRow key={a.id} a={a} onOpen={setSelected} showDate />
                ))}
              </ul>
            ) : (
              <Empty icon="check">Nenhum cancelamento recente.</Empty>
            )}
          </Card>
        </div>
      ) : null}

      <AppointmentDialog
        appointment={selected}
        onClose={() => setSelected(null)}
        onChanged={(updated) => {
          setSelected(updated);
          refresh();
        }}
      />
      <NewAppointmentDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          refresh();
        }}
      />
    </>
  );
}

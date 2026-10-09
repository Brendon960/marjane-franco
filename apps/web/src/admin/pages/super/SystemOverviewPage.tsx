import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Link } from 'react-router';
import { useAsync } from '../../../hooks/useAsync';
import { adminApi } from '../../api';
import { Badge, Card, ErrorState, Loading, PageHeader, StatCard, useToast } from '../../ui';

function uptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}min` : `${m}min`;
}

/** Dashboard geral do responsável técnico. */
export default function SystemOverviewPage() {
  const system = useAsync((signal) => adminApi.system(signal), []);
  const logs = useAsync((signal) => adminApi.auditLogs({ page: 1 }, signal), []);
  const toast = useToast();
  const [checking, setChecking] = useState(false);

  const checkEmail = async () => {
    setChecking(true);
    try {
      const result = await adminApi.emailCheck();
      toast(result.ok ? 'Conexão de e-mail OK (nenhum e-mail foi enviado).' : `Falha na conexão de e-mail: ${result.error}`, result.ok ? 'success' : 'warning');
      system.retry();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    document.title = 'Visão geral | Super Admin';
  }, []);

  const s = system.data;

  return (
    <>
      <PageHeader title="Visão geral do sistema" description="Estado técnico, totais e atividade recente." />
      {system.loading && !s ? (
        <Loading />
      ) : system.error ? (
        <ErrorState error={system.error} onRetry={system.retry} />
      ) : s ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Usuários ativos" value={`${s.counts.activeUsers}/${s.counts.users}`} icon="shield" />
            <StatCard label="Clientes" value={s.counts.clients} icon="users" />
            <StatCard label="Agendamentos" value={s.counts.appointments} icon="calendar" />
            <StatCard label="Procedimentos" value={s.counts.procedures} icon="sparkles" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <Card title="Sistema">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Banco de dados</dt>
                  <dd>{s.database.ok ? <Badge tone="success">Online · {s.database.latencyMs} ms</Badge> : <Badge tone="danger">Fora do ar</Badge>}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">E-mail (SMTP)</dt>
                  <dd className="text-right">
                    {!s.email.configured ? (
                      <Badge tone="danger">Não configurado</Badge>
                    ) : s.email.ok ? (
                      <Badge tone="success">Conectado</Badge>
                    ) : s.email.ok === false ? (
                      <Badge tone="danger">Falha na conexão</Badge>
                    ) : (
                      <Badge>Não testado</Badge>
                    )}
                    {s.email.sender && <span className="mt-1 block text-xs text-muted">Remetente: {s.email.sender}</span>}
                    {s.email.host && <span className="block text-xs text-muted">{s.email.host}</span>}
                    {s.email.error && <span className="mt-1 block max-w-xs text-xs text-red-700">{s.email.error}</span>}
                    <Button variant="ghost" icon="refresh" className="mt-1 -mr-3" onClick={checkEmail} disabled={checking}>
                      {checking ? 'Testando…' : 'Testar conexão'}
                    </Button>
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Agenda online</dt>
                  <dd>{s.settings.onlineBookingEnabled ? <Badge tone="success">Ativa</Badge> : <Badge tone="danger">Pausada</Badge>}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Ambiente</dt>
                  <dd className="font-medium">{s.environment}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Versão</dt>
                  <dd className="font-medium">{s.version}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Node.js</dt>
                  <dd className="font-medium">{s.nodeVersion}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">No ar há</dt>
                  <dd className="font-medium">{uptime(s.uptimeSeconds)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Fotos enviadas</dt>
                  <dd className="font-medium">{s.counts.media}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Sessão expira após</dt>
                  <dd className="font-medium">
                    {s.settings.sessionIdleMinutes} min sem uso · máx. {s.settings.sessionMaxDays} dias
                  </dd>
                </div>
              </dl>
            </Card>

            <Card title="Atividade recente" actions={<Link to="/super-admin/logs" className="text-sm font-semibold text-rose-deep hover:underline">Ver logs</Link>}>
              {logs.data ? (
                <ul className="divide-y divide-line/70">
                  {logs.data.items.slice(0, 8).map((l) => (
                    <li key={l.id} className="py-2.5 text-sm">
                      <span className="text-xs text-muted tabular-nums">
                        {new Date(l.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {l.actorName}
                      </span>
                      <span className="block">{l.description}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Loading />
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </>
  );
}

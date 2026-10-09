import { useEffect, useState } from 'react';
import { useAsync } from '../../../hooks/useAsync';
import { cn } from '../../../lib/format';
import { adminApi } from '../../api';
import { Empty, ErrorState, Loading, PageHeader, Pagination, SearchInput, useDebounced } from '../../ui';

const ENTITIES = [
  { id: '', label: 'Tudo' },
  { id: 'appointment', label: 'Agendamentos' },
  { id: 'user', label: 'Usuários e acessos' },
  { id: 'procedure', label: 'Procedimentos e fotos' },
  { id: 'business_hours', label: 'Horários' },
  { id: 'blocked_time', label: 'Bloqueios' },
  { id: 'client', label: 'Clientes' },
  { id: 'business_settings', label: 'Configurações da clínica' },
  { id: 'system_settings', label: 'Configurações do sistema' },
];

/** Ações sensíveis ganham destaque visual. */
const isSensitive = (action: string) => /login_failed|user\.|system\.|password/.test(action);

export default function LogsPage() {
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search.trim());

  useEffect(() => {
    document.title = 'Logs | Super Admin';
  }, []);
  useEffect(() => setPage(1), [debounced, entity]);

  const { data, loading, error, retry } = useAsync((signal) => adminApi.auditLogs({ search: debounced, entity, page }, signal), [debounced, entity, page]);

  return (
    <>
      <PageHeader title="Logs do Sistema" description="Quem fez o quê e quando. Os registros não podem ser alterados." />
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_16rem]">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome, ação ou descrição" />
        <select value={entity} onChange={(e) => setEntity(e.target.value)} className="field py-2.5" aria-label="Filtrar por área">
          {ENTITIES.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={retry} />
      ) : data && data.items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white">
          <Empty icon="file">Nenhum registro encontrado.</Empty>
        </div>
      ) : data ? (
        <>
          <ol className={cn('divide-y divide-line/70 overflow-hidden rounded-2xl border border-line bg-white transition-opacity', loading && 'opacity-60')}>
            {data.items.map((l) => (
              <li key={l.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[9.5rem_1fr] sm:gap-4">
                <time dateTime={l.createdAt} className="text-sm text-muted tabular-nums">
                  {new Date(l.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </time>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{l.actorName}</p>
                  <p className="text-sm">{l.description}</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
                    <code className={cn('rounded px-1', isSensitive(l.action) ? 'bg-amber-50 text-amber-800' : 'bg-sand')}>{l.action}</code>
                    {l.ip && <span>IP {l.ip}</span>}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </>
      ) : null}
    </>
  );
}

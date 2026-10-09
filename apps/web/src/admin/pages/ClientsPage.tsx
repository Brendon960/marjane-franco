import { formatDateBR, formatPhoneBR } from '@mf/shared';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/ui/Icon';
import { useAsync } from '../../hooks/useAsync';
import { cn } from '../../lib/format';
import { adminApi } from '../api';
import { Empty, ErrorState, Loading, PageHeader, Pagination, SearchInput, useDebounced } from '../ui';

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search.trim());

  useEffect(() => {
    document.title = 'Clientes | Painel';
  }, []);
  useEffect(() => setPage(1), [debounced]);

  const { data, loading, error, retry } = useAsync((signal) => adminApi.clients({ search: debounced, page }, signal), [debounced, page]);

  return (
    <>
      <PageHeader title="Clientes" description="Cadastro e histórico de quem já agendou." />
      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome ou WhatsApp" />
      </div>

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={retry} />
      ) : data && data.items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white">
          <Empty icon="users">{debounced ? 'Nenhuma cliente encontrada.' : 'Ainda não há clientes cadastradas.'}</Empty>
        </div>
      ) : data ? (
        <>
          <ul className={cn('divide-y divide-line/70 overflow-hidden rounded-2xl border border-line bg-white transition-opacity', loading && 'opacity-60')}>
            {data.items.map((c) => (
              <li key={c.id}>
                <Link to={`/admin/clientes/${c.id}`} className="grid gap-1 px-4 py-3.5 hover:bg-sand/40 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center sm:gap-4">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{c.name}</span>
                    <span className="block text-sm text-muted">
                      {formatPhoneBR(c.phone)}
                      {c.email && <span className="hidden lg:inline"> · {c.email}</span>}
                    </span>
                  </span>
                  <span className="text-sm">
                    <span className="text-xs text-muted sm:block">Último: </span>
                    {c.lastAppointment ? `${formatDateBR(c.lastAppointment.date)} · ${c.lastAppointment.procedure}` : '—'}
                  </span>
                  <span className="text-sm">
                    <span className="text-xs text-muted sm:block">Próximo: </span>
                    {c.nextAppointment ? (
                      <span className="font-medium text-rose-deep">
                        {formatDateBR(c.nextAppointment.date)} {c.nextAppointment.time}
                      </span>
                    ) : (
                      '—'
                    )}
                  </span>
                  <span className="hidden items-center gap-1 text-sm text-muted sm:flex">
                    {c.totalAppointments} <Icon name="calendar" size={15} />
                    <Icon name="chevronRight" size={16} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </>
      ) : null}
    </>
  );
}

import type { AdminProcedureDTO } from '@mf/shared';
import { useEffect, useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { adminApi } from '../api';
import { PhotoUploader } from '../components/PhotoUploader';
import { ErrorState, Loading, Notice, PageHeader } from '../ui';

/** Fotos dos procedimentos — troca sem mexer no código. */
export default function PhotosPage() {
  const { data, loading, error, retry } = useAsync((signal) => adminApi.procedures(signal), []);
  const [list, setList] = useState<AdminProcedureDTO[] | null>(null);

  useEffect(() => {
    document.title = 'Fotos dos procedimentos | Painel';
  }, []);
  useEffect(() => setList(data ?? null), [data]);

  const pending = list?.filter((p) => !p.hasUploadedImage).length ?? 0;

  return (
    <>
      <PageHeader title="Fotos dos procedimentos" description="Troque as imagens exibidas no site." />

      {list && pending > 0 && (
        <div className="mb-6">
          <Notice tone="info">
            {pending} {pending === 1 ? 'procedimento ainda usa' : 'procedimentos ainda usam'} foto temporária. Use fotos próprias; fotos de
            pacientes só com autorização por escrito.
          </Notice>
        </div>
      )}

      {loading && !list ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={retry} />
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {list?.map((p) => (
            <li key={p.id} className="rounded-2xl border border-line bg-white p-4">
              <h2 className="mb-3 font-serif text-xl">
                {p.name}
                {!p.active && <span className="ml-2 font-sans text-xs text-muted">(inativo)</span>}
              </h2>
              <PhotoUploader procedure={p} onUpdated={(u) => setList((l) => l?.map((x) => (x.id === u.id ? u : x)) ?? null)} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

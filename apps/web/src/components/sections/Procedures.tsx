import { CATEGORY_LABELS, type ProcedureCategory } from '@mf/shared';
import { useMemo, useState } from 'react';
import { useProcedures } from '../../hooks/useSiteData';
import { cn } from '../../lib/format';
import { whatsappUrl } from '../../lib/whatsapp';
import { Button } from '../ui/Button';
import { SectionHeading } from '../ui/SectionHeading';
import { ProcedureCard } from './ProcedureCard';

type Filter = 'TODOS' | ProcedureCategory;

export function Procedures() {
  const { procedures: all, loading } = useProcedures();
  // "Avaliação / Outros" já tem chamada própria logo abaixo da grade.
  const procedures = useMemo(() => all.filter((p) => p.category !== 'AVALIACAO'), [all]);
  const [filter, setFilter] = useState<Filter>('TODOS');

  const categories = useMemo(
    () => [...new Set(procedures.map((p) => p.category))],
    [procedures],
  );
  const visible = filter === 'TODOS' ? procedures : procedures.filter((p) => p.category === filter);

  return (
    <section id="procedimentos" aria-labelledby="procedimentos-title" className="py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading
          id="procedimentos-title"
          eyebrow="Tratamentos"
          title={
            <>
              Nossos <span className="text-rose-deep italic">procedimentos</span>
            </>
          }
          description="Cada tratamento começa com uma conversa: entender o que você deseja e indicar o cuidado certo para a sua pele e o seu momento."
        />

        {categories.length > 1 && (
          <div role="tablist" aria-label="Filtrar por categoria" className="-mx-5 mt-10 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:justify-center sm:px-0">
            {(['TODOS', ...categories] as Filter[]).map((c) => (
              <button
                key={c}
                role="tab"
                type="button"
                aria-selected={filter === c}
                onClick={() => setFilter(c)}
                className={cn(
                  'shrink-0 rounded-full border px-5 py-2.5 text-sm font-medium transition',
                  filter === c ? 'border-rose-deep bg-rose-deep text-white' : 'border-line bg-white text-ink/75 hover:border-rose',
                )}
              >
                {c === 'TODOS' ? 'Todos' : CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        )}

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }, (_, i) => <div key={i} className="h-[30rem] animate-pulse rounded-3xl bg-sand" />)
            : visible.map((p) => <ProcedureCard key={p.slug} procedure={p} />)}
        </div>

        <div className="mt-14 flex flex-col items-center gap-5 rounded-3xl bg-sand/70 px-6 py-10 text-center sm:px-10">
          <h3 className="text-3xl font-medium">Ficou em dúvida sobre qual procedimento é ideal para você?</h3>
          <p className="max-w-xl text-muted">Me chame no WhatsApp: conversamos sobre o seu objetivo e indico o melhor caminho.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href={whatsappUrl()} variant="whatsapp" size="lg" icon="whatsapp">
              Falar no WhatsApp
            </Button>
            <Button to="/agendar?procedimento=avaliacao" variant="outline" size="lg" icon="calendar">
              Agendar avaliação
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

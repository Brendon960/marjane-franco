import { CATEGORY_LABELS, formatDuration } from '@mf/shared';
import { Link, useParams } from 'react-router';
import { Button } from '../components/ui/Button';
import { EvaluationNotice } from '../components/ui/EvaluationNotice';
import { Icon } from '../components/ui/Icon';
import { ProcedureVisual } from '../components/ui/ProcedureVisual';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useProcedures } from '../hooks/useSiteData';
import { formatPrice } from '../lib/format';
import { procedureQuestionMessage, whatsappUrl } from '../lib/whatsapp';
import NotFoundPage from './NotFoundPage';

export default function ProcedurePage() {
  const { slug } = useParams();
  const { procedures, loading } = useProcedures();
  const procedure = procedures.find((p) => p.slug === slug);

  useDocumentMeta(
    procedure ? `${procedure.name} | Dra. Marjane Franco` : 'Procedimento | Dra. Marjane Franco',
    procedure?.shortDescription,
  );

  if (loading) return <div className="min-h-dvh" />;
  if (!procedure) return <NotFoundPage />;

  const others = procedures.filter((p) => p.category === procedure.category && p.slug !== procedure.slug).slice(0, 3);

  return (
    <article className="pt-28 pb-24 sm:pt-36">
      <div className="container-page">
        <nav aria-label="Navegação estrutural" className="text-sm text-muted">
          <Link to="/" className="hover:text-rose-deep">Início</Link>
          <span className="mx-2">/</span>
          <Link to="/#procedimentos" className="hover:text-rose-deep">Procedimentos</Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{procedure.name}</span>
        </nav>

        <div className="mt-8 grid gap-12 lg:grid-cols-2 lg:items-start">
          <ProcedureVisual slug={procedure.slug} category={procedure.category} imageUrl={procedure.imageUrl} alt={procedure.name} className="aspect-[4/3] w-full rounded-[2rem] shadow-lift" />

          <div>
            <p className="eyebrow">{CATEGORY_LABELS[procedure.category]}</p>
            <h1 className="mt-3 text-5xl leading-tight font-medium">{procedure.name}</h1>
            <p className="mt-5 text-lg leading-relaxed text-ink/80">{procedure.description}</p>

            <dl className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white p-4 shadow-soft">
                <dt className="flex items-center gap-1.5 text-xs text-muted"><Icon name="clock" size={14} className="text-gold" /> Duração aproximada</dt>
                <dd className="mt-1 font-semibold">{formatDuration(procedure.durationMinutes)}</dd>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-soft">
                <dt className="text-xs text-muted">Investimento</dt>
                <dd className="mt-1 font-semibold">{formatPrice(procedure.price)}</dd>
              </div>
            </dl>

            <ul className="mt-8 space-y-3">
              {procedure.highlights.map((h) => (
                <li key={h} className="flex items-center gap-3 text-ink/85">
                  <span className="grid size-6 place-items-center rounded-full bg-rose/15 text-rose-deep">
                    <Icon name="check" size={13} strokeWidth={2.5} />
                  </span>
                  {h}
                </li>
              ))}
            </ul>

            {procedure.requiresEvaluation && <EvaluationNotice className="mt-8" />}

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button to={`/agendar?procedimento=${procedure.slug}`} size="lg" icon="calendar">
                Agendar {procedure.requiresEvaluation ? 'avaliação' : 'horário'}
              </Button>
              <Button href={whatsappUrl(procedureQuestionMessage(procedure.name))} variant="outline" size="lg" icon="whatsapp">
                Tirar dúvidas
              </Button>
            </div>
          </div>
        </div>

        {others.length > 0 && (
          <section aria-labelledby="relacionados" className="mt-24">
            <h2 id="relacionados" className="text-3xl font-medium">Veja também</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-3">
              {others.map((p) => (
                <li key={p.slug}>
                  <Link to={`/procedimentos/${p.slug}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-5 transition hover:border-rose hover:shadow-soft">
                    <span className="font-medium">{p.name}</span>
                    <Icon name="arrowRight" size={18} className="shrink-0 text-gold" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}

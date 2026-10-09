import { CATEGORY_LABELS, formatDuration, type ProcedureDTO } from '@mf/shared';
import { Link } from 'react-router';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { ProcedureVisual } from '../ui/ProcedureVisual';

export function ProcedureCard({ procedure }: { procedure: ProcedureDTO }) {
  const detailsUrl = `/procedimentos/${procedure.slug}`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-line/70 bg-white shadow-soft transition duration-500 hover:-translate-y-1 hover:shadow-lift">
      <Link to={detailsUrl} tabIndex={-1} aria-hidden className="relative block">
        <ProcedureVisual
          slug={procedure.slug}
          category={procedure.category}
          imageUrl={procedure.imageUrl}
          alt={procedure.name}
          className="aspect-[16/10] w-full transition duration-700 group-hover:scale-[1.03]"
        />
        <span className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 text-[0.7rem] font-semibold tracking-wide text-ink/80 backdrop-blur">
          {CATEGORY_LABELS[procedure.category]}
        </span>
        {procedure.requiresEvaluation && (
          <span className="absolute top-4 right-4 rounded-full bg-ink/75 px-3 py-1 text-[0.7rem] font-medium text-white backdrop-blur">
            Mediante avaliação
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-2xl leading-tight font-medium">
          <Link to={detailsUrl} className="transition hover:text-rose-deep">
            {procedure.name}
          </Link>
        </h3>
        <p className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-muted">{procedure.shortDescription}</p>

        <ul className="mt-4 flex flex-wrap gap-2">
          {procedure.highlights.slice(0, 3).map((h) => (
            <li key={h} className="rounded-full bg-sand px-3 py-1 text-xs text-ink/75">
              {h}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-5">
          <span className="flex items-center gap-1.5 text-sm text-muted">
            <Icon name="clock" size={16} className="text-gold" />~{formatDuration(procedure.durationMinutes)}
          </span>
          <div className="flex items-center gap-1">
            <Link to={detailsUrl} className="rounded-full px-3 py-2 text-sm font-medium text-ink/70 transition hover:text-rose-deep">
              Saiba mais
            </Link>
            <Button to={`/agendar?procedimento=${procedure.slug}`} size="md" className="h-10 px-4">
              Agendar
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

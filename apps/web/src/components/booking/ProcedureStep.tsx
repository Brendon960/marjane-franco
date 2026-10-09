import { formatDuration, type ProcedureDTO } from '@mf/shared';
import { cn } from '../../lib/format';
import { Icon } from '../ui/Icon';

interface ProcedureStepProps {
  procedures: ProcedureDTO[];
  selected: ProcedureDTO | null;
  onSelect: (procedure: ProcedureDTO) => void;
}

export function ProcedureStep({ procedures, selected, onSelect }: ProcedureStepProps) {
  return (
    <fieldset>
      <legend className="font-serif text-3xl">Qual procedimento você deseja?</legend>
      <p className="mt-2 text-muted">Não sabe qual escolher? Selecione “Avaliação / Outros”.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {procedures.map((p) => {
          const checked = selected?.slug === p.slug;
          return (
            <label
              key={p.slug}
              className={cn(
                'flex cursor-pointer items-start gap-4 rounded-2xl border bg-white p-4 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-rose/25',
                checked ? 'border-rose-deep shadow-soft' : 'border-line hover:border-rose',
              )}
            >
              <input
                type="radio"
                name="procedure"
                value={p.slug}
                checked={checked}
                onChange={() => onSelect(p)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition',
                  checked ? 'border-rose-deep' : 'border-line',
                )}
              >
                {checked && <span className="size-2.5 rounded-full bg-rose-deep" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{p.name}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Icon name="clock" size={13} className="text-gold" />~{formatDuration(p.durationMinutes)}
                  </span>
                  {p.requiresEvaluation && <span>· Mediante avaliação</span>}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

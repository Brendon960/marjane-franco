import { cn } from '../../lib/format';
import { Icon } from '../ui/Icon';

export const STEP_LABELS = ['Procedimento', 'Data', 'Horário', 'Seus dados', 'Confirmação'] as const;

interface StepperProps {
  current: number;
  /** Permite voltar para etapas já concluídas. */
  onSelect: (step: number) => void;
}

export function Stepper({ current, onSelect }: StepperProps) {
  return (
    <nav aria-label="Etapas do agendamento">
      <ol className="flex items-center gap-1.5 sm:gap-3">
        {STEP_LABELS.map((label, i) => {
          const step = i + 1;
          const done = step < current;
          const active = step === current;
          return (
            <li key={label} className="flex flex-1 items-center gap-1.5 sm:gap-3">
              <button
                type="button"
                disabled={!done}
                onClick={() => onSelect(step)}
                aria-current={active ? 'step' : undefined}
                aria-label={`Etapa ${step}: ${label}${done ? ' (concluída — voltar)' : ''}`}
                className="flex items-center gap-2 disabled:cursor-default"
              >
                <span
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold transition',
                    done && 'bg-rose-deep text-white hover:bg-rose-darker',
                    active && 'bg-ink text-white ring-4 ring-rose/20',
                    !done && !active && 'border border-line bg-white text-muted',
                  )}
                >
                  {done ? <Icon name="check" size={15} strokeWidth={2.5} /> : step}
                </span>
                <span className={cn('hidden text-sm font-medium md:block', active ? 'text-ink' : 'text-muted')}>{label}</span>
              </button>
              {step < STEP_LABELS.length && <span className={cn('h-px flex-1', done ? 'bg-rose-deep' : 'bg-line')} />}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-muted md:hidden">
        Etapa {current} de {STEP_LABELS.length} · <span className="font-medium text-ink">{STEP_LABELS[current - 1]}</span>
      </p>
    </nav>
  );
}

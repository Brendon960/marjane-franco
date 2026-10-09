import { addDays, toBusinessDate } from '@mf/shared';
import { useMemo, useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { WEEKDAYS_SHORT, cn, formatMonthTitle } from '../../lib/format';
import { api } from '../../services/api';
import { Icon } from '../ui/Icon';

interface CalendarStepProps {
  procedureSlug: string;
  selected: string | null;
  maxDaysAhead: number;
  onSelect: (date: string) => void;
}

const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
};

export function CalendarStep({ procedureSlug, selected, maxDaysAhead, onSelect }: CalendarStepProps) {
  const today = toBusinessDate(new Date());
  const firstMonth = today.slice(0, 7);
  const lastMonth = addDays(today, maxDaysAhead).slice(0, 7);
  const [month, setMonth] = useState(selected?.slice(0, 7) ?? firstMonth);

  const { data, loading, error, retry } = useAsync(
    (signal) => api.availableDays(procedureSlug, month, signal),
    [procedureSlug, month],
  );
  const available = useMemo(() => new Set(data?.filter((d) => d.available).map((d) => d.date)), [data]);

  const days = useMemo(() => {
    const first = new Date(`${month}-01T12:00:00Z`);
    const blanks = first.getUTCDay();
    const total = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    return [
      ...Array.from({ length: blanks }, () => null),
      ...Array.from({ length: total }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
    ];
  }, [month]);

  const noneAvailable = !loading && !error && available.size === 0;

  return (
    <div>
      <h2 className="font-serif text-3xl">Escolha a data</h2>
      <p className="mt-2 text-muted">Dias em destaque têm horários livres para este procedimento.</p>

      <div className="mt-6 rounded-3xl border border-line bg-white p-4 shadow-soft sm:p-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            disabled={month <= firstMonth}
            aria-label="Mês anterior"
            className="grid size-10 place-items-center rounded-full text-ink transition hover:bg-sand disabled:opacity-30"
          >
            <Icon name="chevronLeft" />
          </button>
          <p className="font-serif text-2xl" aria-live="polite">
            {formatMonthTitle(month)}
          </p>
          <button
            type="button"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={month >= lastMonth}
            aria-label="Próximo mês"
            className="grid size-10 place-items-center rounded-full text-ink transition hover:bg-sand disabled:opacity-30"
          >
            <Icon name="chevronRight" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center" aria-busy={loading}>
          {WEEKDAYS_SHORT.map((d) => (
            <div key={d} aria-hidden className="pb-2 text-xs font-semibold tracking-wide text-muted uppercase">
              {d}
            </div>
          ))}
          {days.map((date, i) => {
            if (!date) return <div key={`b${i}`} />;
            const isAvailable = available.has(date);
            const isSelected = date === selected;
            return (
              <button
                key={date}
                type="button"
                disabled={!isAvailable}
                onClick={() => onSelect(date)}
                aria-pressed={isSelected}
                aria-label={`${Number(date.slice(8))}${isAvailable ? ', disponível' : ', indisponível'}`}
                className={cn(
                  'relative mx-auto grid aspect-square w-full max-w-12 place-items-center rounded-full text-sm transition',
                  loading && 'animate-pulse',
                  isSelected && 'bg-rose-deep font-semibold text-white shadow-soft',
                  !isSelected && isAvailable && 'bg-rose/10 font-semibold text-rose-darker hover:bg-rose/25',
                  !isAvailable && 'cursor-not-allowed text-ink/25 line-through decoration-ink/15',
                  date === today && !isSelected && 'ring-1 ring-gold',
                )}
              >
                {Number(date.slice(8))}
              </button>
            );
          })}
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-rose/10 p-3 text-sm text-rose-darker">
            {error.message}{' '}
            <button type="button" onClick={retry} className="font-semibold underline">
              Tentar novamente
            </button>
          </p>
        )}
        {noneAvailable && (
          <p className="mt-4 text-center text-sm text-muted">
            Sem horários livres neste mês.{' '}
            {month < lastMonth && (
              <button type="button" onClick={() => setMonth((m) => shiftMonth(m, 1))} className="font-semibold text-rose-deep underline">
                Ver próximo mês
              </button>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

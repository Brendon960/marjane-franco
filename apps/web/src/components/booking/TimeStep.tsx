import { useAsync } from '../../hooks/useAsync';
import { cn, formatLongDate } from '../../lib/format';
import { whatsappUrl } from '../../lib/whatsapp';
import { api } from '../../services/api';
import { Button } from '../ui/Button';

interface TimeStepProps {
  procedureSlug: string;
  date: string;
  selected: string | null;
  /** Aviso vindo de uma tentativa anterior (ex.: horário acabou de ser ocupado). */
  notice: string | null;
  onSelect: (time: string) => void;
  onChangeDate: () => void;
}

const PERIODS = [
  { label: 'Manhã', test: (t: string) => t < '12:00' },
  { label: 'Tarde', test: (t: string) => t >= '12:00' && t < '18:00' },
  { label: 'Noite', test: (t: string) => t >= '18:00' },
];

export function TimeStep({ procedureSlug, date, selected, notice, onSelect, onChangeDate }: TimeStepProps) {
  const { data, loading, error, retry } = useAsync(
    (signal) => api.slots(procedureSlug, date, signal),
    [procedureSlug, date],
  );
  const slots = data?.slots ?? [];

  return (
    <div>
      <h2 className="font-serif text-3xl">Horários disponíveis</h2>
      <p className="mt-2 text-muted">
        <span className="font-medium text-ink capitalize">{formatLongDate(date)}</span> ·{' '}
        <button type="button" onClick={onChangeDate} className="text-rose-deep underline">
          trocar data
        </button>
      </p>

      {notice && (
        <p role="alert" className="mt-5 rounded-2xl bg-rose/10 p-4 text-sm text-rose-darker">
          {notice}
        </p>
      )}

      <div className="mt-6 space-y-6" aria-busy={loading}>
        {loading && (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-sand" />
            ))}
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-rose/10 p-4 text-sm text-rose-darker">
            {error.message}{' '}
            <button type="button" onClick={retry} className="font-semibold underline">
              Tentar novamente
            </button>
          </p>
        )}

        {!loading && !error && slots.length === 0 && (
          <div className="rounded-2xl border border-line bg-white p-6 text-center">
            <p className="text-ink">Os horários deste dia acabaram de ser preenchidos.</p>
            <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
              <Button onClick={onChangeDate} variant="outline">
                Escolher outra data
              </Button>
              <Button href={whatsappUrl()} variant="whatsapp" icon="whatsapp">
                Pedir encaixe no WhatsApp
              </Button>
            </div>
          </div>
        )}

        {!loading &&
          PERIODS.map(({ label, test }) => {
            const times = slots.filter(test);
            if (times.length === 0) return null;
            return (
              <fieldset key={label}>
                <legend className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">{label}</legend>
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                  {times.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => onSelect(time)}
                      aria-pressed={time === selected}
                      className={cn(
                        'h-12 rounded-xl border text-base font-semibold tabular-nums transition',
                        time === selected
                          ? 'border-rose-deep bg-rose-deep text-white shadow-soft'
                          : 'border-line bg-white text-ink hover:border-rose hover:text-rose-deep',
                      )}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </fieldset>
            );
          })}
      </div>
    </div>
  );
}

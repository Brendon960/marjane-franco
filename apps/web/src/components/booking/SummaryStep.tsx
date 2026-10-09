import { formatDateBR, formatDuration, maskPhoneInput, type ProcedureDTO } from '@mf/shared';
import { formatLongDate } from '../../lib/format';
import { whatsappUrl } from '../../lib/whatsapp';
import { Button } from '../ui/Button';
import { EvaluationNotice } from '../ui/EvaluationNotice';
import type { DetailsForm } from './DetailsStep';

interface SummaryStepProps {
  procedure: ProcedureDTO;
  date: string;
  time: string;
  details: DetailsForm;
  submitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onEdit: (step: number) => void;
}

export function SummaryStep({ procedure, date, time, details, submitting, error, onConfirm, onEdit }: SummaryStepProps) {
  const rows: { label: string; value: string; step: number }[] = [
    { label: 'Procedimento', value: procedure.name, step: 1 },
    { label: 'Data', value: `${formatDateBR(date)} (${formatLongDate(date).split(',')[0]})`, step: 2 },
    { label: 'Horário', value: `${time} · duração aprox. ${formatDuration(procedure.durationMinutes)}`, step: 3 },
    { label: 'Cliente', value: details.name.trim(), step: 4 },
    { label: 'WhatsApp', value: maskPhoneInput(details.phone), step: 4 },
    { label: 'E-mail', value: details.email.trim(), step: 4 },
    ...(details.notes.trim() ? [{ label: 'Observações', value: details.notes.trim(), step: 4 }] : []),
  ];

  return (
    <div>
      <h2 className="font-serif text-3xl">Confira seu agendamento</h2>
      <p className="mt-2 text-muted">Está tudo certo? Confirme para reservar o horário.</p>

      <dl className="mt-6 divide-y divide-line rounded-3xl border border-line bg-white px-5 shadow-soft sm:px-7">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0">
              <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{row.label}</dt>
              <dd className="mt-1 font-medium break-words whitespace-pre-line text-ink">{row.value}</dd>
            </div>
            <button type="button" onClick={() => onEdit(row.step)} className="shrink-0 text-sm text-rose-deep underline">
              alterar
            </button>
          </div>
        ))}
      </dl>

      {procedure.requiresEvaluation && <EvaluationNotice className="mt-5" />}

      {error && (
        <div role="alert" className="mt-5 rounded-2xl bg-rose/10 p-4 text-sm text-rose-darker">
          <p>{error}</p>
          <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold underline">
            Falar no WhatsApp
          </a>
        </div>
      )}

      <Button onClick={onConfirm} disabled={submitting} size="lg" icon={submitting ? undefined : 'check'} className="mt-8 w-full sm:w-auto">
        {submitting ? 'Reservando horário…' : 'Confirmar agendamento'}
      </Button>
    </div>
  );
}

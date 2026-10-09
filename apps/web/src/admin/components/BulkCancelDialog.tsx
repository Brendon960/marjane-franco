import { formatDateBR, type AdminAppointmentDTO, type BulkCancelResultDTO } from '@mf/shared';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { adminApi } from '../api';
import { notifyEmail } from './AppointmentConfirmation';
import { Dialog, Notice, Textarea } from '../ui';

interface BulkCancelDialogProps {
  open: boolean;
  /** Agendamentos que serão cancelados (só PENDENTES/CONFIRMADOS) */
  appointments: AdminAppointmentDTO[];
  /** "Cancelar todos os agendamentos deste dia" */
  wholeDay?: string | null;
  onClose: () => void;
  /** Depois do processamento (para recarregar a agenda e limpar a seleção) */
  onDone: (result: BulkCancelResultDTO) => void;
}

/**
 * Cancelamento em massa: aviso → motivo → confirmação → processamento → resumo.
 * Nunca cancela no primeiro clique. Cada cliente recebe o próprio e-mail.
 */
export function BulkCancelDialog({ open, appointments, wholeDay, onClose, onDone }: BulkCancelDialogProps) {
  const [reason, setReason] = useState('');
  const [step, setStep] = useState<'confirm' | 'processing' | 'summary'>('confirm');
  const [result, setResult] = useState<BulkCancelResultDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setReason('');
      setStep('confirm');
      setResult(null);
      setError(null);
    }
  }

  const count = appointments.length;
  const withoutEmail = appointments.filter((a) => !notifyEmail(a)).length;
  const plural = count === 1 ? 'agendamento' : 'agendamentos';

  const run = async () => {
    setStep('processing');
    setError(null);
    try {
      const res = await adminApi.bulkCancel(
        appointments.map((a) => a.id),
        reason.trim() || undefined,
      );
      setResult(res);
      setStep('summary');
      onDone(res);
    } catch (err) {
      setError((err as Error).message);
      setStep('confirm');
    }
  };

  // Durante o processamento não fecha (evita a impressão de que foi interrompido)
  const close = () => step !== 'processing' && onClose();

  if (step === 'summary' && result) {
    const problems = result.items.filter((i) => i.result !== 'cancelled' || i.email?.status !== 'SENT');
    return (
      <Dialog open={open} onClose={close} title="Cancelamento concluído" size="lg" footer={<Button onClick={onClose}>Fechar</Button>}>
        <ul className="grid gap-2 sm:grid-cols-2">
          <SummaryLine icon="check" tone="text-emerald-700" label="Agendamentos cancelados" value={result.cancelled} />
          <SummaryLine icon="check" tone="text-emerald-700" label="E-mails enviados" value={result.emailsSent} />
          <SummaryLine icon="alert" tone="text-amber-700" label="Falhas no envio" value={result.emailsFailed} />
          <SummaryLine icon="alert" tone="text-amber-700" label="Clientes sem e-mail" value={result.noEmail} />
          {result.skipped > 0 && (
            <SummaryLine icon="info" tone="text-muted" label="Ignorados (já não estavam ativos)" value={result.skipped} />
          )}
        </ul>

        {problems.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold">Precisam de atenção</p>
            <ul className="max-h-60 divide-y divide-line/70 overflow-y-auto rounded-2xl border border-line bg-white">
              {problems.map((i) => (
                <li key={i.id} className="px-4 py-2.5 text-sm">
                  <span className="font-semibold">{i.clientName}</span>
                  <span className="text-muted">
                    {' '}
                    · {i.procedure}
                    {i.date && ` · ${formatDateBR(i.date)} ${i.time}`}
                  </span>
                  <span className="mt-0.5 block text-xs text-amber-800">
                    {i.result !== 'cancelled'
                      ? `Não cancelado: ${i.detail}`
                      : i.email?.status === 'SKIPPED'
                        ? 'Cancelado · cliente sem e-mail — notificação não enviada'
                        : `Cancelado · e-mail não enviado: ${i.email?.error ?? 'erro desconhecido'}`}
                  </span>
                </li>
              ))}
            </ul>
            {result.emailsFailed > 0 && (
              <p className="mt-2 text-xs text-muted">Para reenviar, abra o agendamento na agenda e use “Enviar novamente”.</p>
            )}
          </div>
        )}
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <Icon name="alert" className="text-red-700" /> Cancelamento em massa
        </span>
      }
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={step === 'processing'}>
            Voltar
          </Button>
          <button
            type="button"
            onClick={run}
            disabled={step === 'processing' || count === 0}
            className="inline-flex h-11 items-center justify-center rounded-full bg-red-700 px-5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
          >
            {step === 'processing' ? 'Cancelando e enviando e-mails…' : 'Confirmar cancelamento'}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-ink/85">
        <p>
          {wholeDay ? (
            <>
              Você está prestes a cancelar todos os <strong>{count} {plural}</strong> do dia <strong>{formatDateBR(wholeDay)}</strong>.
            </>
          ) : (
            <>
              Você está prestes a cancelar <strong>{count} {plural}</strong>.
            </>
          )}
        </p>
        <p>Todos os clientes selecionados serão notificados por e-mail.</p>
        <p className="font-semibold text-red-700">Esta ação não poderá ser desfeita automaticamente.</p>
        {withoutEmail > 0 && (
          <Notice tone="warning">
            {withoutEmail === 1 ? '1 cliente não tem' : `${withoutEmail} clientes não têm`} e-mail cadastrado — o cancelamento acontece, mas sem aviso por
            e-mail.
          </Notice>
        )}
      </div>

      <ul className="mt-4 max-h-48 divide-y divide-line/70 overflow-y-auto rounded-2xl border border-line bg-white">
        {appointments.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-semibold">{a.client.name}</span>
              <span className="block truncate text-xs text-muted">
                {a.procedure.name} · {formatDateBR(a.date)} - {a.time}
              </span>
            </span>
            {!notifyEmail(a) && <span className="shrink-0 text-xs text-amber-700">sem e-mail</span>}
          </li>
        ))}
      </ul>

      <Textarea
        className="mt-4"
        label="Motivo do cancelamento (opcional)"
        rows={2}
        maxLength={200}
        placeholder="Ex.: Indisponibilidade da profissional nesta data."
        hint="Fica registrado no histórico e aparece no e-mail enviado aos clientes."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={step === 'processing'}
      />

      {step === 'processing' && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted" role="status">
          <span className="size-4 animate-spin rounded-full border-2 border-rose/30 border-t-rose-deep" />
          Cancelando e enviando um e-mail para cada cliente… não feche esta janela.
        </p>
      )}
      {error && (
        <div className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <p className="mt-4 text-sm font-medium">Deseja realmente continuar?</p>
    </Dialog>
  );
}

function SummaryLine({ icon, tone, label, value }: { icon: 'check' | 'alert' | 'info'; tone: string; label: string; value: number }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3">
      <Icon name={icon} size={20} className={tone} />
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-sm text-muted">{label}</span>
    </li>
  );
}

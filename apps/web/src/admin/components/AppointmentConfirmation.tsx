import type { AdminAppointmentDTO } from '@mf/shared';
import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { cn } from '../../lib/format';
import { adminApi } from '../api';
import { Notice, useToast } from '../ui';

/** A2: e-mail que recebe os avisos deste agendamento (contato informado nele ou cadastro da cliente). */
export const notifyEmail = (a: AdminAppointmentDTO) => a.contactEmail ?? a.client.email;

const FAILED_WARNING = 'Agendamento confirmado, mas não foi possível enviar o e-mail de confirmação.';

/**
 * "Confirmar agendamento" — um único clique: PENDENTE → CONFIRMADO e envio automático
 * do e-mail de confirmação para a cliente. O botão fica desativado durante o envio e a API
 * impede e-mail duplicado (cliques repetidos, recarregar a página).
 */
export function useConfirmAppointment() {
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const confirmAppointment = useCallback(
    async (a: AdminAppointmentDTO): Promise<AdminAppointmentDTO | null> => {
      setBusyId(a.id);
      try {
        const updated = await adminApi.setStatus(a.id, 'CONFIRMED');
        if (updated.confirmationEmail?.status === 'SENT') toast(`Agendamento confirmado. E-mail enviado para ${updated.confirmationEmail.to}.`);
        else toast(FAILED_WARNING, 'warning');
        return updated;
      } catch (err) {
        toast((err as Error).message, 'error');
        return null;
      } finally {
        setBusyId(null);
      }
    },
    [toast],
  );

  return { confirmAppointment, busyId };
}

/** Indicador compacto para listas e agenda. */
export function ConfirmationEmailIndicator({ a }: { a: AdminAppointmentDTO }) {
  if (a.status !== 'CONFIRMED' || !a.confirmationEmail) return null;
  const { status } = a.confirmationEmail;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-semibold',
        status === 'SENT' ? 'text-emerald-700' : status === 'FAILED' ? 'text-amber-700' : 'text-muted',
      )}
      title={status === 'FAILED' ? (a.confirmationEmail.error ?? undefined) : undefined}
    >
      <Icon name={status === 'FAILED' ? 'alert' : status === 'SENT' ? 'check' : 'clock'} size={13} />
      {status === 'SENT' ? 'E-mail enviado' : status === 'FAILED' ? 'E-mail não enviado' : 'Enviando e-mail…'}
    </span>
  );
}

/** Bloco no detalhe do agendamento: situação do e-mail + "Enviar novamente". */
export function ConfirmationEmailPanel({ a, onChanged }: { a: AdminAppointmentDTO; onChanged: (updated: AdminAppointmentDTO) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (a.status !== 'CONFIRMED') return null;

  const future = new Date(`${a.date}T${a.time}:00-03:00`).getTime() > Date.now();
  const e = a.confirmationEmail;

  const resend = async () => {
    setBusy(true);
    try {
      const updated = await adminApi.resendConfirmationEmail(a.id);
      if (updated.confirmationEmail?.status === 'SENT') toast(`E-mail de confirmação enviado para ${updated.confirmationEmail.to}.`);
      else toast('Ainda não foi possível enviar o e-mail.', 'warning');
      onChanged(updated);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const actions = future && (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button variant="outline" icon="refresh" onClick={resend} disabled={busy || !notifyEmail(a)}>
        {busy ? 'Enviando…' : e ? 'Enviar novamente' : 'Enviar e-mail de confirmação'}
      </Button>
      {!notifyEmail(a) && (
        <Link to={`/admin/clientes/${a.client.id}`} className="text-sm font-semibold text-rose-deep hover:underline">
          Cadastrar e-mail da cliente
        </Link>
      )}
    </div>
  );

  return (
    <div className="mt-4 rounded-2xl border border-line bg-white px-4 py-3.5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Icon name="check" size={17} className="text-rose-deep" /> E-mail de confirmação
      </p>
      {!e ? (
        <>
          <p className="mt-1.5 text-sm text-muted">
            {notifyEmail(a) ? `Ainda não enviado para ${notifyEmail(a)}.` : 'A cliente não tem e-mail cadastrado.'}
          </p>
          {actions}
        </>
      ) : e.status === 'SENT' ? (
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-emerald-800">
          <Icon name="check" size={16} /> Confirmação enviada para <strong>{e.to}</strong>
          {e.sentAt && <span className="text-muted">· {new Date(e.sentAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>}
        </p>
      ) : e.status === 'PENDING' ? (
        <p className="mt-1.5 text-sm text-muted">Enviando…</p>
      ) : (
        <div className="mt-2">
          <Notice tone="warning">
            <p className="font-semibold">{FAILED_WARNING}</p>
            {e.error && <p className="mt-1 text-xs">{e.error}</p>}
          </Notice>
          {actions}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aviso de cancelamento por e-mail
// ---------------------------------------------------------------------------

/** Indicador compacto do aviso de cancelamento (listas e agenda). */
export function CancellationEmailIndicator({ a }: { a: AdminAppointmentDTO }) {
  if (a.status !== 'CANCELLED' || !a.cancellationEmail) return null;
  const { status } = a.cancellationEmail;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-semibold',
        status === 'SENT' ? 'text-emerald-700' : status === 'PENDING' ? 'text-muted' : 'text-amber-700',
      )}
      title={a.cancellationEmail.error ?? undefined}
    >
      <Icon name={status === 'SENT' ? 'check' : status === 'PENDING' ? 'clock' : 'alert'} size={13} />
      {status === 'SENT' ? 'Aviso enviado' : status === 'SKIPPED' ? 'Sem e-mail — não avisado' : status === 'FAILED' ? 'Aviso: falha no envio' : 'Enviando aviso…'}
    </span>
  );
}

/** Bloco no detalhe de um agendamento cancelado pela clínica: situação do aviso + "Enviar novamente". */
export function CancellationEmailPanel({ a, onChanged }: { a: AdminAppointmentDTO; onChanged: (updated: AdminAppointmentDTO) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (a.status !== 'CANCELLED' || a.cancelledBy !== 'admin' || !a.cancellationEmail) return null;
  const e = a.cancellationEmail;

  const resend = async () => {
    setBusy(true);
    try {
      const updated = await adminApi.resendCancellationEmail(a.id);
      if (updated.cancellationEmail?.status === 'SENT') toast(`Aviso de cancelamento enviado para ${updated.cancellationEmail.to}.`);
      else toast('Ainda não foi possível enviar o aviso.', 'warning');
      onChanged(updated);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-line bg-white px-4 py-3.5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Icon name="close" size={17} className="text-red-700" /> Aviso de cancelamento por e-mail
      </p>
      {e.status === 'SENT' ? (
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-emerald-800">
          <Icon name="check" size={16} /> Enviado para <strong>{e.to}</strong>
          {e.sentAt && <span className="text-muted">· {new Date(e.sentAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>}
        </p>
      ) : e.status === 'PENDING' ? (
        <p className="mt-1.5 text-sm text-muted">Enviando…</p>
      ) : (
        <div className="mt-2">
          <Notice tone="warning">
            <p className="font-semibold">
              {e.status === 'SKIPPED' ? 'Cliente sem e-mail — notificação não enviada.' : 'Não foi possível enviar o aviso de cancelamento.'}
            </p>
            {e.status === 'FAILED' && e.error && <p className="mt-1 text-xs">{e.error}</p>}
          </Notice>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="outline" icon="refresh" onClick={resend} disabled={busy || !notifyEmail(a)}>
              {busy ? 'Enviando…' : 'Enviar novamente'}
            </Button>
            {!notifyEmail(a) && (
              <Link to={`/admin/clientes/${a.client.id}`} className="text-sm font-semibold text-rose-deep hover:underline">
                Cadastrar e-mail da cliente
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { APPOINTMENT_STATUS_LABELS, formatDateBR } from '@mf/shared';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { useAsync } from '../hooks/useAsync';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { formatLongDate } from '../lib/format';
import { whatsappUrl } from '../lib/whatsapp';
import { api } from '../services/api';

/** Link privado da cliente: ver, cancelar ou pedir alteração do agendamento — sem login. */
export default function ManageBookingPage() {
  const { token = '' } = useParams();
  useDocumentMeta('Meu agendamento | Dra. Marjane Franco');

  // M5: o endereço desta página contém o token privado — não enviar como Referer a nenhum site
  useEffect(() => {
    const meta = Object.assign(document.createElement('meta'), { name: 'referrer', content: 'no-referrer' });
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
  const { data, loading, error, retry } = useAsync((signal) => api.manageBooking(token, signal), [token]);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const cancel = async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      await api.cancelBooking(token);
      setConfirming(false);
      retry();
    } catch (err) {
      setCancelError((err as Error).message);
    } finally {
      setCancelling(false);
    }
  };

  const changeMessage = data
    ? `Olá! Gostaria de alterar meu agendamento.\n\nProcedimento: ${data.procedureName}\nData: ${formatDateBR(data.date)}\nHorário: ${data.time}\nCódigo: ${data.code}`
    : undefined;

  return (
    <section className="pt-28 pb-24 sm:pt-36">
      <div className="container-page max-w-xl">
        <p className="eyebrow">Meu agendamento</p>
        {loading && !data ? (
          <p className="mt-6 text-muted">Carregando…</p>
        ) : error ? (
          <div className="mt-6 rounded-3xl border border-line bg-white p-8 text-center shadow-soft">
            <p className="font-serif text-2xl">Agendamento não encontrado</p>
            <p className="mt-2 text-muted">{error.message}</p>
            <Button href={whatsappUrl()} variant="whatsapp" icon="whatsapp" className="mt-6">
              Falar no WhatsApp
            </Button>
          </div>
        ) : data ? (
          <>
            <h1 className="mt-3 text-4xl font-medium sm:text-5xl">Olá, {data.clientFirstName}!</h1>
            <div className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">{APPOINTMENT_STATUS_LABELS[data.status]}</p>
              <p className="mt-2 font-serif text-3xl">{data.procedureName}</p>
              <p className="mt-2 flex items-center gap-2 text-ink/80">
                <Icon name="calendar" size={18} className="text-rose-deep" />
                <span className="first-letter:uppercase">{formatLongDate(data.date)}</span>
              </p>
              <p className="mt-1 flex items-center gap-2 text-ink/80">
                <Icon name="clock" size={18} className="text-rose-deep" /> {data.time} às {data.endTime}
              </p>
              <p className="mt-4 text-sm text-muted">
                Código: <span className="font-mono font-semibold tracking-wider text-ink">{data.code}</span>
              </p>

              {data.status === 'CANCELLED' ? (
                <p className="mt-6 rounded-2xl bg-sand/70 px-4 py-3 text-sm">Este agendamento foi cancelado. Quando quiser, é só agendar de novo.</p>
              ) : (data.status === 'PENDING' || data.status === 'CONFIRMED') && (
                <div className="mt-6 space-y-3 border-t border-line pt-6">
                  <Button href={whatsappUrl(changeMessage)} variant="whatsapp" icon="whatsapp" className="w-full">
                    Pedir alteração pelo WhatsApp
                  </Button>
                  {data.canCancel ? (
                    confirming ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm text-red-900">Tem certeza que deseja cancelar este agendamento?</p>
                        {cancelError && <p className="mt-2 text-sm text-red-700">{cancelError}</p>}
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <Button variant="outline" onClick={() => setConfirming(false)} disabled={cancelling}>
                            Voltar
                          </Button>
                          <button
                            type="button"
                            onClick={cancel}
                            disabled={cancelling}
                            className="inline-flex h-11 items-center justify-center rounded-full bg-red-700 px-5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                          >
                            {cancelling ? 'Cancelando…' : 'Confirmar cancelamento'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" className="w-full" onClick={() => setConfirming(true)}>
                        Cancelar agendamento
                      </Button>
                    )
                  ) : (
                    <p className="text-center text-sm text-muted">
                      Cancelamentos pelo site são possíveis até {data.cancelNoticeHours}h antes. Para cancelar agora, fale conosco pelo WhatsApp.
                    </p>
                  )}
                </div>
              )}
            </div>
            <p className="mt-6 text-center text-xs text-muted">Este link é pessoal. Não compartilhe.</p>
          </>
        ) : null}
      </div>
    </section>
  );
}

import { formatDateBR, type BookingDTO } from '@mf/shared';
import { bookingConfirmationMessage, manageBookingUrl, whatsappUrl } from '../../lib/whatsapp';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

interface SuccessStepProps {
  booking: BookingDTO;
  holdHours: number;
}

/**
 * Último passo: a pré-reserva está gravada; a cliente envia a mensagem pronta
 * pelo WhatsApp para a profissional confirmar. O botão é a ação principal da tela
 * (abrir o WhatsApp automaticamente após o envio seria bloqueado pelo navegador).
 */
export function SuccessStep({ booking, holdHours }: SuccessStepProps) {
  const url = whatsappUrl(bookingConfirmationMessage(booking));

  return (
    <div className="text-center">
      <span className="mx-auto grid size-20 place-items-center rounded-full bg-rose/15 text-rose-deep">
        <Icon name="check" size={36} strokeWidth={2} />
      </span>
      <h2 className="mt-6 font-serif text-4xl">Horário pré-reservado!</h2>
      <p className="mx-auto mt-3 max-w-md text-muted">
        Falta só um passo: envie a confirmação pelo WhatsApp. Seu horário fica reservado por{' '}
        <strong className="text-ink">{holdHours} horas</strong> aguardando essa mensagem.
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Assim que a Dra. Marjane confirmar o horário, você receberá a confirmação por e-mail.
      </p>

      <div className="mx-auto mt-8 max-w-sm rounded-3xl border border-line bg-white p-6 text-left shadow-soft">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">Seu agendamento</p>
        <p className="mt-2 font-serif text-2xl">{booking.procedure.name}</p>
        <p className="mt-1 text-ink/80">
          {formatDateBR(booking.date)} às {booking.time}
        </p>
        <p className="mt-4 text-sm text-muted">
          Código: <span className="font-mono font-semibold tracking-wider text-ink">{booking.code}</span>
        </p>
        {booking.manageToken && (
          <a
            href={manageBookingUrl(booking.manageToken)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-rose-deep underline-offset-4 hover:underline"
          >
            Gerenciar meu agendamento <Icon name="arrowRight" size={15} />
          </a>
        )}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Button href={url} variant="whatsapp" size="lg" icon="whatsapp" className="w-full sm:w-auto">
          Enviar confirmação no WhatsApp
        </Button>
        <Button to="/" variant="ghost">
          Voltar para o início
        </Button>
      </div>
    </div>
  );
}

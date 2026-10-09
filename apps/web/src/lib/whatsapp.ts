import { formatDateBR, type BookingDTO } from '@mf/shared';
import { site } from '../config/site';

export function whatsappUrl(message: string = site.whatsapp.defaultMessage): string {
  return `https://wa.me/${site.whatsapp.number}?text=${encodeURIComponent(message)}`;
}

export function procedureQuestionMessage(procedureName: string): string {
  return `Olá! Vim pelo site e gostaria de saber mais sobre ${procedureName}.`;
}

/** Link privado "gerenciar meu agendamento" (ver, cancelar, pedir alteração). */
export function manageBookingUrl(token: string): string {
  return `${window.location.origin}/agendamento/${token}`;
}

/** Mensagem enviada pela cliente para confirmar a pré-reserva feita no site. */
export function bookingConfirmationMessage(booking: BookingDTO): string {
  return [
    'Olá! Gostaria de confirmar meu agendamento.',
    '',
    `Procedimento: ${booking.procedure.name}`,
    `Data: ${formatDateBR(booking.date)}`,
    `Horário: ${booking.time}`,
    `Nome: ${booking.clientName}`,
    `Código: ${booking.code}`,
    '',
    'Agendamento realizado pelo site.',
    // M5: o link privado da cliente NÃO vai nesta mensagem (fica só na tela de sucesso, para ela)
  ].join('\n');
}

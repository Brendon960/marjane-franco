import { formatDateBR, formatPhoneBR } from '@mf/shared';

export interface ConfirmationEmailData {
  clientName: string;
  procedure: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:mm" */
  time: string;
  /** WhatsApp da clínica para contato (opcional), ex.: 5531998765432 */
  clinicWhatsapp?: string;
}

const escape = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * E-mail enviado à cliente quando a profissional confirma o agendamento.
 * Só o necessário: primeiro nome, procedimento, data, horário e contato — sem dados de saúde.
 */
export function confirmationEmail(data: ConfirmationEmailData) {
  const firstName = data.clientName.trim().split(/\s+/)[0] || data.clientName.trim();
  const date = formatDateBR(data.date);
  const contact = data.clinicWhatsapp ? formatPhoneBR(data.clinicWhatsapp) : null;
  const subject = `Agendamento confirmado — ${date} às ${data.time}`;

  const text = [
    `Olá, ${firstName}! 😊`,
    '',
    'Seu agendamento foi confirmado com sucesso!',
    '',
    `✨ Procedimento: ${data.procedure}`,
    `📅 Data: ${date}`,
    `🕐 Horário: ${data.time}`,
    '',
    'A Dra. Marjane estará aguardando você.',
    '',
    `Caso precise alterar ou cancelar seu horário, entre em contato conosco${contact ? ` pelo WhatsApp ${contact}` : ''}.`,
    '',
    'Obrigada pela preferência! 💕',
    '',
    'Dra. Marjane Franco',
  ].join('\n');

  const row = (icon: string, label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#75655e;font-size:14px;width:130px">${icon} ${label}</td><td style="padding:6px 0;color:#3b2f2b;font-size:15px;font-weight:600">${escape(value)}</td></tr>`;

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(subject)}</title></head>
<body style="margin:0;padding:0;background:#faf7f4;font-family:Arial,Helvetica,sans-serif;color:#3b2f2b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f4;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e8ddd4;border-radius:20px;padding:32px 28px">
        <tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#3b2f2b;padding-bottom:4px"><em style="color:#9a5f57">Dra.</em> Marjane Franco</td></tr>
        <tr><td style="font-size:11px;letter-spacing:3px;color:#b8956a;text-transform:uppercase;padding-bottom:24px">Estética · Melasma</td></tr>
        <tr><td style="font-size:18px;padding-bottom:8px">Olá, ${escape(firstName)}! 😊</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;padding-bottom:20px">Seu agendamento foi <strong style="color:#1f7a4d">confirmado com sucesso</strong>!</td></tr>
        <tr><td style="background:#f3eae2;border-radius:14px;padding:14px 18px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${row('✨', 'Procedimento', data.procedure)}
            ${row('📅', 'Data', date)}
            ${row('🕐', 'Horário', data.time)}
          </table>
        </td></tr>
        <tr><td style="font-size:15px;line-height:1.6;padding-top:20px">A Dra. Marjane estará aguardando você.</td></tr>
        <tr><td style="font-size:14px;line-height:1.6;color:#75655e;padding-top:12px">Caso precise alterar ou cancelar seu horário, entre em contato conosco${
          contact && data.clinicWhatsapp
            ? ` pelo WhatsApp <a href="https://wa.me/${escape(data.clinicWhatsapp.replace(/\D/g, ''))}" style="color:#9a5f57;font-weight:600">${escape(contact)}</a>`
            : ''
        }.</td></tr>
        <tr><td style="font-size:15px;padding-top:20px">Obrigada pela preferência! 💕</td></tr>
      </table>
      <p style="font-size:11px;color:#9a8a83;margin:16px 0 0">Você recebeu este e-mail porque agendou um horário com a Dra. Marjane Franco.</p>
    </td></tr>
  </table>
</body></html>`;

  return { subject, text, html };
}

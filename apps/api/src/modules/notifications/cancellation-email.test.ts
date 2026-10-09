import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cancellationEmail } from './cancellation-email.template';

const base = { clientName: 'Maria Silva', procedure: 'Botox', date: '2026-10-10', time: '09:00', clinicWhatsapp: '5531998765432' };

test('aviso de cancelamento com assunto, dados do agendamento, motivo e contato', () => {
  const { subject, text, html } = cancellationEmail({ ...base, reason: 'Indisponibilidade da profissional nesta data.' });
  assert.equal(subject, 'Seu agendamento foi cancelado — Dra. Marjane');
  assert.equal(
    text,
    [
      'Olá, Maria! 😊',
      '',
      'Informamos que seu agendamento foi cancelado.',
      '',
      'Procedimento: Botox',
      'Data: 10/10/2026',
      'Horário: 09:00',
      'Motivo: Indisponibilidade da profissional nesta data.',
      '',
      'Pedimos desculpas por qualquer inconveniente.',
      '',
      'Para verificar a possibilidade de remarcar seu atendimento, entre em contato conosco.',
      '',
      'WhatsApp: (31) 99876-5432',
      '',
      'Obrigada pela compreensão e pela preferência! 💕',
      '',
      'Dra. Marjane Franco',
    ].join('\n'),
  );
  assert.match(html, /Motivo/);
  assert.match(html, /https:\/\/wa\.me\/5531998765432/);
});

test('sem motivo informado, a linha "Motivo" não aparece', () => {
  const { text, html } = cancellationEmail({ ...base, reason: '  ' });
  assert.doesNotMatch(text, /Motivo/);
  assert.doesNotMatch(html, /Motivo/);
});

test('dados escapados no HTML', () => {
  const { html } = cancellationEmail({ ...base, clientName: '<b>Ana</b>', reason: '<script>alert(1)</script>' });
  assert.doesNotMatch(html, /<script>|<b>Ana/);
});

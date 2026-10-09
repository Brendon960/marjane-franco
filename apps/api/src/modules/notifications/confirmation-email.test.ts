import assert from 'node:assert/strict';
import { test } from 'node:test';
import { confirmationEmail } from './confirmation-email.template';

test('e-mail de confirmação com os dados reais do agendamento', () => {
  const { subject, text, html } = confirmationEmail({
    clientName: 'João da Silva',
    procedure: 'Limpeza de Pele',
    date: '2026-10-15',
    time: '14:00',
    clinicWhatsapp: '5531998765432',
  });
  assert.equal(subject, 'Agendamento confirmado — 15/10/2026 às 14:00');
  assert.match(text, /^Olá, João! 😊\n\nSeu agendamento foi confirmado com sucesso!/);
  assert.match(text, /✨ Procedimento: Limpeza de Pele\n📅 Data: 15\/10\/2026\n🕐 Horário: 14:00/);
  assert.match(text, /A Dra\. Marjane estará aguardando você\./);
  assert.match(text, /entre em contato conosco pelo WhatsApp \(31\) 99876-5432\./);
  assert.match(text, /Obrigada pela preferência! 💕/);
  assert.match(html, /Olá, João!/);
  assert.match(html, /https:\/\/wa\.me\/5531998765432/);
});

test('dados da cliente são escapados no HTML', () => {
  const { html } = confirmationEmail({ clientName: '<b>Ana</b> Souza', procedure: 'Botox <script>', date: '2026-10-15', time: '09:00' });
  assert.doesNotMatch(html, /<script>|<b>Ana/);
  assert.match(html, /&lt;script&gt;/);
});

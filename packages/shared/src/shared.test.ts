import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatPhoneBR, normalizePhone } from './phone';
import { bookingRequestSchema } from './schemas';
import { addDays, dayOfWeek, isValidDate, toBusinessDate, toBusinessTime, zonedDateTime } from './time';

describe('telefone', () => {
  it('normaliza formatos comuns para 55 + DDD + número', () => {
    assert.equal(normalizePhone('(31) 99876-5432'), '5531998765432');
    assert.equal(normalizePhone('+55 31 99876-5432'), '5531998765432');
    assert.equal(normalizePhone('3132100000'), '553132100000');
  });

  it('rejeita números inválidos', () => {
    assert.equal(normalizePhone('99876-5432'), null);
    assert.equal(normalizePhone('(31) 82000-3957'), null);
    assert.equal(normalizePhone('(01) 99876-5432'), null);
  });

  it('formata para exibição', () => {
    assert.equal(formatPhoneBR('5531998765432'), '(31) 99876-5432');
  });
});

describe('datas', () => {
  it('converte data/horário locais para o instante correto (UTC-3)', () => {
    assert.equal(zonedDateTime('2026-10-15', '14:00').toISOString(), '2026-10-15T17:00:00.000Z');
    assert.equal(toBusinessDate(new Date('2026-10-16T02:30:00Z')), '2026-10-15');
    assert.equal(toBusinessTime(new Date('2026-10-15T17:00:00Z')), '14:00');
  });

  it('valida datas inexistentes e calcula dia da semana', () => {
    assert.equal(isValidDate('2026-02-30'), false);
    assert.equal(isValidDate('2026-10-15'), true);
    assert.equal(dayOfWeek('2026-10-15'), 4); // quinta-feira
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  });
});

describe('agendamento', () => {
  const valid = {
    procedureSlug: 'botox',
    date: '2026-10-15',
    time: '14:00',
    name: '  Maria   da Silva ',
    phone: '(31) 99876-5432',
    email: ' Maria@Example.com ',
    notes: 'Primeira vez\r\n\r\n\r\n\r\nobrigada',
    consent: true,
    website: '',
  };

  it('normaliza e sanitiza os dados válidos', () => {
    const parsed = bookingRequestSchema.parse(valid);
    assert.equal(parsed.name, 'Maria da Silva');
    assert.equal(parsed.phone, '5531998765432');
    assert.equal(parsed.email, 'maria@example.com');
    assert.equal(parsed.notes, 'Primeira vez\n\nobrigada');
  });

  it('rejeita sem consentimento, honeypot preenchido ou nome com HTML', () => {
    assert.equal(bookingRequestSchema.safeParse({ ...valid, consent: false }).success, false);
    assert.equal(bookingRequestSchema.safeParse({ ...valid, website: 'spam' }).success, false);
    assert.equal(bookingRequestSchema.safeParse({ ...valid, name: '<script>x</script> a' }).success, false);
  });

  it('exige e-mail válido (a confirmação é enviada por e-mail)', () => {
    assert.equal(bookingRequestSchema.safeParse({ ...valid, email: '' }).success, false);
    assert.equal(bookingRequestSchema.safeParse({ ...valid, email: undefined }).success, false);
    assert.equal(bookingRequestSchema.safeParse({ ...valid, email: 'maria@' }).success, false);
  });
});

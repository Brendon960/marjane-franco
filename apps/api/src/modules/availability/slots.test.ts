import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { minutesToTime, timeToMinutes } from '@mf/shared';
import { computeSlots, type MinuteRange } from './slots';

const range = (start: string, end: string): MinuteRange => ({ start: timeToMinutes(start), end: timeToMinutes(end) });

// Segunda a sexta: 08:00–12:00 e 13:30–18:00 (almoço 12:00–13:30)
const weekday = [range('08:00', '12:00'), range('13:30', '18:00')];

const slots = (opts: Partial<Parameters<typeof computeSlots>[0]> = {}) =>
  computeSlots({
    intervals: weekday,
    busy: [],
    durationMinutes: 60,
    stepMinutes: 30,
    earliestStart: -Infinity,
    ...opts,
  }).map(minutesToTime);

describe('computeSlots', () => {
  it('oferece horários que cabem no expediente, respeitando o almoço', () => {
    const result = slots();
    assert.equal(result[0], '08:00');
    assert.ok(result.includes('11:00'), '11:00–12:00 cabe antes do almoço');
    assert.ok(!result.includes('11:30'), '11:30–12:30 invadiria o almoço');
    assert.ok(!result.includes('12:00') && !result.includes('13:00'));
    assert.ok(result.includes('13:30'));
    assert.equal(result.at(-1), '17:00', 'último início que termina às 18:00');
  });

  it('bloqueia todo o período de um atendimento existente (regra 10:00–11:00)', () => {
    const result = slots({ busy: [range('10:00', '11:00')] });
    assert.ok(!result.includes('09:30'), '09:30–10:30 sobrepõe');
    assert.ok(!result.includes('10:00'));
    assert.ok(!result.includes('10:30'), '10:30 não pode ser agendado');
    assert.ok(result.includes('09:00'), '09:00–10:00 encosta mas não sobrepõe');
    assert.ok(result.includes('11:00'));
  });

  it('considera a duração do procedimento escolhido', () => {
    const result = slots({ durationMinutes: 90, busy: [range('10:00', '11:00')] });
    assert.ok(result.includes('08:30'), '08:30–10:00 termina exatamente quando o outro começa');
    assert.ok(!result.includes('09:00'), '09:00–10:30 sobrepõe 10:00');
    assert.ok(!result.includes('10:30') && !result.includes('11:00'), '11:00–12:30 invadiria o almoço');
    assert.equal(result.at(-1), '16:30');
  });

  it('respeita bloqueios de dia inteiro e antecedência mínima', () => {
    assert.deepEqual(slots({ busy: [range('00:00', '23:59')] }), []);
    const result = slots({ earliestStart: timeToMinutes('14:10') });
    assert.equal(result[0], '14:30');
  });

  it('dia sem expediente não tem horários', () => {
    assert.deepEqual(slots({ intervals: [] }), []);
  });
});

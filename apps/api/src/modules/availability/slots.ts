/** Intervalo em minutos a partir da meia-noite do dia consultado. [start, end) */
export interface MinuteRange {
  start: number;
  end: number;
}

export interface SlotOptions {
  /** Expediente do dia (vários intervalos = pausa para almoço entre eles). */
  intervals: MinuteRange[];
  /** Períodos ocupados: agendamentos (já com a folga entre atendimentos) e bloqueios. */
  busy: MinuteRange[];
  durationMinutes: number;
  stepMinutes: number;
  /** Primeiro minuto em que um atendimento pode começar (antecedência mínima). */
  earliestStart: number;
}

/**
 * Calcula os horários de início disponíveis em um dia.
 *
 * Um horário só é oferecido se o atendimento INTEIRO (início + duração) couber
 * dentro de um único intervalo do expediente e não encostar em nenhum período ocupado.
 * Ex.: limpeza de 60 min agendada às 10:00 ocupa 10:00–11:00, então 09:30 e 10:30
 * deixam de aparecer para outro procedimento de 60 min.
 */
export function computeSlots({ intervals, busy, durationMinutes, stepMinutes, earliestStart }: SlotOptions): number[] {
  const slots = new Set<number>();
  for (const interval of intervals) {
    for (let start = interval.start; start + durationMinutes <= interval.end; start += stepMinutes) {
      const end = start + durationMinutes;
      if (start < earliestStart) continue;
      if (busy.some((b) => start < b.end && end > b.start)) continue;
      slots.add(start);
    }
  }
  return [...slots].sort((a, b) => a - b);
}

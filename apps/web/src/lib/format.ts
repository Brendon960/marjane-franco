const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export { WEEKDAYS_SHORT };

/** "2026-10" → "Outubro de 2026" */
export function formatMonthTitle(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const name = MONTHS[m! - 1]!;
  return `${name[0]!.toUpperCase()}${name.slice(1)} de ${y}`;
}

/** "2026-10-15" → "quinta-feira, 15 de outubro" */
export function formatLongDate(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()]!;
  return `${weekday}, ${d} de ${MONTHS[m! - 1]}`;
}

export function formatPrice(price: number | null): string {
  if (price === null) return 'Valor sob avaliação';
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Agrupa intervalos do expediente por dia para exibir no rodapé. Ex.: "Seg a Sex · 08:00–12:00, 13:30–18:00" */
export function summarizeHours(hours: { dayOfWeek: number; startTime: string; endTime: string }[]): string[] {
  const byDay = new Map<number, string>();
  for (const h of hours) {
    const prev = byDay.get(h.dayOfWeek);
    byDay.set(h.dayOfWeek, prev ? `${prev}, ${h.startTime}–${h.endTime}` : `${h.startTime}–${h.endTime}`);
  }
  const lines: string[] = [];
  const days = [1, 2, 3, 4, 5, 6, 0].filter((d) => byDay.has(d));
  let i = 0;
  while (i < days.length) {
    let j = i;
    while (j + 1 < days.length && byDay.get(days[j + 1]!) === byDay.get(days[i]!) && (days[j + 1]! - days[j]! === 1)) j++;
    const label = i === j ? WEEKDAYS_SHORT[days[i]!] : `${WEEKDAYS_SHORT[days[i]!]} a ${WEEKDAYS_SHORT[days[j]!]}`;
    lines.push(`${label} · ${byDay.get(days[i]!)}`);
    i = j + 1;
  }
  return lines;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

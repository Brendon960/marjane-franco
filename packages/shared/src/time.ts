/**
 * Datas e horários do negócio.
 *
 * O Brasil não tem horário de verão desde 2019, então o fuso de Brasília é um
 * offset fixo (-03:00). Datas trafegam como "YYYY-MM-DD" e horários como "HH:mm",
 * sempre no horário local da clínica; o banco guarda instantes absolutos (timestamptz).
 */
export const BUSINESS_TIME_ZONE = 'America/Sao_Paulo';
export const BUSINESS_UTC_OFFSET = '-03:00';

export const ISO_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const ISO_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const pad = (n: number) => String(n).padStart(2, '0');

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h! * 60 + m!;
}

export function minutesToTime(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** Instante absoluto correspondente a uma data + horário locais da clínica. */
export function zonedDateTime(date: string, time = '00:00'): Date {
  return new Date(`${date}T${time}:00${BUSINESS_UTC_OFFSET}`);
}

/** Data local ("YYYY-MM-DD") de um instante. */
export function toBusinessDate(instant: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE }).format(instant);
}

/** Horário local ("HH:mm") de um instante. */
export function toBusinessTime(instant: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
}

/** 0 = domingo … 6 = sábado. */
export function dayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysInMonth(month: string): string[] {
  const [y, m] = month.split('-').map(Number);
  const total = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  return Array.from({ length: total }, (_, i) => `${month}-${pad(i + 1)}`);
}

export function isValidDate(date: string): boolean {
  return ISO_DATE_RE.test(date) && new Date(`${date}T12:00:00Z`).toISOString().startsWith(date);
}

/** "2026-10-15" → "15/10/2026" */
export function formatDateBR(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${pad(m)}` : `${h}h`;
}

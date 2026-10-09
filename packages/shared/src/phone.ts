/**
 * Normaliza um telefone brasileiro para o formato usado no banco e no WhatsApp:
 * "55" + DDD + número (ex.: "5531998765432"). Retorna null se for inválido.
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  if (digits.length !== 10 && digits.length !== 11) return null;
  if (digits[0] === '0' || digits[1] === '0') return null;
  if (digits.length === 11 && digits[2] !== '9') return null;
  return `55${digits}`;
}

/** "5531998765432" → "(31) 99876-5432" */
export function formatPhoneBR(phone: string): string {
  const d = phone.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

/** Máscara progressiva para o campo de WhatsApp enquanto a pessoa digita. */
export function maskPhoneInput(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

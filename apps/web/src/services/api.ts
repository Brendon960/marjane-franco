import type {
  ApiErrorBody,
  BookingDTO,
  BookingRequestInput,
  BusinessInfoDTO,
  DayAvailabilityDTO,
  ManageBookingDTO,
  ProcedureDTO,
  SlotsDTO,
} from '@mf/shared';

export const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

/**
 * Fotos enviadas pelo painel são servidas pela API ("/api/media/<id>").
 * Se a API estiver em outro domínio (VITE_API_URL absoluta), monta a URL completa.
 */
export function assetUrl(url: string): string {
  return url.startsWith('/api/') && /^https?:\/\//.test(BASE_URL) ? `${BASE_URL.replace(/\/api\/?$/, '')}${url}` : url;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK', 'Não foi possível conectar. Verifique sua internet ou fale conosco pelo WhatsApp.');
  }

  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const err = body as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      err?.error ?? 'UNKNOWN',
      err?.message ?? 'Ocorreu um erro inesperado. Tente novamente ou fale conosco pelo WhatsApp.',
      err?.fields,
    );
  }
  return body as T;
}

const qs = (params: Record<string, string>) => new URLSearchParams(params).toString();

export const api = {
  procedures: (signal?: AbortSignal) => request<ProcedureDTO[]>('/procedures', { signal }),
  businessInfo: (signal?: AbortSignal) => request<BusinessInfoDTO>('/business-info', { signal }),
  availableDays: (procedure: string, month: string, signal?: AbortSignal) =>
    request<DayAvailabilityDTO[]>(`/availability/days?${qs({ procedure, month })}`, { signal }),
  slots: (procedure: string, date: string, signal?: AbortSignal) =>
    request<SlotsDTO>(`/availability/slots?${qs({ procedure, date })}`, { signal }),
  book: (payload: BookingRequestInput) =>
    request<BookingDTO>('/appointments', { method: 'POST', body: JSON.stringify(payload) }),
  /** Link privado da cliente ("gerenciar meu agendamento") */
  manageBooking: (token: string, signal?: AbortSignal) =>
    request<ManageBookingDTO>(`/manage/${encodeURIComponent(token)}`, { signal }),
  cancelBooking: (token: string) =>
    request<null>(`/manage/${encodeURIComponent(token)}/cancel`, { method: 'POST' }),
};

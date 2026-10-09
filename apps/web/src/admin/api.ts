import type {
  AdminAppointmentDTO,
  AdminProcedureDTO,
  AgendaDayDTO,
  ApiErrorBody,
  AuditLogDTO,
  BlockedTimeCreatedDTO,
  BlockedTimeDTO,
  BulkCancelResultDTO,
  BusinessHoursDTO,
  BusinessSettingsDTO,
  ClientDetailDTO,
  ClientSummaryDTO,
  DashboardDTO,
  Paginated,
  SessionUserDTO,
  SlotCheckDTO,
  SystemInfoDTO,
  SystemSettingsDTO,
  UserDTO,
  UserPasswordResetDTO,
} from '@mf/shared';
import { ApiError, BASE_URL } from '../services/api';

/** Disparado quando a sessão expira: o painel volta para a tela de login. */
export const UNAUTHORIZED_EVENT = 'mf:unauthorized';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      credentials: 'include', // cookie de sessão (httpOnly)
      headers: isForm || !init.body ? init.headers : { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK', 'Sem conexão com o servidor. Verifique sua internet e tente novamente.');
  }

  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const err = body as ApiErrorBody | null;
    if (response.status === 401 && !path.startsWith('/auth/login')) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(response.status, err?.error ?? 'UNKNOWN', err?.message ?? 'Ocorreu um erro inesperado.', err?.fields);
  }
  return body as T;
}

const qs = (params: Record<string, string | number | undefined | null>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '') as [string, string][];
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : '';
};

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const adminApi = {
  // Sessão
  me: (signal?: AbortSignal) => request<SessionUserDTO>('/auth/me', { signal }),
  login: (email: string, password: string) => request<SessionUserDTO>('/auth/login', json('POST', { email, password })),
  logout: () => request<null>('/auth/logout', json('POST')),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<null>('/auth/password', json('POST', { currentPassword, newPassword })),

  // Dashboard e agenda
  dashboard: (signal?: AbortSignal) => request<DashboardDTO>('/admin/dashboard', { signal }),
  agenda: (date: string, signal?: AbortSignal) => request<AgendaDayDTO>(`/admin/agenda${qs({ date })}`, { signal }),
  appointments: (params: { from?: string; to?: string; status?: string; search?: string; page?: number }, signal?: AbortSignal) =>
    request<Paginated<AdminAppointmentDTO>>(`/admin/appointments${qs(params)}`, { signal }),
  appointment: (id: string, signal?: AbortSignal) => request<AdminAppointmentDTO>(`/admin/appointments/${id}`, { signal }),
  suggestSlots: (params: { procedureId: string; date: string; excludeId?: string }, signal?: AbortSignal) =>
    request<{ date: string; slots: string[] }>(`/admin/slots${qs(params)}`, { signal }),
  checkSlot: (params: { procedureId: string; date: string; time: string; excludeId?: string }, signal?: AbortSignal) =>
    request<SlotCheckDTO>(`/admin/slots/check${qs(params)}`, { signal }),
  createAppointment: (data: {
    name: string;
    phone: string;
    email?: string;
    procedureId: string;
    date: string;
    time: string;
    notes?: string;
    status: 'CONFIRMED' | 'PENDING';
  }) => request<AdminAppointmentDTO>('/admin/appointments', json('POST', data)),
  reschedule: (id: string, date: string, time: string) =>
    request<AdminAppointmentDTO>(`/admin/appointments/${id}/reschedule`, json('POST', { date, time })),
  cancel: (id: string, reason?: string) => request<AdminAppointmentDTO>(`/admin/appointments/${id}/cancel`, json('POST', { reason })),
  setStatus: (id: string, status: 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW') =>
    request<AdminAppointmentDTO>(`/admin/appointments/${id}/status`, json('POST', { status })),
  /** Cancelamento em massa: cada cliente recebe o próprio e-mail */
  bulkCancel: (ids: string[], reason?: string) =>
    request<BulkCancelResultDTO>('/admin/appointments/bulk-cancel', json('POST', { ids, reason })),
  /** Enviar novamente o aviso de cancelamento para a cliente */
  resendCancellationEmail: (id: string) =>
    request<AdminAppointmentDTO>(`/admin/appointments/${id}/cancellation-email`, json('POST')),
  /** Enviar novamente o e-mail de confirmação para a cliente */
  resendConfirmationEmail: (id: string) =>
    request<AdminAppointmentDTO>(`/admin/appointments/${id}/confirmation-email`, json('POST')),

  // Clientes
  clients: (params: { search?: string; page?: number }, signal?: AbortSignal) =>
    request<Paginated<ClientSummaryDTO>>(`/admin/clients${qs(params)}`, { signal }),
  client: (id: string, signal?: AbortSignal) => request<ClientDetailDTO>(`/admin/clients/${id}`, { signal }),
  updateClient: (id: string, data: { name: string; phone: string; email: string }) =>
    request<ClientSummaryDTO>(`/admin/clients/${id}`, json('PATCH', data)),

  // Procedimentos e fotos
  procedures: (signal?: AbortSignal) => request<AdminProcedureDTO[]>('/admin/procedures', { signal }),
  createProcedure: (data: Record<string, unknown>) => request<AdminProcedureDTO>('/admin/procedures', json('POST', data)),
  updateProcedure: (id: string, data: Record<string, unknown>) =>
    request<AdminProcedureDTO>(`/admin/procedures/${id}`, json('PATCH', data)),
  uploadProcedureImage: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<AdminProcedureDTO>(`/admin/procedures/${id}/image`, { method: 'POST', body: form });
  },
  removeProcedureImage: (id: string) => request<AdminProcedureDTO>(`/admin/procedures/${id}/image`, json('DELETE')),

  // Horários, bloqueios e configurações
  businessHours: (signal?: AbortSignal) => request<BusinessHoursDTO>('/admin/business-hours', { signal }),
  saveBusinessHours: (data: BusinessHoursDTO) => request<BusinessHoursDTO>('/admin/business-hours', json('PUT', data)),
  blockedTimes: (signal?: AbortSignal) => request<BlockedTimeDTO[]>('/admin/blocked-times', { signal }),
  createBlock: (data: {
    startDate: string;
    endDate?: string | null;
    allDay: boolean;
    startTime?: string | null;
    endTime?: string | null;
    reason?: string | null;
  }) => request<BlockedTimeCreatedDTO>('/admin/blocked-times', json('POST', data)),
  deleteBlock: (id: string) => request<null>(`/admin/blocked-times/${id}`, json('DELETE')),
  settings: (signal?: AbortSignal) => request<BusinessSettingsDTO>('/admin/settings', { signal }),
  saveSettings: (data: BusinessSettingsDTO) => request<BusinessSettingsDTO>('/admin/settings', json('PUT', data)),

  // Super Administrador
  users: (signal?: AbortSignal) => request<UserDTO[]>('/super-admin/users', { signal }),
  createUser: (data: { name: string; email: string; role: string; password: string }) =>
    request<UserDTO>('/super-admin/users', json('POST', data)),
  updateUser: (id: string, data: Partial<{ name: string; email: string; role: string; active: boolean }>) =>
    request<UserDTO>(`/super-admin/users/${id}`, json('PATCH', data)),
  resetUserPassword: (id: string) => request<UserPasswordResetDTO>(`/super-admin/users/${id}/reset-password`, json('POST')),
  deleteUser: (id: string) => request<null>(`/super-admin/users/${id}`, json('DELETE')),
  auditLogs: (params: { search?: string; entity?: string; page?: number }, signal?: AbortSignal) =>
    request<Paginated<AuditLogDTO>>(`/super-admin/audit-logs${qs(params)}`, { signal }),
  system: (signal?: AbortSignal) => request<SystemInfoDTO>('/super-admin/system', { signal }),
  /** Testa a conexão SMTP (não envia e-mail) */
  emailCheck: () => request<SystemInfoDTO['email']>('/super-admin/system/email-check', json('POST')),
  saveSystemSettings: (data: SystemSettingsDTO) => request<SystemSettingsDTO>('/super-admin/system-settings', json('PUT', data)),
};

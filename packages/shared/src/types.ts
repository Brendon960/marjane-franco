export type ProcedureCategory = 'PELE' | 'HARMONIZACAO' | 'CORPORAL' | 'AVALIACAO';

export const CATEGORY_LABELS: Record<ProcedureCategory, string> = {
  PELE: 'Pele',
  HARMONIZACAO: 'Harmonização facial',
  CORPORAL: 'Corporal',
  AVALIACAO: 'Avaliação',
};

export interface ProcedureDTO {
  slug: string;
  name: string;
  category: ProcedureCategory;
  shortDescription: string;
  description: string;
  highlights: string[];
  durationMinutes: number;
  /** null = "valor sob avaliação" */
  price: number | null;
  imageUrl: string | null;
  requiresEvaluation: boolean;
  featured: boolean;
}

export interface DayAvailabilityDTO {
  date: string;
  available: boolean;
}

export interface SlotsDTO {
  date: string;
  procedureSlug: string;
  slots: string[];
}

export interface BusinessHourDTO {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface BusinessInfoDTO {
  hours: BusinessHourDTO[];
  paymentMethods: string[];
  address: string | null;
  maxDaysAhead: number;
  pendingHoldHours: number;
  /** false = agenda online pausada pelo responsável técnico; o site direciona para o WhatsApp */
  onlineBookingEnabled: boolean;
}

export interface BookingDTO {
  id: string;
  /** Código curto que a cliente envia no WhatsApp para a profissional localizar o agendamento. */
  code: string;
  status: 'PENDING' | 'CONFIRMED';
  procedure: { slug: string; name: string; requiresEvaluation: boolean };
  date: string;
  time: string;
  endTime: string;
  clientName: string;
  phone: string;
  expiresAt: string | null;
  /** Token do link privado "gerenciar meu agendamento" — só é enviado na criação. */
  manageToken?: string;
}

export interface ApiErrorBody {
  error: string;
  message: string;
  fields?: Record<string, string>;
}

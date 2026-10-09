import { CATALOG_AS_DTO, type BusinessInfoDTO, type ProcedureDTO } from '@mf/shared';
import { api } from '../services/api';
import { useAsync } from './useAsync';

/** Cache por sessão: procedimentos e horários mudam raramente, não precisam ser buscados a cada página. */
function cached<T>(load: () => Promise<T>) {
  let promise: Promise<T> | null = null;
  return () => {
    promise ??= load().catch((error) => {
      promise = null;
      throw error;
    });
    return promise;
  };
}

const loadProcedures = cached(() => api.procedures());
const loadBusinessInfo = cached(() => api.businessInfo());

/**
 * Procedimentos ativos. Se a API estiver fora do ar, a landing page usa o
 * catálogo inicial para nunca aparecer vazia (`offline` indica essa situação).
 */
export function useProcedures(): { procedures: ProcedureDTO[]; loading: boolean; offline: boolean } {
  const { data, error, loading } = useAsync(() => loadProcedures(), []);
  return { procedures: data ?? (error ? CATALOG_AS_DTO : []), loading, offline: Boolean(error) };
}

/** Horário de funcionamento, formas de pagamento e endereço. null enquanto carrega ou se falhar. */
export function useBusinessInfo(): BusinessInfoDTO | null {
  return useAsync(() => loadBusinessInfo(), []).data ?? null;
}

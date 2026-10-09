import { useCallback, useEffect, useState } from 'react';

interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
}

/** Executa uma chamada assíncrona quando as dependências mudam, cancelando a anterior. */
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: readonly unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, error: undefined, loading: true });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ data: s.data, error: undefined, loading: true }));
    fn(controller.signal).then(
      (data) => !controller.signal.aborted && setState({ data, error: undefined, loading: false }),
      (error: Error) => !controller.signal.aborted && setState({ data: undefined, error, loading: false }),
    );
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}

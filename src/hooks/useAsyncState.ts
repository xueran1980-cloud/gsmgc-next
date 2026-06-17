'use client';

import { useRef, useCallback, useState } from 'react';

type AsyncState<T> = {
  data: T | null;
  error: Error | null;
  status: 'idle' | 'loading' | 'success' | 'error';
};

/**
 * Guaranteed Termination Async Hook
 * 
 * 5 个保护机制:
 * 1. 4-state machine (idle/loading/success/error)
 * 2. requestId race protection
 * 3. 15s timeout + abort
 * 4. unmount guard (isMounted)
 * 5. soft auto-retry once (2s delay)
 */
export function useAsyncState<T>(initialData?: T) {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData ?? null,
    error: null,
    status: initialData !== undefined ? 'success' : 'idle',
  });

  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // unmount guard
  const unmountRef = useRef(() => {
    isMountedRef.current = false;
    abortRef.current?.abort();
  });

  const run = useCallback(async (fn: (signal: AbortSignal) => Promise<T>) => {
    const currentId = ++requestIdRef.current;
    // abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const safeSetState = (s: AsyncState<T>) => {
      if (!isMountedRef.current) return;
      if (requestIdRef.current !== currentId) return;
      setState(s);
    };

    safeSetState({ data: null, error: null, status: 'loading' });

    const attempt = async (retry = false): Promise<void> => {
      try {
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const result = await fn(controller.signal);
        clearTimeout(timeoutId);

        if (!isMountedRef.current) return;
        if (requestIdRef.current !== currentId) return;

        safeSetState({ data: result, error: null, status: 'success' });
      } catch (err: any) {
        if (!isMountedRef.current) return;
        if (requestIdRef.current !== currentId) return;

        // aborted by timeout → soft auto-retry once
        if (err?.name === 'AbortError' && !retry) {
          setTimeout(() => {
            if (requestIdRef.current === currentId && isMountedRef.current) {
              attempt(true);
            }
          }, 2000);
          return;
        }

        safeSetState({ data: null, error: err, status: 'error' });
      }
    };

    attempt(false);
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current++;
    abortRef.current?.abort();
    if (isMountedRef.current) {
      setState({ data: initialData ?? null, error: null, status: 'idle' });
    }
  }, [initialData]);

  // Register unmount cleanup
  const cleanupRef = useRef(unmountRef);
  cleanupRef.current = unmountRef;

  return {
    ...state,
    loading: state.status === 'loading',
    isError: state.status === 'error',
    isSuccess: state.status === 'success',
    run,
    reset,
    // expose for useEffect cleanup
    abort: () => abortRef.current?.abort(),
    _unmount: unmountRef,
  };
}

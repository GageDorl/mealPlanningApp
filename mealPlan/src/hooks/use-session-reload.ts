import { useEffect, useRef } from 'react';
import { useSessionContext } from '@/contexts/session-context';

export function useSessionReload(reload: () => void) {
  const { sessionReady } = useSessionContext();
  const wasNotReady = useRef(false);

  useEffect(() => {
    if (!sessionReady) {
      wasNotReady.current = true;
    } else if (wasNotReady.current) {
      wasNotReady.current = false;
      reload();
    }
  }, [sessionReady, reload]);
}

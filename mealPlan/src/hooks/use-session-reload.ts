import { useEffect, useRef } from 'react';
import { useSessionContext } from '@/contexts/session-context';

export function useSessionReload(reload: () => void) {
  const { sessionReady } = useSessionContext();
  const wasNotReady = useRef(false);

  useEffect(() => {
    if (!sessionReady) {
      wasNotReady.current = true;
      console.log('[session-reload] session not ready — will trigger reload when it recovers');
    } else if (wasNotReady.current) {
      wasNotReady.current = false;
      console.log('[session-reload] session became ready — triggering data reload');
      reload();
    }
  }, [sessionReady, reload]);
}

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from '@/services/supabase';
import { LoadingModal } from '@/components/ui/loading-modal';

interface SessionContextValue {
  sessionReady: boolean;
}

const SessionContext = createContext<SessionContextValue>({ sessionReady: true });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionReady, setSessionReady] = useState(true);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const refreshing = useRef(false);

  // Immediately unblocks the app; the background refresh may still be in flight
  const handleDismiss = useCallback(() => {
    console.log('[session] user dismissed overlay — refresh may still be in flight');
    setOverlayVisible(false);
    setSessionReady(true);
  }, []);

  const doRefresh = useCallback(async () => {
    if (refreshing.current) {
      console.log('[session] refresh already in progress, skipping');
      return;
    }
    refreshing.current = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const nowSecs = Math.floor(Date.now() / 1000);
      const expiresAt = session?.expires_at;
      const needsRefresh =
        !!session?.access_token &&
        (expiresAt === undefined || expiresAt < nowSecs + 30);

      console.log(
        `[session] foreground check | hasSession: ${!!session?.access_token}` +
        ` | expiresAt: ${expiresAt ?? 'none'} | now: ${nowSecs}` +
        ` | secsUntilExpiry: ${expiresAt ? expiresAt - nowSecs : 'n/a'}` +
        ` | needsRefresh: ${needsRefresh}`,
      );

      if (!needsRefresh) return;

      setSessionReady(false);
      setOverlayVisible(true);

      const t0 = Date.now();
      console.log('[session] starting token refresh...');

      const outcome = await Promise.race([
        supabase.auth.refreshSession()
          .then(({ error }) => (error ? `error: ${error.message}` : 'ok'))
          .catch((e: unknown) => `threw: ${e instanceof Error ? e.message : String(e)}`),
        new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), 8000)),
      ]);

      console.log(`[session] refresh outcome: ${outcome} (${Date.now() - t0}ms)`);
    } finally {
      refreshing.current = false;
      setSessionReady(true);
      setOverlayVisible(false);
      supabase.auth.startAutoRefresh();
    }
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    if (Platform.OS !== 'web') {
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          doRefresh();
        } else {
          supabase.auth.stopAutoRefresh();
        }
      });
      cleanup = () => sub.remove();
    } else if (typeof document !== 'undefined') {
      const onVisibility = () => {
        if (!document.hidden) doRefresh();
      };
      document.addEventListener('visibilitychange', onVisibility);
      cleanup = () => document.removeEventListener('visibilitychange', onVisibility);
    }

    return () => cleanup?.();
  }, [doRefresh]);

  return (
    <SessionContext.Provider value={{ sessionReady }}>
      {children}
      <LoadingModal
        visible={overlayVisible}
        message="Refreshing session..."
        onDismiss={handleDismiss}
      />
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  return useContext(SessionContext);
}

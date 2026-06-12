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
    setOverlayVisible(false);
    setSessionReady(true);
  }, []);

  const doRefresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const nowSecs = Date.now() / 1000;
      // Only refresh an *existing* expiring session — don't block the UI when
      // there's no session yet (e.g. during the OAuth sign-in callback).
      const needsRefresh =
        !!session?.access_token &&
        (session.expires_at === undefined || session.expires_at < nowSecs + 30);

      if (!needsRefresh) return;

      setSessionReady(false);
      setOverlayVisible(true);

      // 8-second timeout so a hanging network call can't block the app forever
      await Promise.race([
        supabase.auth.refreshSession(),
        new Promise<void>((resolve) => setTimeout(resolve, 8000)),
      ]);
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

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from '@/services/supabase';
import { LoadingModal } from '@/components/ui/loading-modal';

// Module-level ref — updated without causing re-renders; hooks read it in closures
export const foregroundAtRef: { current: number } = { current: 0 };

interface SessionContextValue {
  sessionReady: boolean;
}

const SessionContext = createContext<SessionContextValue>({ sessionReady: true });

// Chrome may cancel (not just freeze) setTimeout timers for backgrounded tabs.
// If an auto-refresh tick fired just before the tab was hidden, its fetch's
// AbortController timer may never fire, leaving _refreshingDeferred pending
// forever. Every getSession() call then waits on that deferred indefinitely.
// This clears the stale deferred on foreground return so callers can proceed.
function clearStaleRefresh(refreshing: { current: boolean }) {
  const auth = (supabase as any).auth;
  if (auth._refreshingDeferred) {
    console.log('[session] clearing stale _refreshingDeferred from background');
    try {
      auth._refreshingDeferred.reject(new Error('[session] cleared on foreground'));
    } catch {
      // already settled
    }
    auth._refreshingDeferred = null;
  }
  // Also reset the lock so a new doRefresh can start even if the previous one
  // is still stuck awaiting the now-cleared deferred.
  refreshing.current = false;
}

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
      // Wrap getSession() — if a fresh _refreshingDeferred gets set between the
      // clearStaleRefresh call and here, we need a ceiling to fall through to finally.
      let session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] = null;
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('[session] getSession timeout')), 6000)),
        ]);
        session = result.data.session;
      } catch (e) {
        console.log('[session] getSession failed:', e instanceof Error ? e.message : String(e));
        return;
      }
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

      // refreshSession() timed out but is still in-flight with _refreshingDeferred set.
      // Any data fetch calling getSession() is blocked on it. Clear it so they can
      // fail fast and be retried when sessionReady flips back to true below.
      if (outcome === 'timeout') {
        const auth = (supabase as any).auth;
        if (auth._refreshingDeferred) {
          console.log('[session] clearing stale _refreshingDeferred after refresh timeout');
          try { auth._refreshingDeferred.reject(new Error('[session] refresh timed out')); } catch { /* already settled */ }
          auth._refreshingDeferred = null;
        }
      }
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
        const ts = new Date().toISOString();
        if (state === 'active') {
          console.log(`[session] AppState → active at ${ts}`);
          clearStaleRefresh(refreshing);
          foregroundAtRef.current = Date.now();
          doRefresh();
        } else {
          console.log(`[session] AppState → ${state} at ${ts}`);
          supabase.auth.stopAutoRefresh();
        }
      });
      cleanup = () => sub.remove();
    } else if (typeof document !== 'undefined') {
      const onVisibility = () => {
        if (!document.hidden) {
          console.log(`[session] visibilitychange → visible at ${new Date().toISOString()}`);
          clearStaleRefresh(refreshing);
          foregroundAtRef.current = Date.now();
          doRefresh();
        } else {
          console.log(`[session] visibilitychange → hidden at ${new Date().toISOString()}`);
          supabase.auth.stopAutoRefresh();
        }
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

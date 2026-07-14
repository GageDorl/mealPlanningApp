import { useEffect, useState } from 'react';
import { supabase, getCachedUserId } from '@/services/supabase';

// getCachedUserId() alone doesn't trigger a re-render when the session is restored
// on cold start, so hooks that read it as a plain value can end up querying with an
// empty userId and never re-running once the real one arrives. Subscribing here
// (same pattern as use-user-profile.ts) guarantees a re-render — and a re-query —
// the moment auth resolves.
export function useCachedUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(getCachedUserId());

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return userId;
}

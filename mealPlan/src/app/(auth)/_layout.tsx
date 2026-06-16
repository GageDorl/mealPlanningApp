import { useEffect, useState } from 'react';
import { Slot, useRouter } from 'expo-router';
import { supabase, getCachedUserId } from '@/services/supabase';

export default function AuthLayout() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      // Fast path: use cached user ID (updated by onAuthStateChange, never blocks).
      // This is populated after sign-in and cleared immediately on sign-out, so it
      // is reliable for the common case and avoids hanging on _refreshingDeferred.
      if (getCachedUserId()) {
        router.replace('/');
        return;
      }

      // Slow path: cache is empty on first load before onAuthStateChange fires.
      // Use a short timeout so a hung _refreshingDeferred can't block the sign-in
      // form from rendering.
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
        ]);
        if (result.data.session?.user?.id) {
          router.replace('/');
          return;
        }
      } catch {
        // Timed out or failed — treat as no session and show sign-in.
      }

      setReady(true);
    };

    checkSession();
  }, [router]);

  return ready ? <Slot /> : null;
}

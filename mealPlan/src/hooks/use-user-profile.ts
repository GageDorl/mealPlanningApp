import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { getProfile, UserProfileData } from '@/services/user-service';
import { withTimeout } from '@/utils/with-timeout';
import { waitForNetwork } from '@/utils/wait-for-network';
import { foregroundAtRef } from '@/contexts/session-context';

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    console.log('[profile] loadProfile started');
    setLoading(true);
    try {
      const sessionResult = await supabase.auth.getSession();
      const userId = sessionResult.data.session?.user.id;
      console.log('[profile] session checked, userId:', userId ? 'present' : 'absent');

      if (!userId) {
        setProfile(null);
        return;
      }

      // If we just came from background, probe network before the HTTP fetch
      const msSinceForeground = foregroundAtRef.current > 0
        ? Date.now() - foregroundAtRef.current
        : Infinity;
      if (msSinceForeground < 30_000) {
        console.log(`[profile] post-foreground (${msSinceForeground}ms ago) — probing network...`);
        const ready = await waitForNetwork();
        console.log('[profile] network probe result:', ready ? 'ok' : 'failed');
        if (!ready) {
          setProfile(null);
          return;
        }
      }

      const profileData = await withTimeout(getProfile(userId), 10_000, 'getProfile');
      console.log('[profile] getProfile done:', profileData ? 'found' : 'null');
      setProfile(profileData);
    } catch (e) {
      console.log('[profile] loadProfile error (final):', e instanceof Error ? e.message : String(e));
      setProfile(null);
    } finally {
      console.log('[profile] loadProfile done, loading → false');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsubscribe: any;
    loadProfile();

    unsubscribe = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.id) {
        const profileData = await getProfile(session.user.id);
        setProfile(profileData);
      } else {
        setProfile(null);
      }
    });

    return () => {
      if (unsubscribe?.subscription?.unsubscribe) {
        unsubscribe.subscription.unsubscribe();
      }
    };
  }, [loadProfile]);

  return {
    profile,
    loading,
    reload: loadProfile,
  };
}

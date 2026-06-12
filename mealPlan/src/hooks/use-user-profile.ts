import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { getProfile, UserProfileData } from '@/services/user-service';
import { withTimeout } from '@/utils/with-timeout';

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

      const attempt = () => withTimeout(getProfile(userId), 10_000, 'getProfile');
      let profileData: Awaited<ReturnType<typeof getProfile>>;
      try {
        profileData = await attempt();
      } catch (firstErr) {
        const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
        if (msg.includes('[timeout]') || msg.includes('aborted') || msg.includes('AbortError')) {
          console.log('[profile] timeout on first attempt, retrying in 2s...');
          await new Promise((r) => setTimeout(r, 2000));
          profileData = await attempt();
        } else {
          throw firstErr;
        }
      }

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

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { getProfile, UserProfileData } from '@/services/user-service';

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const sessionResult = await supabase.auth.getSession();
      const userId = sessionResult.data.session?.user.id;

      if (!userId) {
        setProfile(null);
        return;
      }

      const profileData = await getProfile(userId);
      setProfile(profileData);
    } catch {
      setProfile(null);
    } finally {
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

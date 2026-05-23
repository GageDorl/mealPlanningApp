import { useEffect, useState } from 'react';
import { Slot, useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';

export default function OnboardingLayout() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const verify = async () => {
      const result = await supabase.auth.getSession();
      if (!result.data.session?.user?.id) {
        router.replace('/sign-in');
      } else {
        setAuthorized(true);
      }
    };

    verify();
  }, [router]);

  return authorized ? <Slot /> : null;
}

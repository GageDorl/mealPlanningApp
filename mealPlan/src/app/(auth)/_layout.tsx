import { useEffect, useState } from 'react';
import { Slot, useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';

export default function AuthLayout() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const result = await supabase.auth.getSession();
      if (result.data.session?.user?.id) {
        router.replace('/');
      } else {
        setReady(true);
      }
    };

    checkSession();
  }, [router]);

  return ready ? <Slot /> : null;
}

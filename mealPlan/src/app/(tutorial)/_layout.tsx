import { useEffect, useState } from 'react';
import { Stack, Redirect } from 'expo-router';
import { supabase } from '@/services/supabase';

export default function TutorialLayout() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthorized(!!data.session?.user?.id);
    });
  }, []);

  if (authorized === false) return <Redirect href="/sign-in" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}

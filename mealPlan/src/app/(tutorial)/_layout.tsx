import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, Redirect } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useTheme } from '@/hooks/use-theme';

export default function TutorialLayout() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const theme = useTheme();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthorized(!!data.session?.user?.id);
    });
  }, []);

  if (authorized === false) return <Redirect href="/sign-in" />;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {authorized === null && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]} />
      )}
    </>
  );
}

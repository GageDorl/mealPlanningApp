import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '@/services/supabase';

export default function CalendarCallback() {
  const { code, state, scope, error: oauthError } = useLocalSearchParams<{
    code?: string;
    state?: string;
    scope?: string;
    error?: string;
  }>();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    async function verify() {
      if (oauthError || !code || !state) {
        setStatus('error');
        setTimeout(() => router.replace('/'), 2000);
        return;
      }

      try {
        // TODO: revert — dev bypass; Phase 3 auth will provide a real session
        const { data, error } = await supabase.functions.invoke('recal-oauth-verify', {
          body: { provider: 'google', code, state, scope },
        });

        if (error) throw error;

        if (data.success) {
          try { localStorage.setItem('prepd_calendar_connected', 'true'); } catch {}
          setStatus('success');
          setTimeout(() => router.replace('/calendar'), 1500);
        } else {
          setStatus('error');
          setTimeout(() => router.replace('/'), 2000);
        }
      } catch {
        setStatus('error');
        setTimeout(() => router.replace('/'), 2000);
      }
    }

    verify();
  }, [code, state, scope, oauthError]);

  return (
    <View style={styles.container}>
      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" color="#FF6B2C" />
          <Text style={styles.text}>Connecting your calendar...</Text>
        </>
      )}
      {status === 'success' && (
        <Text style={styles.text}>Calendar connected! Returning to app...</Text>
      )}
      {status === 'error' && (
        <Text style={styles.text}>Something went wrong. Returning to app...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  text: { fontSize: 16, textAlign: 'center', paddingHorizontal: 32 },
});

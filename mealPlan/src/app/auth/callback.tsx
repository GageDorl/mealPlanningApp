import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePowerSync } from '@powersync/react-native';

import { supabase, getCachedUserId, getCurrentSession } from '@/services/supabase';
import { createUserProfile, getProfile } from '@/services/user-service';
import { Spacing } from '@/constants/theme';
import type { User } from '@supabase/supabase-js';

export default function AuthCallbackScreen() {
  const db = usePowerSync();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    code,
    access_token,
    refresh_token,
    error: errParam,
    error_description,
  } = useLocalSearchParams<{
    code?: string;
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  }>();

  useEffect(() => {
    let cancelled = false;

    const finishSignIn = async () => {
      try {
        let user: User | null = null;

        if (Platform.OS === 'web') {
          // Supabase JS v2 auto-exchanges ?code= via detectSessionInUrl on init.
          // Wait for SIGNED_IN event, or resolve immediately if it already fired.
          await new Promise<void>((resolve, reject) => {
            let settled = false;
            let sub: { unsubscribe: () => void } | null = null;

            const finish = (fn: () => void) => {
              if (settled) return;
              settled = true;
              clearTimeout(timeoutId);
              sub?.unsubscribe();
              fn();
            };

            const timeoutId = setTimeout(
              () => finish(() => reject(new Error('Sign-in timed out. Please try again.'))),
              20000,
            );

            // Fast path: session already established before this effect ran.
            if (getCachedUserId()) { finish(resolve); return; }

            const { data: { subscription } } = supabase.auth.onAuthStateChange(
              (_event, session) => {
                if (session) { user = session.user; finish(resolve); }
              },
            );
            sub = subscription;
          });

          // getCachedUserId() fast-path fires before user is captured — fetch it now.
          // The exchange is already done so getSession() won't block.
          if (!user) {
            const { data } = await getCurrentSession();
            user = data.session?.user ?? null;
          }
        } else {
          // Native / Android: signInWithProvider no longer exchanges the PKCE code —
          // this screen is the sole exchanger to avoid a double-exchange race.
          const errorDesc = error_description ?? errParam;
          if (errorDesc) throw new Error(errorDesc);

          if (getCachedUserId()) {
            // Session already established (safety valve — shouldn't normally happen).
            const { data } = await getCurrentSession();
            user = data.session?.user ?? null;
          } else if (code) {
            const { data: exchData, error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
            if (exchErr) throw exchErr;
            user = exchData.session?.user ?? null;
          } else if (access_token && refresh_token) {
            const { data: setData, error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
            if (setErr) throw setErr;
            user = setData.session?.user ?? null;
          }
        }

        if (!user) {
          throw new Error(`No session. code=${!!code} token=${!!access_token} cached=${!!getCachedUserId()} url=${typeof window !== 'undefined' ? window.location.href : 'n/a'}`);
        }

        const existingProfile = await getProfile(user.id);

        if (!existingProfile) {
          const displayName =
            typeof user.user_metadata?.full_name === 'string'
              ? user.user_metadata.full_name
              : typeof user.user_metadata?.name === 'string'
                ? user.user_metadata.name
                : null;

          const rawProvider = user.app_metadata?.provider;
          const authMethod =
            rawProvider === 'google' || rawProvider === 'apple' ? rawProvider : 'email';

          await createUserProfile(db, {
            id: user.id,
            email: user.email ?? '',
            displayName,
            authMethod,
          });
        }

        if (!cancelled) {
          router.replace(existingProfile?.user.onboarding_completed ? '/' : '/macro-goals');
        }
      } catch (callbackError) {
        if (!cancelled) {
          setError(callbackError instanceof Error ? callbackError.message : 'Failed to finish sign-in.');
        }
      }
    };

    finishSignIn();

    return () => {
      cancelled = true;
    };
  }, [db, router, code, access_token, refresh_token, errParam, error_description]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF6B2C" />
      <Text style={styles.text}>{error ?? 'Finishing sign-in...'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  text: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
});

import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { supabase, createSessionFromUrl, getCurrentSession } from '@/services/supabase';
import { createUserProfile, getProfile } from '@/services/user-service';
import { Spacing } from '@/constants/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const finishSignIn = async () => {
      try {
        if (Platform.OS === 'web') {
          // Supabase JS v2 automatically exchanges the ?code= param via
          // detectSessionInUrl on initialisation. Calling exchangeCodeForSession
          // a second time would use a single-use code twice and hang/fail.
          // Instead, wait for the SIGNED_IN event that fires once the auto-
          // exchange completes (or resolve immediately if it already has).
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(
              () => reject(new Error('Sign-in timed out. Please try again.')),
              20000,
            );

            // Check if session is already established (exchange may have finished
            // before this effect ran).
            supabase.auth.getSession().then(({ data }) => {
              if (data.session) {
                clearTimeout(timeout);
                resolve();
              }
            });

            const { data: { subscription } } = supabase.auth.onAuthStateChange(
              (_event, session) => {
                if (session) {
                  clearTimeout(timeout);
                  subscription.unsubscribe();
                  resolve();
                }
              },
            );
          });
        } else {
          await createSessionFromUrl(window.location.href);
        }

        const { data } = await getCurrentSession();
        const user = data.session?.user;

        if (!user) {
          throw new Error('No authenticated session was created from the OAuth callback.');
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

          await createUserProfile({
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
  }, [router]);

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

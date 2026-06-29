import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { usePowerSync } from '@powersync/react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/themed-text';
import { AuthScreen, authStyles } from '@/components/auth-screen';
import { signInWithEmail, signInWithProvider } from '@/services/supabase';
import { createUserProfile, getProfile } from '@/services/user-service';

export default function SignInScreen() {
  const db = usePowerSync();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await signInWithEmail(email, password);
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    const userId = data.user?.id;
    const existingProfile = userId ? await getProfile(userId) : null;
    router.replace(existingProfile?.user.onboarding_completed ? '/' : '/macro-goals');
  };

  const handleProviderSignIn = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setError(null);

    const { session, error, callbackUrl } = await signInWithProvider(provider);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (callbackUrl) {
      const parsed = new URL(callbackUrl);
      const hashParams = new URLSearchParams(parsed.hash.slice(1));
      const code = parsed.searchParams.get('code');
      const access_token = parsed.searchParams.get('access_token') ?? hashParams.get('access_token');
      const refresh_token = parsed.searchParams.get('refresh_token') ?? hashParams.get('refresh_token');
      router.replace({ pathname: '/auth/callback', params: { code: code ?? undefined, access_token: access_token ?? undefined, refresh_token: refresh_token ?? undefined } });
      return;
    }

    if (!session?.user) {
      setLoading(false);
      return;
    }

    const existingProfile = await getProfile(session.user.id);

    if (!existingProfile) {
      const displayName =
        typeof session.user.user_metadata?.full_name === 'string'
          ? session.user.user_metadata.full_name
          : typeof session.user.user_metadata?.name === 'string'
            ? session.user.user_metadata.name
            : null;

      const rawProvider = session.user.app_metadata?.provider;
      const authMethod =
        rawProvider === 'google' || rawProvider === 'apple' ? rawProvider : 'email';

      await createUserProfile(db, {
        id: session.user.id,
        email: session.user.email ?? email,
        displayName,
        authMethod,
      });

      setLoading(false);
      router.replace('/auth/profile-details');
      return;
    }

    setLoading(false);
    router.replace((existingProfile.user.onboarding_completed ? '/' : '/(tutorial)') as any);
  };

  return (
    <AuthScreen
      title="Sign in to Prepd"
      footer={
        <>
          <ThemedText type="default">Need an account?</ThemedText>
          <Link href="/sign-up">
            <ThemedText type="linkPrimary">Create one</ThemedText>
          </Link>
        </>
      }
    >
      <Input
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        style={authStyles.input}
      />
      <Input
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={authStyles.input}
      />
      {error ? <ThemedText type="default" style={authStyles.error}>{error}</ThemedText> : null}
      <Button label={loading ? 'Signing in…' : 'Sign in'} onPress={handleSignIn} disabled={loading} />
      <Button
        label="Continue with Google"
        onPress={() => handleProviderSignIn('google')}
        variant="secondary"
        style={authStyles.socialButton}
        disabled={loading}
      />
      {/* Apple sign-in requires paid Apple Developer account ($99/yr) — re-enable if that changes
      <Button
        label="Continue with Apple"
        onPress={() => handleProviderSignIn('apple')}
        variant="secondary"
        style={authStyles.socialButton}
        disabled={loading}
      /> */}
    </AuthScreen>
  );
}

import { useState } from 'react';
import { Link, useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/themed-text';
import { AuthScreen, authStyles } from '@/components/auth-screen';
import { signInWithEmail, signInWithProvider } from '@/services/supabase';
import { createUserProfile, getProfile } from '@/services/user-service';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    const { error } = await signInWithEmail(email, password);
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.replace('/macro-goals');
  };

  const handleProviderSignIn = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setError(null);

    const { session, error } = await signInWithProvider(provider);

    if (error) {
      setError(error.message);
      setLoading(false);
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

      await createUserProfile({
        id: session.user.id,
        email: session.user.email ?? email,
        displayName,
        authMethod,
      });
    }

    setLoading(false);
    router.replace('/macro-goals');
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
      <Button
        label="Continue with Apple"
        onPress={() => handleProviderSignIn('apple')}
        variant="secondary"
        style={authStyles.socialButton}
        disabled={loading}
      />
    </AuthScreen>
  );
}

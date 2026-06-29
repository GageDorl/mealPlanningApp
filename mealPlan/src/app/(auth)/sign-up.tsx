import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Pressable, View, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { usePowerSync } from '@powersync/react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/themed-text';
import { AuthScreen, authStyles } from '@/components/auth-screen';
import { signUpWithEmail, signInWithProvider } from '@/services/supabase';
import { createUserProfile, getProfile } from '@/services/user-service';
import { FontSizes, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function SignUpScreen() {
  const db = usePowerSync();
  const router = useRouter();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const handleSignUp = async () => {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    setLoading(true);
    setError(null);
    const { data, error } = await signUpWithEmail(email, password, name.trim());

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Session present means email confirmation is disabled — go straight to profile setup.
    if (data.session && data.user) {
      try {
        await createUserProfile(db, {
          id: data.user.id,
          email: data.user.email ?? email,
          displayName: name.trim(),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create profile. Please try again.');
        setLoading(false);
        return;
      }
      setLoading(false);
      router.replace('/auth/profile-details');
      return;
    }

    // No session — Supabase requires email confirmation first.
    // display_name is stored in user_metadata and carried through the confirmation link.
    setLoading(false);
    setAwaitingConfirmation(true);
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

    try {
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
          email: session.user.email ?? '',
          displayName,
          authMethod,
        });

        router.replace('/auth/profile-details');
        return;
      }

      router.replace((existingProfile.user.onboarding_completed ? '/' : '/(tutorial)') as any);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (awaitingConfirmation) {
    return (
      <AuthScreen title="Check your email" footer={
        <Pressable onPress={() => setAwaitingConfirmation(false)}>
          <ThemedText type="linkPrimary">Back</ThemedText>
        </Pressable>
      }>
        <ThemedText type="default" style={styles.confirmText}>
          We sent a confirmation link to {email}. Click it to finish creating your account.
        </ThemedText>
        <ThemedText type="default" style={[styles.confirmHint, { color: theme.textSecondary }]}>
          After confirming, you'll be asked for a few more details to set up your profile.
        </ThemedText>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Create your account"
      footer={
        <>
          <ThemedText type="default">Already have an account?</ThemedText>
          <Link href="/sign-in">
            <ThemedText type="linkPrimary">Sign in</ThemedText>
          </Link>
        </>
      }
    >
      <Input
        value={name}
        onChangeText={setName}
        placeholder="Full name"
        style={authStyles.input}
      />
      <Input
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        style={authStyles.input}
      />
      <View style={styles.passwordRow}>
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry={!showPassword}
          style={authStyles.input}
          containerStyle={{ flex: 1 }}
        />
        <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton} hitSlop={8}>
          {showPassword
            ? <EyeOff size={20} color={theme.textSecondary} />
            : <Eye size={20} color={theme.textSecondary} />}
        </Pressable>
      </View>
      {error ? <ThemedText type="default" style={authStyles.error}>{error}</ThemedText> : null}
      <Button label={loading ? 'Creating account…' : 'Sign up'} onPress={handleSignUp} disabled={loading} />
      <Button
        label="Continue with Google"
        onPress={() => handleProviderSignIn('google')}
        variant="secondary"
        style={authStyles.socialButton}
        disabled={loading}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  passwordRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  } as ViewStyle,
  eyeButton: {
    padding: Spacing.xs,
  } as ViewStyle,
  confirmText: {
    textAlign: 'center',
    fontSize: FontSizes.md,
    lineHeight: 24,
  } as TextStyle,
  confirmHint: {
    textAlign: 'center',
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginTop: Spacing.sm,
  } as TextStyle,
});

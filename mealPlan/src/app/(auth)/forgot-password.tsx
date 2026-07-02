import { useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, type TextStyle } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/themed-text';
import { AuthScreen, authStyles } from '@/components/auth-screen';
import { resetPasswordForEmail } from '@/services/supabase';
import { FontSizes, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) { setError('Please enter your email.'); return; }
    setLoading(true);
    setError(null);
    const { error: resetError } = await resetPasswordForEmail(email.trim());
    setLoading(false);
    if (resetError) { setError(resetError.message); return; }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthScreen
        title="Check your email"
        footer={
          <Link href="/sign-in">
            <ThemedText type="linkPrimary">Back to sign in</ThemedText>
          </Link>
        }
      >
        <ThemedText type="default" style={styles.body}>
          We sent a password reset link to {email}. Click it to choose a new password.
        </ThemedText>
        <ThemedText type="default" style={[styles.hint, { color: theme.textSecondary }]}>
          The link expires after 24 hours. Check your spam folder if you don't see it.
        </ThemedText>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Reset your password"
      footer={
        <Link href="/sign-in">
          <ThemedText type="linkPrimary">Back to sign in</ThemedText>
        </Link>
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
      {error ? <ThemedText type="default" style={authStyles.error}>{error}</ThemedText> : null}
      <Button
        label={loading ? 'Sending…' : 'Send reset link'}
        onPress={handleReset}
        disabled={loading}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    textAlign: 'center',
    fontSize: FontSizes.md,
    lineHeight: 24,
  } as TextStyle,
  hint: {
    textAlign: 'center',
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginTop: Spacing.sm,
  } as TextStyle,
});

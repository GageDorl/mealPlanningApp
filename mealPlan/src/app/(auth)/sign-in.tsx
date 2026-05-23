import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { signInWithEmail, signInWithProvider } from '@/services/supabase';
import { MaxContentWidth, Spacing } from '@/constants/theme';

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

  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        <ThemedText type="title" style={styles.title}>
          Sign in to Prepd
        </ThemedText>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={styles.input}
        />
        {error ? <ThemedText type="default" style={styles.error}>{error}</ThemedText> : null}
        <Button label={loading ? 'Signing in…' : 'Sign in'} onPress={handleSignIn} disabled={loading} />
        <Button
          label="Continue with Google"
          onPress={() => signInWithProvider('google')}
          variant="secondary"
          style={styles.socialButton}
        />
        <Button
          label="Continue with Apple"
          onPress={() => signInWithProvider('apple')}
          variant="secondary"
          style={styles.socialButton}
        />
        <View style={styles.footer}>
          <ThemedText type="default">Need an account?</ThemedText>
          <Link href="/sign-up">
            <ThemedText type="linkPrimary">Create one</ThemedText>
          </Link>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.five,
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  title: {
    marginBottom: Spacing.four,
  },
  input: {
    marginBottom: Spacing.three,
  },
  socialButton: {
    marginTop: Spacing.three,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  error: {
    color: '#ff3b30',
  },
});

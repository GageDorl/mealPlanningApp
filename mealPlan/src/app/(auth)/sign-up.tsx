import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { signUpWithEmail } from '@/services/supabase';
import { createUserProfile } from '@/services/user-service';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await signUpWithEmail(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await createUserProfile({
        id: data.user.id,
        email: data.user.email ?? email,
        displayName: name,
      });
    }

    setLoading(false);
    router.replace('/macro-goals');
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        <ThemedText type="title" style={styles.title}>
          Create your account
        </ThemedText>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          style={styles.input}
        />
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
        <Button label={loading ? 'Creating account…' : 'Sign up'} onPress={handleSignUp} disabled={loading} />
        <View style={styles.footer}>
          <ThemedText type="default">Already have an account?</ThemedText>
          <Link href="/sign-in">
            <ThemedText type="linkPrimary">Sign in</ThemedText>
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

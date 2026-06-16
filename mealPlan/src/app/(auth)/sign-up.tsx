import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { usePowerSync } from '@powersync/react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/themed-text';
import { AuthScreen, authStyles } from '@/components/auth-screen';
import { signUpWithEmail } from '@/services/supabase';
import { createUserProfile } from '@/services/user-service';

export default function SignUpScreen() {
  const db = usePowerSync();
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

    // No session means Supabase requires email confirmation before sign-in.
    // Profile creation would fail (RLS needs an authenticated session), so
    // we hold here and let the user know to check their email.
    if (!data.session) {
      setLoading(false);
      setError('Check your email and click the confirmation link to finish creating your account.');
      return;
    }

    if (data.user) {
      await createUserProfile(db, {
        id: data.user.id,
        email: data.user.email ?? email,
        displayName: name,
      });
    }

    setLoading(false);
    router.replace('/macro-goals');
  };

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
      <Input
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={authStyles.input}
      />
      {error ? <ThemedText type="default" style={authStyles.error}>{error}</ThemedText> : null}
      <Button label={loading ? 'Creating account…' : 'Sign up'} onPress={handleSignUp} disabled={loading} />
    </AuthScreen>
  );
}

import { useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/themed-text';
import { AuthScreen, authStyles } from '@/components/auth-screen';
import { updatePassword } from '@/services/supabase';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!password) { setError('Please enter a new password.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError(null);
    const { error: updateError } = await updatePassword(password);
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    router.replace('/');
  };

  return (
    <AuthScreen title="Choose a new password">
      <View style={styles.passwordRow}>
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder="New password"
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
      <Input
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Confirm new password"
        secureTextEntry={!showPassword}
        style={authStyles.input}
      />
      {error ? <ThemedText type="default" style={authStyles.error}>{error}</ThemedText> : null}
      <Button
        label={loading ? 'Saving…' : 'Set new password'}
        onPress={handleSubmit}
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
});

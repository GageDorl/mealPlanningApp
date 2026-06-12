import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useUserRole } from '@/hooks/use-user-role';
import { useTheme } from '@/hooks/use-theme';

export default function AdminLayout() {
  const { role, loading } = useUserRole();
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    if (!loading && (role === 'user' || role === null)) {
      router.replace('/(tabs)/profile');
    }
  }, [loading, role, router]);

  if (loading || role === 'user' || role === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.text} />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

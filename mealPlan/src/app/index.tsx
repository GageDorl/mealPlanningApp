import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useUserProfile } from '@/hooks/use-user-profile';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, loading } = useUserProfile();

  useEffect(() => {
    if (!loading && !profile) {
      router.replace('/sign-in');
    }
  }, [loading, profile, router]);

  if (loading || !profile) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="default">Loading your dashboard…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        <ThemedText type="title" style={styles.title}>
          Welcome back, {profile.user.display_name ?? 'Prepd user'}
        </ThemedText>
        <ThemedText type="default" style={styles.subtitle}>
          Your profile is ready. Continue to plan meals, adjust goals, and personalize your preferences.
        </ThemedText>
        <Button label="Update goals" onPress={() => router.push('/macro-goals')} />

        {/* TODO: remove when real nav is added */}
        <View style={styles.devNav}>
          <ThemedText type="default" style={styles.devNavLabel}>Dev nav</ThemedText>
          <View style={styles.devNavLinks}>
            {([
              { label: 'Calendar', href: '/calendar' },
              { label: 'Macros', href: '/macros' },
              { label: 'Grocery', href: '/grocery' },
              { label: 'Profile', href: '/profile' },
              { label: 'Recipe Search', href: '/recipes/search' },
              { label: 'Saved Recipes', href: '/recipes/saved' },
            ] as const).map(({ label, href }) => (
              <Button key={href} label={label} onPress={() => router.push(href as any)} variant="secondary" />
            ))}
          </View>
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
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.md,
  },
  subtitle: {
    marginBottom: Spacing.xl,
  },
  link: {
    marginTop: Spacing.lg,
  },
  devNav: {
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  devNavLabel: {
    opacity: 0.4,
  },
  devNavLinks: {
    gap: Spacing.sm,
  },
});

import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

interface Props {
  title: string;
  children: React.ReactNode;
  scrollable?: boolean;
  loading?: boolean;
  loadingText?: string;
}

export function OnboardingScreen({ title, children, scrollable, loading, loadingText = 'Loading…' }: Props) {
  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="default">{loadingText}</ThemedText>
      </ThemedView>
    );
  }

  const card = (
    <View style={styles.card}>
      <ThemedText type="title" style={styles.title}>{title}</ThemedText>
      {children}
    </View>
  );

  if (scrollable) {
    return (
      <ThemedView style={styles.scrollContainer}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {card}
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {card}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxxl,
  },
  scrollContainer: {
    flex: 1,
  },
  scroll: {
    padding: Spacing.xxxl,
    justifyContent: 'center',
    flexGrow: 1,
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.sm,
  },
  title: {
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

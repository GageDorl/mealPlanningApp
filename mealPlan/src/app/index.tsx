import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Prepd Dashboard
        </ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>
          Get started by building your weekly meal plan, tracking macros, and generating grocery lists.
        </ThemedText>

        <Card style={styles.card}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Foundational setup complete
          </ThemedText>
          <ThemedText type="default" style={styles.cardBody}>
            Supabase auth, PowerSync sync, data models, and Redux store are initialized for the Prepd MVP.
          </ThemedText>
        </Card>

        <Button label="Build a meal plan" onPress={() => undefined} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  title: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    color: Colors.light.text,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.light.textSecondary,
    textAlign: 'center',
    maxWidth: 620,
  },
  card: {
    width: '100%',
  },
  cardTitle: {
    marginBottom: Spacing.sm,
  },
  cardBody: {
    color: Colors.light.textSecondary,
  },
});

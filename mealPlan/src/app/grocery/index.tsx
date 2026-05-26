import { View, Text, ScrollView, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useGrocery } from '@/hooks/use-grocery';
import { GroceryCategoryGroup } from '@/components/grocery/grocery-category-group';
import { Button } from '@/components/ui/button';

export default function GroceryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { state, loading, generating, error, generate, toggleItem } = useGrocery();

  const { list, displayGroups, checkedCount, totalCount } = state;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Grocery List</Text>
        <Pressable onPress={() => router.push('/grocery/pantry-staples')} style={styles.staplesButton}>
          <Text style={[styles.staplesLabel, { color: Colors.accent }]}>Pantry</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>Loading…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.statusText, { color: Colors.light.error }]}>{error}</Text>
        </View>
      ) : !list ? (
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No grocery list yet</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Generate a list from your week's meal plan
          </Text>
          <Button
            label={generating ? 'Generating…' : 'Generate List'}
            onPress={generate}
            disabled={generating}
            style={styles.generateButton}
          />
        </View>
      ) : (
        <>
          {/* Progress bar */}
          <View style={[styles.progressCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: theme.text }]}>
                {checkedCount} of {totalCount} items
              </Text>
              <Text style={[styles.progressPercent, { color: Colors.accent }]}>{progressPercent}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
              <View
                style={[styles.progressFill, { width: `${progressPercent}%` as `${number}%`, backgroundColor: Colors.accent }]}
              />
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {displayGroups.length === 0 ? (
              <View style={styles.center}>
                <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                  No items — all may be pantry staples.
                </Text>
              </View>
            ) : (
              displayGroups.map((group) => (
                <GroceryCategoryGroup
                  key={group.category}
                  displayLabel={group.displayLabel}
                  items={group.items}
                  onToggleItem={toggleItem}
                />
              ))
            )}

            <Button
              label={generating ? 'Regenerating…' : 'Regenerate List'}
              onPress={generate}
              disabled={generating}
              variant="secondary"
              style={styles.regenButton}
            />
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 800,
    marginHorizontal: 'auto',
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  } as TextStyle,
  staplesButton: {
    padding: Spacing.sm,
  } as ViewStyle,
  staplesLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  progressCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  } as ViewStyle,
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  progressLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  progressPercent: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
  progressTrack: {
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  } as ViewStyle,
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  } as ViewStyle,
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  } as ViewStyle,
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  } as ViewStyle,
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    textAlign: 'center',
  } as TextStyle,
  emptySubtitle: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
  } as TextStyle,
  generateButton: {
    marginTop: Spacing.sm,
    minWidth: 180,
  } as ViewStyle,
  regenButton: {
    marginTop: Spacing.sm,
  } as ViewStyle,
  statusText: {
    fontSize: FontSizes.md,
    textAlign: 'center',
  } as TextStyle,
});

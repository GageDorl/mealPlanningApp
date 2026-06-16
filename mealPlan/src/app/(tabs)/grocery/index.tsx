
import { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { triggerSync } from '@/utils/trigger-sync';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { layout } from '@/styles/layout';
import { surfaces } from '@/styles/surfaces';
import { typography } from '@/styles/typography';
import { useGrocery } from '@/hooks/use-grocery';
import { GroceryCategoryGroup } from '@/components/grocery/grocery-category-group';
import { Button } from '@/components/ui/button';

export default function GroceryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { state, generating, error, generate, toggleItem } = useGrocery();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await triggerSync();
    setRefreshing(false);
  }, []);

  const { list, displayGroups, checkedCount, totalCount } = state;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <View style={[layout.screenContainer, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[layout.rowSpaceBetween, { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
        <Text style={[typography.headingXl, { color: theme.text }]}>Grocery List</Text>
        <Pressable onPress={() => router.push('/grocery/pantry-staples')} style={styles.staplesButton}>
          <Text style={[styles.staplesLabel, { color: Colors.accent }]}>Pantry</Text>
        </Pressable>
      </View>

      {/* Info tooltip */}
      <View style={[styles.infoBanner, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Text style={[styles.infoBannerText, { color: theme.textSecondary }]}>
          Update your pantry with items you already have, then tap Generate to pull ingredients from your planned recipes.
        </Text>
      </View>

      {error ? (
        <View style={[layout.centered, { padding: Spacing.xl, gap: Spacing.md }]}>
          <Text style={[styles.statusText, { color: Colors.light.error }]}>{error}</Text>
        </View>
      ) : !list ? (
        <View style={[layout.centered, { padding: Spacing.xl, gap: Spacing.md }]}>
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
            <View style={layout.rowSpaceBetween}>
              <Text style={[styles.progressLabel, { color: theme.text }]}>
                {checkedCount} of {totalCount} items
              </Text>
              <Text style={[styles.progressPercent, { color: Colors.accent }]}>{progressPercent}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
              <View
                style={[surfaces.progressFill, { width: `${progressPercent}%` as `${number}%`, backgroundColor: Colors.accent }]}
              />
            </View>
          </View>

          <ScrollView
            contentContainerStyle={layout.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} colors={[Colors.accent]} />}
          >
            {displayGroups.length === 0 ? (
              <View style={[layout.centered, { padding: Spacing.xl, gap: Spacing.md }]}>
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
  infoBanner: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
  } as ViewStyle,
  infoBannerText: {
    fontSize: FontSizes.xs,
    lineHeight: 18,
  } as TextStyle,
});

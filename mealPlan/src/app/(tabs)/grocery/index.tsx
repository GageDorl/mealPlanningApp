
import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, StyleSheet, useWindowDimensions, type ViewStyle, type TextStyle } from 'react-native';
import { WoodTexture } from '@/components/WoodTexture';
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
import { WeekPickerModal } from '@/components/calendar/week-picker-modal';

function getSunday(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const s = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const e = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${s} – ${e}`;
}

export default function GroceryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekPickerVisible, setWeekPickerVisible] = useState(false);
  const weekStart = useMemo(() => getSunday(addDays(new Date(), weekOffset * 7)), [weekOffset]);
  const { state, generating, error, generate, toggleItem } = useGrocery(weekStart);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await triggerSync();
    setRefreshing(false);
  }, []);

  const { list, displayGroups, checkedCount, totalCount } = state;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <View style={{ flex: 1 }}>
      <WoodTexture width={width} height={height} style={StyleSheet.absoluteFill} />
    <View style={[layout.screenContainer, { backgroundColor: 'transparent' }]}>
      {/* Header */}
      <View style={[layout.rowSpaceBetween, { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
        <Text style={[typography.headingXl, { color: theme.text }]}>Grocery List</Text>
        <Pressable onPress={() => router.push('/grocery/pantry-staples')} style={styles.staplesButton}>
          <Text style={[styles.staplesLabel, { color: Colors.accent }]}>Pantry</Text>
        </Pressable>
      </View>

      {/* Week selector */}
      <Pressable style={styles.weekRow} onPress={() => setWeekPickerVisible(true)}>
        <Text style={[styles.weekLabel, { color: Colors.accent }]}>
          {weekOffset === 0 ? 'This week' : formatWeekRange(weekStart)} ▾
        </Text>
      </Pressable>

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

      <WeekPickerModal
        visible={weekPickerVisible}
        weekOffset={weekOffset}
        onSelect={setWeekOffset}
        onClose={() => setWeekPickerVisible(false)}
      />
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
  weekRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  } as ViewStyle,
  weekLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
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

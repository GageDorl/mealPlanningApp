import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { GroceryCategoryGroup } from '@/components/grocery/grocery-category-group';
import { Button } from '@/components/ui/button';
import type { GroceryItemRow } from '@/services/grocery-service';

const NOOP = () => {};
const NOOP_TOGGLE = (_id: string, _checked: boolean) => {};

const PRODUCE_ITEMS: GroceryItemRow[] = [
  { id: 'p1', grocery_list_id: 'preview', ingredient_id: null, name: 'Cherry tomatoes', quantity: 200, unit: 'g', category: 'produce', is_checked: true, deficit_note: null },
  { id: 'p2', grocery_list_id: 'preview', ingredient_id: null, name: 'Baby spinach', quantity: 1, unit: 'bag', category: 'produce', is_checked: true, deficit_note: null },
];

const PROTEIN_ITEMS: GroceryItemRow[] = [
  { id: 'q1', grocery_list_id: 'preview', ingredient_id: null, name: 'Chicken breast', quantity: 600, unit: 'g', category: 'protein', is_checked: true, deficit_note: null },
];

const ALL_ITEMS = [...PRODUCE_ITEMS, ...PROTEIN_ITEMS];
const TOTAL = ALL_ITEMS.length;

export function GroceryRegeneratePreview() {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.progressCard, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.progressRow}>
          <Text style={[styles.progressLabel, { color: theme.text }]}>{TOTAL} of {TOTAL} items</Text>
          <Text style={[styles.progressPercent, { color: Colors.accent }]}>100%</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <View style={[styles.progressFill, { backgroundColor: Colors.accent }]} />
        </View>
      </View>

      <View pointerEvents="none" style={styles.groups}>
        <GroceryCategoryGroup displayLabel="Produce" items={PRODUCE_ITEMS} onToggleItem={NOOP_TOGGLE} />
        <GroceryCategoryGroup displayLabel="Protein" items={PROTEIN_ITEMS} onToggleItem={NOOP_TOGGLE} />
      </View>

      {/* Real Button component — matches grocery/index.tsx regenButton */}
      <Button label="Regenerate List" onPress={NOOP} variant="secondary" />

      <Text style={[styles.hint, { color: theme.textSecondary }]}>
        Updated your meal plan? Tap regenerate to sync your list.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  } as ViewStyle,
  progressCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  } as ViewStyle,
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    height: 6,
    borderRadius: BorderRadius.full,
    width: '100%',
  } as ViewStyle,
  groups: {
    gap: Spacing.md,
  } as ViewStyle,
  hint: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  } as TextStyle,
});

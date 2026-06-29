import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { GroceryCategoryGroup } from '@/components/grocery/grocery-category-group';
import type { GroceryItemRow } from '@/services/grocery-service';

const NOOP_TOGGLE = (_id: string, _checked: boolean) => {};

const DAIRY_ITEMS: GroceryItemRow[] = [
  { id: 'd1', grocery_list_id: 'preview', ingredient_id: null, name: 'Greek yogurt', quantity: 500, unit: 'g', category: 'dairy', is_checked: true, deficit_note: null },
  { id: 'd2', grocery_list_id: 'preview', ingredient_id: null, name: 'Cheddar cheese', quantity: 150, unit: 'g', category: 'dairy', is_checked: true, deficit_note: null },
  { id: 'd3', grocery_list_id: 'preview', ingredient_id: null, name: 'Butter', quantity: 100, unit: 'g', category: 'dairy', is_checked: false, deficit_note: null },
];

const GRAINS_ITEMS: GroceryItemRow[] = [
  { id: 'g1', grocery_list_id: 'preview', ingredient_id: null, name: 'Brown rice', quantity: 1, unit: 'kg', category: 'grains', is_checked: true, deficit_note: null },
  { id: 'g2', grocery_list_id: 'preview', ingredient_id: null, name: 'Whole wheat bread', quantity: 1, unit: 'loaf', category: 'grains', is_checked: false, deficit_note: null },
  { id: 'g3', grocery_list_id: 'preview', ingredient_id: null, name: 'Oats', quantity: 500, unit: 'g', category: 'grains', is_checked: false, deficit_note: null },
];

const ALL_ITEMS = [...DAIRY_ITEMS, ...GRAINS_ITEMS];
const CHECKED = ALL_ITEMS.filter((i) => i.is_checked).length;
const TOTAL = ALL_ITEMS.length;
const PERCENT = Math.round((CHECKED / TOTAL) * 100);

export function GroceryChecklistPreview() {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.progressCard, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.progressRow}>
          <Text style={[styles.progressLabel, { color: theme.text }]}>{CHECKED} of {TOTAL} items</Text>
          <Text style={[styles.progressPercent, { color: Colors.accent }]}>{PERCENT}%</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <View style={[styles.progressFill, { width: `${PERCENT}%` as `${number}%`, backgroundColor: Colors.accent }]} />
        </View>
      </View>

      <View pointerEvents="none" style={styles.groups}>
        <GroceryCategoryGroup displayLabel="Dairy" items={DAIRY_ITEMS} onToggleItem={NOOP_TOGGLE} />
        <GroceryCategoryGroup displayLabel="Grains & Bread" items={GRAINS_ITEMS} onToggleItem={NOOP_TOGGLE} />
      </View>
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
  } as ViewStyle,
  groups: {
    gap: Spacing.md,
  } as ViewStyle,
});

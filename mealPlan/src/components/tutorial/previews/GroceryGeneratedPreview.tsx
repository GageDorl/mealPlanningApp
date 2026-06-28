import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { GroceryCategoryGroup } from '@/components/grocery/grocery-category-group';
import type { GroceryItemRow } from '@/services/grocery-service';

const NOOP_TOGGLE = (_id: string, _checked: boolean) => {};

const PRODUCE_ITEMS: GroceryItemRow[] = [
  { id: 'p1', grocery_list_id: 'preview', ingredient_id: null, name: 'Cherry tomatoes', quantity: 200, unit: 'g', category: 'produce', is_checked: false, deficit_note: null },
  { id: 'p2', grocery_list_id: 'preview', ingredient_id: null, name: 'Baby spinach', quantity: 1, unit: 'bag', category: 'produce', is_checked: false, deficit_note: null },
  { id: 'p3', grocery_list_id: 'preview', ingredient_id: null, name: 'Avocado', quantity: 2, unit: null, category: 'produce', is_checked: false, deficit_note: null },
];

const PROTEIN_ITEMS: GroceryItemRow[] = [
  { id: 'q1', grocery_list_id: 'preview', ingredient_id: null, name: 'Chicken breast', quantity: 600, unit: 'g', category: 'protein', is_checked: false, deficit_note: null },
  { id: 'q2', grocery_list_id: 'preview', ingredient_id: null, name: 'Eggs', quantity: 6, unit: null, category: 'protein', is_checked: false, deficit_note: '4 in pantry, need 2 more' },
];

const TOTAL = PRODUCE_ITEMS.length + PROTEIN_ITEMS.length;

export function GroceryGeneratedPreview() {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Grocery List</Text>
        <Text style={[styles.pantryLink, { color: Colors.accent }]}>Pantry</Text>
      </View>

      <View style={[styles.progressCard, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.progressRow}>
          <Text style={[styles.progressLabel, { color: theme.text }]}>0 of {TOTAL} items</Text>
          <Text style={[styles.progressPercent, { color: Colors.accent }]}>0%</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: theme.border }]} />
      </View>

      <View pointerEvents="none" style={styles.groups}>
        <GroceryCategoryGroup displayLabel="Produce" items={PRODUCE_ITEMS} onToggleItem={NOOP_TOGGLE} />
        <GroceryCategoryGroup displayLabel="Protein" items={PROTEIN_ITEMS} onToggleItem={NOOP_TOGGLE} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  } as ViewStyle,
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  } as TextStyle,
  pantryLink: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
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
  } as ViewStyle,
  groups: {
    gap: Spacing.md,
  } as ViewStyle,
});

import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing } from '@/constants/theme';

interface PantryItem {
  id: string;
  name: string;
  stock: string | null;
}

const FILLER_STAPLES: PantryItem[] = [
  { id: '1', name: 'Eggs', stock: '12 each' },
  { id: '2', name: 'Milk', stock: '1 L' },
  { id: '3', name: 'Olive oil', stock: '500 ml' },
  { id: '4', name: 'Salt', stock: null },
  { id: '5', name: 'Pasta', stock: '500 g' },
];

export function GroceryPantryPreview() {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {/* Header — mirrors pantry-staples.tsx layout */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.backIcon, { color: Colors.accent }]}>‹</Text>
        <Text style={[styles.title, { color: theme.text }]}>Pantry</Text>
      </View>

      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Log what you have on hand. Items with enough stock are excluded from generated lists.
      </Text>

      {/* Staple rows — mirrors pantry-staples.tsx stapleRow structure */}
      <View pointerEvents="none">
        {FILLER_STAPLES.map((staple) => (
          <View key={staple.id} style={[styles.stapleRow, { borderBottomColor: theme.border }]}>
            <View style={styles.nameBlock}>
              <Text style={[styles.stapleName, { color: theme.text }]}>{staple.name}</Text>
              {staple.stock && (
                <Text style={[styles.stockLabel, { color: theme.textSecondary }]}>{staple.stock}</Text>
              )}
            </View>
            <View style={styles.rowActions}>
              <Text style={[styles.editLabel, { color: Colors.accent }]}>Edit</Text>
              <Text style={[styles.removeLabel]}>Remove</Text>
            </View>
          </View>
        ))}
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
    alignItems: 'center',
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  } as ViewStyle,
  backIcon: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  } as TextStyle,
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  } as TextStyle,
  subtitle: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  } as TextStyle,
  stapleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  } as ViewStyle,
  nameBlock: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  stapleName: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
  stockLabel: {
    fontSize: FontSizes.xs,
  } as TextStyle,
  rowActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  } as ViewStyle,
  editLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
  removeLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: '#ef4444',
  } as TextStyle,
});

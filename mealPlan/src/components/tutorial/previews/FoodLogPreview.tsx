import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

const ACCENT = '#50C878';

const FILLER_ITEMS = [
  { name: 'Chicken & Rice Bowl', brand: null, kcal: 520, p: 42, c: 58, f: 12 },
  { name: 'Greek Yogurt (Plain)', brand: 'Chobani', kcal: 150, p: 17, c: 9, f: 0 },
  { name: 'Apple', brand: null, kcal: 95, p: 0, c: 25, f: 0 },
];

export function FoodLogPreview() {
  const theme = useTheme();
  const total = FILLER_ITEMS.reduce((sum, i) => sum + i.kcal, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {/* Header: time + total calories */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.accentDot, { backgroundColor: ACCENT }]} />
          <Text style={[styles.headerTime, { color: theme.text }]}>12:30 PM</Text>
          <Text style={[styles.headerCals, { color: theme.textSecondary }]}>· {total} kcal</Text>
        </View>
        <Text style={[styles.editHint, { color: ACCENT }]}>✎</Text>
      </View>

      {/* Meal label */}
      <Text style={[styles.mealLabel, { color: theme.textSecondary }]}>LUNCH</Text>

      {/* Item rows */}
      {FILLER_ITEMS.map((item, i) => (
        <View
          key={item.name}
          style={[
            styles.itemRow,
            i < FILLER_ITEMS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
          ]}
        >
          <View style={styles.itemLeft}>
            {item.brand ? (
              <Text style={[styles.brandName, { color: ACCENT }]}>{item.brand}</Text>
            ) : null}
            <Text style={[styles.foodName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.macroLine, { color: theme.textSecondary }]}>
              {item.kcal} kcal · {item.p}g P · {item.c}g C · {item.f}g F
            </Text>
          </View>
          <Text style={[styles.servings, { color: theme.textSecondary }]}>× 1</Text>
        </View>
      ))}

      {/* Add food hint */}
      <View style={[styles.addRow, { borderTopColor: theme.border }]}>
        <Text style={[styles.addText, { color: ACCENT }]}>+ Add food</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  } as ViewStyle,
  accentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  } as ViewStyle,
  headerTime: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  headerCals: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  editHint: {
    fontSize: FontSizes.md,
  } as TextStyle,
  mealLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: 2,
  } as TextStyle,
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
  } as ViewStyle,
  itemLeft: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  brandName: {
    fontSize: 10,
    fontWeight: '600',
  } as TextStyle,
  foodName: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  macroLine: {
    fontSize: 11,
    lineHeight: 15,
  } as TextStyle,
  servings: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    flexShrink: 0,
  } as TextStyle,
  addRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  } as ViewStyle,
  addText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
});

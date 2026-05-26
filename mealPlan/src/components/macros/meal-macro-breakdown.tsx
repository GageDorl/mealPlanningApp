import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { FontSizes, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MealMacroEntry } from '@/services/macro-service';

interface MealMacroBreakdownProps {
  entries: MealMacroEntry[];
}

export function MealMacroBreakdown({ entries }: MealMacroBreakdownProps) {
  const theme = useTheme();

  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No meals planned for this day.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { borderBottomColor: theme.border }]}>
        <Text style={[styles.col, styles.colLabel, styles.headerText, { color: theme.textSecondary }]}>Meal</Text>
        <Text style={[styles.col, styles.colMacro, styles.headerText, { color: theme.textSecondary }]}>Cal</Text>
        <Text style={[styles.col, styles.colMacro, styles.headerText, { color: theme.textSecondary }]}>Pro</Text>
        <Text style={[styles.col, styles.colMacro, styles.headerText, { color: theme.textSecondary }]}>Carb</Text>
        <Text style={[styles.col, styles.colMacro, styles.headerText, { color: theme.textSecondary }]}>Fat</Text>
      </View>

      {entries.map((entry) => (
        <View key={entry.slot_id} style={[styles.row, { borderBottomColor: theme.border }]}>
          <View style={styles.colLabel}>
            <Text style={[styles.mealLabel, { color: theme.text }]} numberOfLines={1}>{entry.label}</Text>
            {entry.recipe_title ? (
              <Text style={[styles.recipeTitle, { color: theme.textSecondary }]} numberOfLines={1}>{entry.recipe_title}</Text>
            ) : (
              <Text style={[styles.emptySlot, { color: theme.border }]}>Empty slot</Text>
            )}
          </View>
          <Text style={[styles.col, styles.colMacro, styles.macroValue, { color: theme.text }]}>
            {entry.recipe_title ? entry.calories : '–'}
          </Text>
          <Text style={[styles.col, styles.colMacro, styles.macroValue, { color: theme.text }]}>
            {entry.recipe_title ? `${entry.protein}g` : '–'}
          </Text>
          <Text style={[styles.col, styles.colMacro, styles.macroValue, { color: theme.text }]}>
            {entry.recipe_title ? `${entry.carbs}g` : '–'}
          </Text>
          <Text style={[styles.col, styles.colMacro, styles.macroValue, { color: theme.text }]}>
            {entry.recipe_title ? `${entry.fat}g` : '–'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  } as ViewStyle,
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    marginBottom: Spacing.xs,
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  col: {
    flexShrink: 0,
  } as TextStyle,
  colLabel: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  colMacro: {
    width: 48,
    textAlign: 'right',
  } as TextStyle,
  headerText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  mealLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  recipeTitle: {
    fontSize: FontSizes.xs,
    marginTop: 1,
  } as TextStyle,
  emptySlot: {
    fontSize: FontSizes.xs,
    fontStyle: 'italic',
    marginTop: 1,
  } as TextStyle,
  macroValue: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  empty: {
    padding: Spacing.xl,
    alignItems: 'center',
  } as ViewStyle,
  emptyText: {
    fontSize: FontSizes.sm,
  } as TextStyle,
});

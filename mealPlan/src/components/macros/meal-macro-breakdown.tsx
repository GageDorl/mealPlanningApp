import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import type { MealMacroEntry } from '@/services/macro-service';

interface MealMacroBreakdownProps {
  entries: MealMacroEntry[];
}

export function MealMacroBreakdown({ entries }: MealMacroBreakdownProps) {
  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No meals planned for this day.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.col, styles.colLabel, styles.headerText]}>Meal</Text>
        <Text style={[styles.col, styles.colMacro, styles.headerText]}>Cal</Text>
        <Text style={[styles.col, styles.colMacro, styles.headerText]}>Pro</Text>
        <Text style={[styles.col, styles.colMacro, styles.headerText]}>Carb</Text>
        <Text style={[styles.col, styles.colMacro, styles.headerText]}>Fat</Text>
      </View>

      {entries.map((entry) => (
        <View key={entry.slot_id} style={styles.row}>
          <View style={styles.colLabel}>
            <Text style={styles.mealLabel} numberOfLines={1}>{entry.label}</Text>
            {entry.recipe_title ? (
              <Text style={styles.recipeTitle} numberOfLines={1}>{entry.recipe_title}</Text>
            ) : (
              <Text style={styles.emptySlot}>Empty slot</Text>
            )}
          </View>
          <Text style={[styles.col, styles.colMacro, styles.macroValue]}>
            {entry.recipe_title ? entry.calories : '–'}
          </Text>
          <Text style={[styles.col, styles.colMacro, styles.macroValue]}>
            {entry.recipe_title ? `${entry.protein}g` : '–'}
          </Text>
          <Text style={[styles.col, styles.colMacro, styles.macroValue]}>
            {entry.recipe_title ? `${entry.carbs}g` : '–'}
          </Text>
          <Text style={[styles.col, styles.colMacro, styles.macroValue]}>
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
    borderBottomColor: Colors.light.border,
    marginBottom: Spacing.xs,
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  } as ViewStyle,
  col: {
    flexShrink: 0,
  } as ViewStyle,
  colLabel: {
    flex: 1,
    paddingRight: Spacing.sm,
  } as ViewStyle,
  colMacro: {
    width: 48,
    textAlign: 'right',
  } as TextStyle,
  headerText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  mealLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.light.text,
  } as TextStyle,
  recipeTitle: {
    fontSize: FontSizes.xs,
    color: Colors.light.textSecondary,
    marginTop: 1,
  } as TextStyle,
  emptySlot: {
    fontSize: FontSizes.xs,
    color: Colors.light.border,
    fontStyle: 'italic',
    marginTop: 1,
  } as TextStyle,
  macroValue: {
    fontSize: FontSizes.sm,
    color: Colors.light.text,
  } as TextStyle,
  empty: {
    padding: Spacing.xl,
    alignItems: 'center',
  } as ViewStyle,
  emptyText: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
  } as TextStyle,
});

import { View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { FontSizes, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MealMacroEntry } from '@/services/macro-service';

interface MealMacroBreakdownProps {
  entries: MealMacroEntry[];
  onDeletePlannedMeal?: (id: string) => void;
}

export function MealMacroBreakdown({ entries, onDeletePlannedMeal }: MealMacroBreakdownProps) {
  const theme = useTheme();

  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No meals planned or logged for this day.</Text>
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

      {entries.map((entry) => {
        const isPlanned = entry.entry_type === 'planned';
        const hasData = isPlanned ? !!entry.recipe_title : true;
        const primaryName = isPlanned ? entry.recipe_title : entry.food_name;


        return (
          <View key={entry.id} style={[styles.row, { borderBottomColor: theme.border }]}>
            <View style={styles.colLabel}>
              <View style={styles.labelRow}>
                {!isPlanned && (
                  <View style={[styles.loggedDot, { backgroundColor: theme.textSecondary }]} />
                )}
                {primaryName ? (
                  <Text style={[styles.recipeTitle, { color: theme.textSecondary }]} numberOfLines={1}>
                    {primaryName}
                  </Text>
                ) : null}
              </View>
              {!isPlanned && entry.brand_name ? (
                <Text style={[styles.brandName, { color: theme.textSecondary }]} numberOfLines={1}>
                  {entry.brand_name}
                </Text>
              ) : (
                isPlanned && (
                  <Text style={[styles.emptySlot, { color: theme.border }]}>Empty slot</Text>
                )
              )}
            </View>

            <Text style={[styles.col, styles.colMacro, styles.macroValue, { color: theme.text }]}>
              {hasData ? entry.calories : '–'}
            </Text>
            <Text style={[styles.col, styles.colMacro, styles.macroValue, { color: theme.text }]}>
              {hasData ? `${entry.protein}g` : '–'}
            </Text>
            <Text style={[styles.col, styles.colMacro, styles.macroValue, { color: theme.text }]}>
              {hasData ? `${entry.carbs}g` : '–'}
            </Text>
            <Text style={[styles.col, styles.colMacro, styles.macroValue, { color: theme.text }]}>
              {hasData ? `${entry.fat}g` : '–'}
            </Text>

            {isPlanned && onDeletePlannedMeal && (
              <Pressable onPress={() => onDeletePlannedMeal(entry.id)} hitSlop={8} style={styles.deleteButton}>
                <Text style={[styles.deleteIcon, { color: theme.textSecondary }]}>×</Text>
              </Pressable>
            )}
          </View>
        );
      })}
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
    width: 44,
    textAlign: 'right',
  } as TextStyle,
  headerText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  } as ViewStyle,
  loggedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.5,
  } as ViewStyle,
  mealLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  recipeTitle: {
    fontSize: FontSizes.xs,
    marginTop: 1,
  } as TextStyle,
  brandName: {
    fontSize: FontSizes.xs,
    marginTop: 1,
    opacity: 0.6,
  } as TextStyle,
  emptySlot: {
    fontSize: FontSizes.xs,
    fontStyle: 'italic',
    marginTop: 1,
  } as TextStyle,
  macroValue: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  deleteButton: {
    marginLeft: Spacing.xs,
    padding: 2,
  } as ViewStyle,
  deleteIcon: {
    fontSize: 16,
    lineHeight: 16,
    fontWeight: '400',
  } as TextStyle,
  empty: {
    padding: Spacing.xl,
    alignItems: 'center',
  } as ViewStyle,
  emptyText: {
    fontSize: FontSizes.sm,
  } as TextStyle,
});

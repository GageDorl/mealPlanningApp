import { Pressable, View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MealSlotWithRecipe } from '@/services/meal-plan-service';
import { ICON_COMPONENTS } from '@/components/ui/icon-picker';

const ACCENT = '#6A9EC8';
const ICON_COLOR = '#FFFFFF';

interface MealSlotCardProps {
  slot: MealSlotWithRecipe;
  compact?: boolean;
  // true (default) fills an ancestor with a definite height — the absolutely-positioned
  // wrapper WeekEventsOverlay uses for the timed grid. Set false inside an auto-height
  // column stack (the all-day row) — flex:1 there is ambiguous and Android's Yoga can
  // resolve it by not growing the row to fit multiple stacked slots.
  growToFill?: boolean;
  onPress: () => void;
  onAssignRecipe: () => void;
  onDelete: () => void;
}

export function MealSlotCard({ slot, compact = false, growToFill = true, onPress, onAssignRecipe, onDelete }: MealSlotCardProps) {
  const theme = useTheme();
  const hasRecipes = slot.recipes.length > 0;
  const hasFoods = slot.foods.length > 0;
  const hasContent = hasRecipes || hasFoods;
  const primary = slot.recipes[0]?.recipe ?? null;
  const primaryFood = slot.foods[0] ?? null;
  const primaryName = primary?.title ?? primaryFood?.food_name ?? '';
  const extraCount = slot.recipes.length + slot.foods.length - 1;
  const knownCalories = [
    ...slot.recipes.filter((r) => r.recipe.calories_per_serving != null).map((r) => r.recipe.calories_per_serving as number),
    ...slot.foods.filter((f) => f.calories != null).map((f) => (f.calories as number) * (f.servings_planned || 1)),
  ];
  const totalCalories = knownCalories.length > 0 ? knownCalories.reduce((sum, c) => sum + c, 0) : null;
  const IconComp = slot.icon ? ICON_COMPONENTS[slot.icon] : null;

  if (compact) {
    return (
      <Pressable
        style={[styles.block, styles.blockCompact, !growToFill && styles.blockAuto, { backgroundColor: `${ACCENT}BB`, borderLeftColor: ACCENT }]}
        onPress={hasContent ? onPress : onAssignRecipe}
      >
        <View style={styles.compactRow}>
          {IconComp && <IconComp size={12} color={ICON_COLOR} />}
          <Text style={[styles.compactLabel, { color: '#FFFFFF' }]} numberOfLines={1} ellipsizeMode="tail">
            {slot.label}
          </Text>
          {hasContent && (
            <Text style={[styles.compactName, { color: 'rgba(255,255,255,0.85)' }]} numberOfLines={1} ellipsizeMode="tail">
              {primaryName}
            </Text>
          )}
          <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteButtonCompact}>
            <Text style={[styles.deleteIcon, { color: 'rgba(255,255,255,0.70)' }]}>×</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.block, { backgroundColor: `${ACCENT}BB`, borderLeftColor: ACCENT }]}
      onPress={hasContent ? onPress : onAssignRecipe}
    >
      <View style={styles.headerRow}>
        {IconComp && <IconComp size={14} color={ICON_COLOR} />}
        <Text style={[styles.label, { color: '#FFFFFF' }]} numberOfLines={1} ellipsizeMode="tail">
          {slot.label}
        </Text>
        <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteButton}>
          <Text style={[styles.deleteIcon, { color: 'rgba(255,255,255,0.70)' }]}>×</Text>
        </Pressable>
      </View>

      {hasContent ? (
        <>
          <View style={styles.recipeRow}>
            <Text style={[styles.recipeName, { color: 'rgba(255,255,255,0.92)' }]} numberOfLines={2} ellipsizeMode="tail">
              {primaryName}
            </Text>
            {extraCount > 0 && (
              <Text style={[styles.extraBadge, { color: 'rgba(255,255,255,0.75)' }]}>+{extraCount}</Text>
            )}
          </View>
          {totalCalories != null && (
            <Text style={[styles.calHint, { color: 'rgba(255,255,255,0.80)' }]}>
              {Math.round(totalCalories)} kcal
            </Text>
          )}
        </>
      ) : (
        <Pressable onPress={onAssignRecipe}>
          <Text style={[styles.emptyState, { color: 'rgba(255,255,255,0.80)' }]}>+ Add recipe</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    borderLeftWidth: 3,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    flex: 1,
    minHeight: 36,
  } as ViewStyle,
  blockAuto: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
  } as ViewStyle,
  blockCompact: {
    justifyContent: 'center',
    paddingVertical: 3,
  } as ViewStyle,
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  } as ViewStyle,
  compactLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    flexShrink: 0,
    maxWidth: '45%',
  } as TextStyle,
  compactName: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
    flex: 1,
  } as TextStyle,
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    gap: 4,
  } as ViewStyle,
  deleteButton: {
    flexShrink: 0,
    marginLeft: 2,
  } as ViewStyle,
  deleteButtonCompact: {
    flexShrink: 0,
  } as ViewStyle,
  deleteIcon: {
    fontSize: 14,
    lineHeight: 14,
  } as TextStyle,
  label: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    flex: 1,
  } as TextStyle,
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  } as ViewStyle,
  recipeName: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  } as TextStyle,
  extraBadge: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    flexShrink: 0,
  } as TextStyle,
  calHint: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  } as TextStyle,
  emptyState: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    marginTop: 2,
  } as TextStyle,
});

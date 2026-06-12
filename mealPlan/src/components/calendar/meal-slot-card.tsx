import { Pressable, View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MealSlotWithRecipe } from '@/services/meal-plan-service';

function formatTime12(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10) || 0;
  const m = mStr ?? '00';
  const suffix = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return m === '00' ? `${h} ${suffix}` : `${h}:${m} ${suffix}`;
}

interface MealSlotCardProps {
  slot: MealSlotWithRecipe;
  compact?: boolean;
  onPress: () => void;
  onAssignRecipe: () => void;
  onDelete: () => void;
}

export function MealSlotCard({ slot, compact = false, onPress, onAssignRecipe, onDelete }: MealSlotCardProps) {
  const theme = useTheme();
  const hasRecipes = slot.recipes.length > 0;
  const primary = slot.recipes[0]?.recipe ?? null;
  const extraCount = slot.recipes.length - 1;

  return (
    <Pressable
      style={[styles.block, compact && styles.blockCompact, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      onPress={hasRecipes ? onPress : onAssignRecipe}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.label, { color: theme.textSecondary }]} numberOfLines={1}>
          {slot.label}
        </Text>
        <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteButton}>
          <Text style={[styles.deleteIcon, { color: theme.textSecondary }]}>×</Text>
        </Pressable>
      </View>

      {hasRecipes ? (
        <View>
          <View style={styles.recipeRow}>
            <Text style={[styles.recipeName, { color: theme.text, flex: 1 }]} numberOfLines={compact ? 1 : 2}>
              {primary!.title}
            </Text>
            {extraCount > 0 && (
              <Text style={[styles.extraBadge, { color: Colors.accent }]}>+{extraCount}</Text>
            )}
          </View>
          {!compact && primary!.calories_per_serving != null && (
            <Text style={[styles.macroHint, { color: theme.textSecondary }]}>
              {primary!.calories_per_serving} kcal
            </Text>
          )}
        </View>
      ) : (
        <Pressable onPress={onAssignRecipe}>
          <Text style={[styles.emptyState, { color: Colors.accent }]}>+ Add recipe</Text>
        </Pressable>
      )}

      {!compact && slot.time_of_day ? (
        <Text style={[styles.time, { color: theme.textSecondary }]}>{formatTime12(slot.time_of_day)}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: 'rgba(74, 144, 217, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: '#4A90D9',
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    flex: 1,
  } as ViewStyle,
  blockCompact: {
    justifyContent: 'center',
  } as ViewStyle,
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  deleteButton: {
    marginLeft: 2,
  } as ViewStyle,
  deleteIcon: {
    fontSize: 14,
    lineHeight: 14,
    fontWeight: '400',
  } as TextStyle,
  label: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  } as TextStyle,
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  } as ViewStyle,
  recipeName: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
  extraBadge: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
  } as TextStyle,
  macroHint: {
    fontSize: FontSizes.xs,
  } as TextStyle,
  emptyState: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  } as TextStyle,
  time: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  } as TextStyle,
});

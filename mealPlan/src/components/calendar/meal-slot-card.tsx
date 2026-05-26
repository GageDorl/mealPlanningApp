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
  const hasRecipe = !!slot.recipe;

  return (
    <Pressable
      style={[styles.card, compact && styles.cardCompact, { backgroundColor: theme.background, borderColor: theme.border }]}
      onPress={hasRecipe ? onPress : onAssignRecipe}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.label, { color: theme.textSecondary }]} numberOfLines={1}>
          {slot.label}
        </Text>
        <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteButton}>
          <Text style={[styles.deleteIcon, { color: theme.textSecondary }]}>×</Text>
        </Pressable>
      </View>

      {hasRecipe ? (
        <View>
          <Text style={[styles.recipeName, { color: theme.text }]} numberOfLines={compact ? 1 : 2}>
            {slot.recipe!.title}
          </Text>
          {!compact && slot.recipe!.calories_per_serving != null && (
            <Text style={[styles.macroHint, { color: theme.textSecondary }]}>
              {slot.recipe!.calories_per_serving} kcal
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
  card: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.xs,
    gap: 2,
    minHeight: '100%',
  } as ViewStyle,
  cardCompact: {
    justifyContent: 'center',
  } as ViewStyle,
  label: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  } as TextStyle,
  recipeName: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
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

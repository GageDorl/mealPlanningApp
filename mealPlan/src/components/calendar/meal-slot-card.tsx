import { Pressable, View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MealSlotWithRecipe } from '@/services/meal-plan-service';
import { ICON_COMPONENTS } from '@/components/ui/icon-picker';

const ACCENT = '#4A90D9';

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
  const IconComp = slot.icon ? ICON_COMPONENTS[slot.icon] : null;

  if (compact) {
    return (
      <Pressable
        style={[styles.block, styles.blockCompact, { backgroundColor: `${ACCENT}66`, borderLeftColor: ACCENT }]}
        onPress={hasRecipes ? onPress : onAssignRecipe}
      >
        <View style={styles.compactRow}>
          {IconComp && <IconComp size={12} color={ACCENT} />}
          <Text style={[styles.compactLabel, { color: ACCENT }]} numberOfLines={1} ellipsizeMode="tail">
            {slot.label}
          </Text>
          {hasRecipes && (
            <Text style={[styles.compactName, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
              {primary!.title}
            </Text>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.block, { backgroundColor: `${ACCENT}66`, borderLeftColor: ACCENT }]}
      onPress={hasRecipes ? onPress : onAssignRecipe}
    >
      <View style={styles.headerRow}>
        {IconComp && <IconComp size={14} color={ACCENT} />}
        <Text style={[styles.label, { color: ACCENT }]} numberOfLines={1} ellipsizeMode="tail">
          {slot.label}
        </Text>
        <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteButton}>
          <Text style={[styles.deleteIcon, { color: theme.textSecondary }]}>×</Text>
        </Pressable>
      </View>

      {hasRecipes ? (
        <>
          <View style={styles.recipeRow}>
            <Text style={[styles.recipeName, { color: theme.text }]} numberOfLines={2} ellipsizeMode="tail">
              {primary!.title}
            </Text>
            {extraCount > 0 && (
              <Text style={[styles.extraBadge, { color: ACCENT }]}>+{extraCount}</Text>
            )}
          </View>
          {primary!.calories_per_serving != null && (
            <Text style={[styles.calHint, { color: theme.textSecondary }]}>
              {Math.round(primary!.calories_per_serving)} kcal
            </Text>
          )}
        </>
      ) : (
        <Pressable onPress={onAssignRecipe}>
          <Text style={[styles.emptyState, { color: ACCENT }]}>+ Add recipe</Text>
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

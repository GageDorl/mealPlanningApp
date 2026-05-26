import { Pressable, View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MealSlotWithRecipe } from '@/services/meal-plan-service';

interface MealsPreviewCardProps {
  slots: MealSlotWithRecipe[];
  onPress: () => void;
}

const MAX_VISIBLE = 4;

export function MealsPreviewCard({ slots, onPress }: MealsPreviewCardProps) {
  const theme = useTheme();
  const visible = slots.slice(0, MAX_VISIBLE);
  const overflow = slots.length - MAX_VISIBLE;

  return (
    <Pressable
      style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      onPress={onPress}
    >
      <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Today's Meals</Text>

      {slots.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { borderColor: theme.border }]}>
            <Text style={[styles.emptyIconText, { color: theme.textSecondary }]}>+</Text>
          </View>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No meals planned for today
          </Text>
        </View>
      ) : (
        <View style={styles.slotList}>
          {visible.map((slot) => (
            <View
              key={slot.id}
              style={[styles.slotRow, { borderBottomColor: theme.border }]}
            >
              <View style={[styles.slotDot, { backgroundColor: slot.recipe ? Colors.accent : theme.border }]} />
              <View style={styles.slotText}>
                <Text style={[styles.slotLabel, { color: theme.text }]} numberOfLines={1}>
                  {slot.label}
                </Text>
                {slot.recipe ? (
                  <Text style={[styles.slotRecipe, { color: theme.textSecondary }]} numberOfLines={1}>
                    {slot.recipe.title}
                  </Text>
                ) : (
                  <Text style={[styles.slotEmpty, { color: theme.textSecondary }]}>
                    No recipe assigned
                  </Text>
                )}
              </View>
              {slot.recipe?.calories_per_serving != null && (
                <Text style={[styles.slotCals, { color: theme.textSecondary }]}>
                  {Math.round(slot.recipe.calories_per_serving)} cal
                </Text>
              )}
            </View>
          ))}
          {overflow > 0 && (
            <Text style={[styles.overflow, { color: Colors.accent }]}>
              +{overflow} more
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.sm,
    flex: 1,
  } as ViewStyle,
  cardTitle: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  } as TextStyle,
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  } as ViewStyle,
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  emptyIconText: {
    fontSize: FontSizes.xl,
    fontWeight: '300',
  } as TextStyle,
  emptyText: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
  } as TextStyle,
  slotList: {
    gap: Spacing.xs,
  } as ViewStyle,
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  slotDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  } as ViewStyle,
  slotText: {
    flex: 1,
    gap: 1,
  } as ViewStyle,
  slotLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  slotRecipe: {
    fontSize: FontSizes.xs,
  } as TextStyle,
  slotEmpty: {
    fontSize: FontSizes.xs,
    fontStyle: 'italic',
  } as TextStyle,
  slotCals: {
    fontSize: FontSizes.xs,
    flexShrink: 0,
  } as TextStyle,
  overflow: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    marginTop: Spacing.xs,
  } as TextStyle,
});

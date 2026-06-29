import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { MealSlotCard } from '@/components/calendar/meal-slot-card';
import { MealSlotDetailModal } from '@/components/calendar/meal-slot-detail-modal';
import type { MealSlotWithRecipe } from '@/services/meal-plan-service';
import type { Recipe } from '@/models/recipe';

const NOOP = () => {};

const FILLER_RECIPE: Recipe = {
  id: 'tutorial-recipe-1',
  user_id: null,
  title: 'Chicken & Rice Bowl',
  source_type: 'user_created',
  servings: 2,
  is_favorited: false,
  is_offline_available: false,
  calories_per_serving: 520,
  protein_per_serving: 42,
  carbs_per_serving: 58,
  fat_per_serving: 12,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const FILLER_SLOT: MealSlotWithRecipe = {
  id: 'tutorial-slot-1',
  meal_plan_id: 'tutorial-plan',
  label: 'Lunch',
  date: '2026-06-27',
  time_of_day: '12:30',
  display_order: 0,
  icon: 'Sandwich',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  recipes: [{
    id: 'tutorial-sr-1',
    meal_slot_id: 'tutorial-slot-1',
    recipe_id: FILLER_RECIPE.id,
    servings_eaten: 2,
    display_order: 0,
    recipe: FILLER_RECIPE,
  }],
};

export function AdjustServingsPreview() {
  const theme = useTheme();
  const [activeSlot, setActiveSlot] = useState<MealSlotWithRecipe | null>(null);

  return (
    <View style={styles.container}>
      <Text style={[styles.hint, { color: theme.textSecondary }]}>
        Tap the meal slot to open it and try adjusting servings.
      </Text>

      <MealSlotCard
        slot={FILLER_SLOT}
        onPress={() => setActiveSlot(FILLER_SLOT)}
        onAssignRecipe={NOOP}
        onDelete={NOOP}
      />

      <View style={[styles.callout, { backgroundColor: `${Colors.accent}15`, borderColor: `${Colors.accent}40` }]}>
        <Text style={[styles.calloutText, { color: theme.text }]}>
          Change the <Text style={{ color: Colors.accent, fontWeight: '700' }}>servings</Text> field and watch the calorie total update live.
        </Text>
      </View>

      <MealSlotDetailModal
        slot={activeSlot}
        onClose={() => setActiveSlot(null)}
        onAddRecipe={NOOP}
        onRemoveRecipe={NOOP}
        onSaveRecipeServings={NOOP}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  } as ViewStyle,
  hint: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    textAlign: 'center',
  } as TextStyle,
  callout: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  } as ViewStyle,
  calloutText: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  } as TextStyle,
});

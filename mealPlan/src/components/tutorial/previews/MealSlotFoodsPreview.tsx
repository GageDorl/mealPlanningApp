import { useState } from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { MealSlotCard } from '@/components/calendar/meal-slot-card';
import { MealSlotDetailModal } from '@/components/calendar/meal-slot-detail-modal';
import type { MealSlotWithRecipe, MealSlotFoodEntry } from '@/services/meal-plan-service';

const NOOP = () => {};

const FILLER_FOODS: MealSlotFoodEntry[] = [
  {
    id: 'tutorial-food-1',
    meal_slot_id: 'tutorial-slot-2',
    food_name: 'Quest Protein Bar',
    brand_name: 'Chocolate Chip Cookie Dough',
    servings_planned: 1,
    calories: 190,
    protein: 21,
    carbs: 22,
    fat: 8,
    source: 'fatsecret',
    source_id: 'fs-tutorial-1',
    display_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'tutorial-food-2',
    meal_slot_id: 'tutorial-slot-2',
    food_name: 'Premier Protein Shake',
    brand_name: 'Chocolate',
    servings_planned: 1,
    calories: 160,
    protein: 30,
    carbs: 4,
    fat: 3,
    source: 'fatsecret',
    source_id: 'fs-tutorial-2',
    display_order: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const FILLER_SLOT: MealSlotWithRecipe = {
  id: 'tutorial-slot-2',
  meal_plan_id: 'tutorial-plan',
  label: 'Breakfast',
  date: '2026-06-27',
  time_of_day: '07:30',
  display_order: 0,
  icon: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  recipes: [],
  foods: FILLER_FOODS,
};

export function MealSlotFoodsPreview() {
  const theme = useTheme();
  const [slot, setSlot] = useState<MealSlotWithRecipe>(FILLER_SLOT);
  const [modalOpen, setModalOpen] = useState(false);

  const handleRemoveFood = (foodId: string) => {
    setSlot((prev) => ({ ...prev, foods: prev.foods.filter((f) => f.id !== foodId) }));
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.hint, { color: theme.textSecondary }]}>
        Tap the meal slot to see what's planned — try removing an item.
      </Text>

      <MealSlotCard
        slot={slot}
        onPress={() => setModalOpen(true)}
        onAssignRecipe={NOOP}
        onDelete={NOOP}
      />

      <View style={[styles.callout, { backgroundColor: `${Colors.accent}15`, borderColor: `${Colors.accent}40` }]}>
        <Text style={[styles.calloutText, { color: theme.text }]}>
          Meal slots aren't limited to recipes — plan a specific item you're going to buy too, matched to real nutrition data.
        </Text>
      </View>

      <MealSlotDetailModal
        slot={modalOpen ? slot : null}
        onClose={() => setModalOpen(false)}
        onAddRecipe={NOOP}
        onRemoveRecipe={NOOP}
        onSaveRecipeServings={NOOP}
        onRemoveFood={handleRemoveFood}
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

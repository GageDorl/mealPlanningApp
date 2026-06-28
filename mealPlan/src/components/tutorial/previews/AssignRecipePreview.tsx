import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { MealSlotCard } from '@/components/calendar/meal-slot-card';
import type { MealSlotWithRecipe } from '@/services/meal-plan-service';
import type { Recipe } from '@/models/recipe';

const NOOP = () => {};

function fakeRecipe(title: string, kcal: number, protein: number): Recipe {
  return {
    id: title,
    user_id: null,
    title,
    source_type: 'user_created',
    servings: 1,
    is_favorited: false,
    is_offline_available: false,
    calories_per_serving: kcal,
    protein_per_serving: protein,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

const ASSIGNED = fakeRecipe('Chicken & Rice Bowl', 520, 42);

const LUNCH_SLOT: MealSlotWithRecipe = {
  id: 'l1',
  meal_plan_id: 'mp1',
  label: 'Lunch',
  date: '2026-06-27',
  time_of_day: '12:30',
  display_order: 0,
  icon: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  recipes: [{
    id: 'l1-r',
    meal_slot_id: 'l1',
    recipe_id: ASSIGNED.id,
    servings_eaten: null,
    display_order: 0,
    recipe: ASSIGNED,
  }],
};

const LIBRARY = [
  { title: 'Grilled Salmon Salad', kcal: 390 },
  { title: 'Turkey Wrap', kcal: 440 },
  { title: 'Lentil Soup', kcal: 310 },
];

export function AssignRecipePreview() {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {/* Meal slot with recipe assigned */}
      <MealSlotCard
        slot={LUNCH_SLOT}
        onPress={NOOP}
        onAssignRecipe={NOOP}
        onDelete={NOOP}
      />

      {/* Recipe library picker */}
      <View style={[styles.library, { borderColor: theme.border }]}>
        <Text style={[styles.libraryHeader, { color: theme.textSecondary }]}>From your library</Text>

        {LIBRARY.map((r, i) => (
          <View
            key={r.title}
            style={[
              styles.recipeRow,
              i < LIBRARY.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
            ]}
          >
            <Text style={[styles.recipeTitle, { color: theme.text }]} numberOfLines={1}>
              {r.title}
            </Text>
            <Text style={[styles.recipeKcal, { color: theme.textSecondary }]}>{r.kcal} kcal</Text>
          </View>
        ))}

        <View style={[styles.assignedRow, { backgroundColor: `${Colors.accent}1A` }]}>
          <Text style={[styles.recipeTitle, { color: Colors.accent }]} numberOfLines={1}>
            {ASSIGNED.title}
          </Text>
          <Text style={[styles.recipeKcal, { color: Colors.accent }]}>
            ✓ {ASSIGNED.calories_per_serving} kcal
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  } as ViewStyle,
  library: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  } as ViewStyle,
  libraryHeader: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  } as TextStyle,
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  } as ViewStyle,
  recipeTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    flex: 1,
  } as TextStyle,
  recipeKcal: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    flexShrink: 0,
    marginLeft: Spacing.sm,
  } as TextStyle,
  assignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  } as ViewStyle,
});

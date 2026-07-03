import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions, type TextStyle, type ViewStyle } from 'react-native';
import { WoodTexture } from '@/components/WoodTexture';
import { useRouter } from 'expo-router';
import { usePowerSync, useQuery } from '@powersync/react-native';
import { randomUUID } from 'expo-crypto';
import { Colors, Spacing, FontSizes, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getCachedUserId } from '@/services/supabase';
import * as mealPlanService from '@/services/meal-plan-service';
import type { MealSlotFoodInput } from '@/services/meal-plan-service';
import { lookupIngredient } from '@/services/fatsecret';
import { fetchWeeklySuggestions, type WeeklyQuestionnaire, type WeeklyMealItem } from '@/services/week-planner-service';
import { PlanWeekQuestionnaire } from '@/components/week-planner/PlanWeekQuestionnaire';
import { WeekSuggestions, type WeekSuggestionItem, type DailyMacroGoals } from '@/components/week-planner/WeekSuggestions';

type Step = 'questionnaire' | 'suggestions';

interface MacroGoalRow {
  macro_name: string;
  daily_target: number;
}

function dateForDay(day: number): string {
  const d = new Date();
  d.setDate(d.getDate() + (day - 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weekStartForDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - d.getDay());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// "buy" items get matched to a real FatSecret product (top search result) so macros are
// accurate; anything unmatched (or a "cook" item, which won't be in a nutrition database)
// falls back to Claude's estimate.
async function matchItemToFood(item: WeeklyMealItem, db: Parameters<typeof lookupIngredient>[2]): Promise<MealSlotFoodInput> {
  if (item.type === 'buy') {
    try {
      const response = await lookupIngredient(item.name, 1, db);
      const top = response.results[0];
      if (top) {
        return {
          food_name: top.name,
          brand_name: top.brand_name ?? null,
          serving_size_amount: null,
          serving_size_unit: top.servingDescription ?? null,
          servings_planned: 1,
          calories: top.caloriesPerServing ?? top.caloriesPer100g,
          protein: top.proteinPerServing ?? top.proteinPer100g,
          carbs: top.carbsPerServing ?? top.carbsPer100g,
          fat: top.fatPerServing ?? top.fatPer100g,
          source: 'fatsecret',
          source_id: top.id,
        };
      }
    } catch {
      // fall through to AI estimate below
    }
  }
  return {
    food_name: item.name,
    brand_name: null,
    serving_size_amount: null,
    serving_size_unit: null,
    servings_planned: 1,
    calories: item.estimated_macros.calories,
    protein: item.estimated_macros.protein,
    carbs: item.estimated_macros.carbs,
    fat: item.estimated_macros.fat,
    source: 'ai_estimate',
    source_id: null,
  };
}

export default function PlanWeekScreen() {
  const router = useRouter();
  const theme = useTheme();
  const db = usePowerSync();
  const { width, height } = useWindowDimensions();
  const userId = getCachedUserId() ?? '';

  const { data: goalRows } = useQuery<MacroGoalRow>(
    'SELECT macro_name, daily_target FROM macro_goals WHERE user_id = ? AND is_active = 1',
    [userId],
  );

  const dailyGoals = useMemo<DailyMacroGoals | null>(() => {
    if (goalRows.length === 0) return null;
    const map: Record<string, number> = {};
    for (const g of goalRows) map[g.macro_name] = g.daily_target;
    return {
      calories: map['calories'] ?? 0,
      protein: map['protein'] ?? 0,
      carbs: map['carbs'] ?? 0,
      fat: map['fat'] ?? 0,
    };
  }, [goalRows]);

  const [step, setStep] = useState<Step>('questionnaire');
  const [submitting, setSubmitting] = useState(false);
  const [addingAll, setAddingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<WeekSuggestionItem[]>([]);

  const handleQuestionnaireSubmit = async (questionnaire: WeeklyQuestionnaire) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await fetchWeeklySuggestions(questionnaire);
      setSuggestions(result.map((s) => ({ ...s, id: randomUUID() })));
      setStep('suggestions');
    } catch (err) {
      setError((err as Error).message ?? 'Failed to get suggestions');
    } finally {
      setSubmitting(false);
    }
  };

  // Plans a meal (a new meal slot on the calendar) with all of its items — creating the week's
  // meal_plan if needed, since AI-suggested days can span into next calendar week.
  const addSuggestionToSlot = useCallback(async (suggestion: WeekSuggestionItem) => {
    const userId = getCachedUserId();
    if (!userId) throw new Error('Not signed in');
    const targetDate = dateForDay(suggestion.day);
    const weekStart = weekStartForDate(targetDate);
    const mealPlanId = await mealPlanService.ensureMealPlan(db, userId, weekStart);
    const slot = await mealPlanService.createSlot(db, {
      mealPlanId,
      label: suggestion.meal_label,
      date: targetDate,
      displayOrder: 0,
      icon: null,
    });
    await Promise.all(suggestion.items.map(async (item) => {
      const input = await matchItemToFood(item, db);
      await mealPlanService.addFoodToSlot(db, slot.id, input);
    }));
  }, [db]);

  const handleAddToCalendar = useCallback(async (suggestion: WeekSuggestionItem) => {
    try {
      await addSuggestionToSlot(suggestion);
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
    } catch (err) {
      setError((err as Error).message ?? 'Failed to add to calendar');
    }
  }, [addSuggestionToSlot]);

  const handleSkip = (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddAll = useCallback(async () => {
    setAddingAll(true);
    setError(null);
    try {
      await Promise.all(suggestions.map((s) => addSuggestionToSlot(s)));
      setSuggestions([]);
    } catch (err) {
      setError((err as Error).message ?? 'Failed to add meals to your calendar');
    } finally {
      setAddingAll(false);
    }
  }, [suggestions, addSuggestionToSlot]);

  return (
    <View style={{ flex: 1 }}>
      <WoodTexture width={width} height={height} style={StyleSheet.absoluteFill} />
      <View style={[styles.root, { backgroundColor: 'transparent' }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Text style={[styles.backIcon, { color: Colors.accent }]}>‹</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Plan Your Week</Text>
            <Text style={[styles.stepIndicator, { color: theme.textSecondary }]}>
              Step {step === 'questionnaire' ? 1 : 2} of 2
            </Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        {submitting ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Finding meals for your week…</Text>
          </View>
        ) : step === 'questionnaire' ? (
          <>
            {error && <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>}
            <PlanWeekQuestionnaire submitting={submitting} onSubmit={handleQuestionnaireSubmit} />
          </>
        ) : (
          <>
            {error && <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>}
            <WeekSuggestions
              suggestions={suggestions}
              addingAll={addingAll}
              dailyGoals={dailyGoals}
              onAddToCalendar={handleAddToCalendar}
              onSkip={handleSkip}
              onAddAll={handleAddAll}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  } as ViewStyle,
  backBtn: {
    width: 28,
    flexShrink: 0,
  } as ViewStyle,
  backIcon: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  } as TextStyle,
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  } as ViewStyle,
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  } as TextStyle,
  stepIndicator: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    marginTop: 2,
  } as TextStyle,
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  } as ViewStyle,
  loadingText: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  errorText: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  } as TextStyle,
});

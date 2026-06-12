import { useCallback, useEffect, useState } from 'react';
import * as mealPlanService from '@/services/meal-plan-service';
import type { WeekPlan, MealSlotWithRecipe } from '@/services/meal-plan-service';
import { useSessionReload } from '@/hooks/use-session-reload';

export function useMealPlan(weekStart: Date) {
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWeek = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const plan = await mealPlanService.getWeek(weekStart);
      setWeekPlan(plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load meal plan');
    } finally {
      setLoading(false);
    }
  }, [weekStart.toISOString()]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  const createSlot = useCallback(
    async (params: { label: string; date: string; time?: string; displayOrder: number }): Promise<string | null> => {
      if (!weekPlan) return null;
      const slot = await mealPlanService.createSlot({
        mealPlanId: weekPlan.mealPlan.id,
        ...params,
      });
      setWeekPlan((prev) => (prev ? { ...prev, slots: [...prev.slots, { ...slot, recipes: [] } as MealSlotWithRecipe] } : prev));
      return slot.id;
    },
    [weekPlan],
  );

  const addRecipeToSlot = useCallback(async (slotId: string, recipeId: string) => {
    await mealPlanService.addRecipeToSlot(slotId, recipeId);
    await loadWeek();
  }, [loadWeek]);

  const removeRecipeFromSlot = useCallback(async (slotRecipeId: string) => {
    await mealPlanService.removeRecipeFromSlot(slotRecipeId);
    setWeekPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slots: prev.slots.map((s) => ({
          ...s,
          recipes: s.recipes.filter((r) => r.id !== slotRecipeId),
        })),
      };
    });
  }, []);

  const updateSlotRecipeServings = useCallback(async (slotRecipeId: string, servings: number | null) => {
    await mealPlanService.updateSlotRecipeServings(slotRecipeId, servings);
    setWeekPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slots: prev.slots.map((s) => ({
          ...s,
          recipes: s.recipes.map((r) => r.id === slotRecipeId ? { ...r, servings_eaten: servings } : r),
        })),
      };
    });
  }, []);

  const deleteSlot = useCallback(async (slotId: string) => {
    await mealPlanService.deleteSlot(slotId);
    setWeekPlan((prev) => {
      if (!prev) return prev;
      return { ...prev, slots: prev.slots.filter((s) => s.id !== slotId) };
    });
  }, []);


  const refresh = loadWeek;
  useSessionReload(refresh);

  return {
    weekPlan,
    loading,
    error,
    createSlot,
    addRecipeToSlot,
    removeRecipeFromSlot,
    updateSlotRecipeServings,
    deleteSlot,
    refresh,
  };
}

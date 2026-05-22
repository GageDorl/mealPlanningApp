import { useCallback, useEffect, useState } from 'react';
import * as mealPlanService from '@/services/meal-plan-service';
import type { WeekPlan } from '@/services/meal-plan-service';

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
    async (params: { label: string; date: string; time?: string; displayOrder: number }) => {
      if (!weekPlan) return;
      const slot = await mealPlanService.createSlot({
        mealPlanId: weekPlan.mealPlan.id,
        ...params,
      });
      setWeekPlan((prev) => (prev ? { ...prev, slots: [...prev.slots, { ...slot, recipe: null }] } : prev));
    },
    [weekPlan],
  );

  const assignRecipe = useCallback(async (slotId: string, recipeId: string) => {
    await mealPlanService.assignRecipe(slotId, recipeId);
    await loadWeek();
  }, [loadWeek]);

  const removeRecipe = useCallback(async (slotId: string) => {
    await mealPlanService.removeRecipe(slotId);
    setWeekPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slots: prev.slots.map((s) =>
          s.id === slotId ? { ...s, assignedRecipeId: undefined, recipe: null } : s,
        ),
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

  return {
    weekPlan,
    loading,
    error,
    createSlot,
    assignRecipe,
    removeRecipe,
    deleteSlot,
    refresh,
  };
}

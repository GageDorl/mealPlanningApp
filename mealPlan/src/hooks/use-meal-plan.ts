import { useCallback, useEffect, useState } from 'react';
import * as mealPlanService from '@/services/meal-plan-service';
import { withTimeout } from '@/utils/with-timeout';
import type { WeekPlan, MealSlotWithRecipe } from '@/services/meal-plan-service';
import { useSessionReload } from '@/hooks/use-session-reload';

export function useMealPlan(weekStart: Date) {
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWeek = useCallback(async () => {
    const weekLabel = weekStart.toISOString().slice(0, 10);
    console.log('[meal-plan] loadWeek started:', weekLabel);
    setLoading(true);
    setError(null);

    const attempt = async () =>
      withTimeout(mealPlanService.getWeek(weekStart), 10_000, 'getWeek');

    try {
      let plan: WeekPlan;
      try {
        plan = await attempt();
      } catch (firstErr) {
        const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
        if (msg.includes('[timeout]') || msg.includes('aborted') || msg.includes('AbortError')) {
          // Network likely re-establishing after background — wait then retry once
          console.log('[meal-plan] timeout on first attempt, retrying in 2s...');
          await new Promise((r) => setTimeout(r, 2000));
          plan = await attempt();
        } else {
          throw firstErr;
        }
      }
      console.log('[meal-plan] getWeek done, slots:', plan?.slots?.length ?? 0);
      setWeekPlan(plan);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log('[meal-plan] loadWeek error (final):', msg);
      setError(msg.includes('[timeout]') ? 'Connection timed out — pull to refresh' : msg);
    } finally {
      console.log('[meal-plan] loadWeek done, loading → false');
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

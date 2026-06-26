import { useCallback, useMemo, useState } from 'react';
import { usePowerSync, useQuery } from '@powersync/react-native';
import { getCachedUserId } from '@/services/supabase';
import {
  computeDailyProgress,
  type DailyMacroProgress,
  type FlatLogRow,
  type FlatSlotRow,
  type MacroGoalRow,
} from '@/services/macro-service';
import { deleteSlot } from '@/services/meal-plan-service';

function dateToString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const LOG_ITEMS_QUERY = `
  SELECT fl.id AS log_id, fl.label, fl.time_of_day,
    fli.id AS item_id, fli.food_name, fli.brand_name,
    fli.calories, fli.protein, fli.carbs, fli.fat,
    fli.dietary_fiber, fli.total_sugar, fli.sodium, fli.servings_eaten
  FROM food_log_items fli
  JOIN food_logs fl ON fl.id = fli.food_log_id
  WHERE fl.user_id = ? AND fl.date = ?
`;

const SLOT_RECIPES_QUERY = `
  SELECT ms.id AS slot_id, ms.label, ms.time_of_day,
    msr.id AS msr_id, msr.servings_eaten,
    r.title AS recipe_title, r.servings AS recipe_servings,
    r.calories_per_serving, r.protein_per_serving, r.carbs_per_serving,
    r.fat_per_serving, r.fiber_per_serving, r.sugar_per_serving, r.sodium_per_serving
  FROM meal_slot_recipes msr
  JOIN meal_slots ms ON ms.id = msr.meal_slot_id
  JOIN recipes r ON r.id = msr.recipe_id
  JOIN meal_plans mp ON mp.id = ms.meal_plan_id
  WHERE mp.user_id = ? AND ms.date = ?
`;

export function useMacros(initialDate?: Date) {
  const db = usePowerSync();
  const userId = getCachedUserId() ?? '';
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate ?? new Date());
  const dateStr = dateToString(selectedDate);

  const { data: goalRows } = useQuery<MacroGoalRow>(
    'SELECT * FROM macro_goals WHERE user_id = ? AND is_active = 1 ORDER BY display_order',
    [userId],
  );
  const { data: logRows } = useQuery<FlatLogRow>(LOG_ITEMS_QUERY, [userId, dateStr]);
  const { data: slotRows } = useQuery<FlatSlotRow>(SLOT_RECIPES_QUERY, [userId, dateStr]);

  const dailyProgress = useMemo<DailyMacroProgress | null>(() => {
    if (!userId) return null;
    return computeDailyProgress(dateStr, goalRows, logRows, slotRows);
  }, [userId, dateStr, goalRows, logRows, slotRows]);

  const goToPrevDay = useCallback(() => {
    setSelectedDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() - 1);
      return next;
    });
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      return dateToString(next) > dateToString(new Date()) ? d : next;
    });
  }, []);

  const goToDate = useCallback((date: Date) => {
    setSelectedDate(dateToString(date) > dateToString(new Date()) ? new Date() : date);
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const deleteMealSlot = useCallback(async (slotId: string) => {
    await deleteSlot(db, slotId);
  }, [db]);

  return {
    selectedDate,
    dailyProgress,
    goalRows,
    loading: false,
    error: null,
    goToPrevDay,
    goToNextDay,
    goToToday,
    goToDate,
    refresh: useCallback(() => {}, []),
    deleteMealSlot,
  };
}

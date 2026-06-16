import { useCallback, useEffect, useMemo } from 'react';
import { usePowerSync, useQuery } from '@powersync/react-native';
import { getCachedUserId } from '@/services/supabase';
import * as mealPlanService from '@/services/meal-plan-service';
import type { WeekPlan, MealSlotWithRecipe } from '@/services/meal-plan-service';
import type { MealPlan } from '@/models/meal-plan';
import type { Recipe } from '@/models/recipe';
import { useSessionReload } from '@/hooks/use-session-reload';

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // back to Sunday
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface PlanRow {
  id: string;
  user_id: string;
  week_start: string;
  created_at: string;
  updated_at: string;
}

interface FlatSlotRow {
  slot_id: string;
  meal_plan_id: string;
  label: string;
  date: string;
  time_of_day: string | null;
  slot_order: number;
  external_event_id: string | null;
  serving_override: number | null;
  slot_icon: string | null;
  slot_created_at: string;
  slot_updated_at: string;
  msr_id: string | null;
  recipe_id: string | null;
  servings_eaten: number | null;
  recipe_order: number | null;
  r_id: string | null;
  r_user_id: string | null;
  r_title: string | null;
  r_description: string | null;
  r_image_url: string | null;
  r_prep_minutes: number | null;
  r_cook_minutes: number | null;
  r_servings: number | null;
  r_difficulty: string | null;
  r_cuisine_type: string | null;
  r_source_type: string | null;
  r_source_url: string | null;
  r_source_api_id: string | null;
  r_is_favorited: number | null;
  r_is_offline_available: number | null;
  r_calories_per_serving: number | null;
  r_protein_per_serving: number | null;
  r_carbs_per_serving: number | null;
  r_fat_per_serving: number | null;
  r_fiber_per_serving: number | null;
  r_sugar_per_serving: number | null;
  r_sodium_per_serving: number | null;
  r_instructions: string | null;
  r_dietary_tags: string | null;
  r_created_at: string | null;
  r_updated_at: string | null;
}

const SLOT_QUERY = `
  SELECT
    ms.id AS slot_id, ms.meal_plan_id, ms.label, ms.date, ms.time_of_day,
    ms.display_order AS slot_order, ms.external_event_id, ms.serving_override,
    ms.icon AS slot_icon,
    ms.created_at AS slot_created_at, ms.updated_at AS slot_updated_at,
    msr.id AS msr_id, msr.recipe_id, msr.servings_eaten,
    msr.display_order AS recipe_order,
    r.id AS r_id, r.user_id AS r_user_id, r.title AS r_title,
    r.description AS r_description, r.image_url AS r_image_url,
    r.prep_minutes AS r_prep_minutes, r.cook_minutes AS r_cook_minutes,
    r.servings AS r_servings, r.difficulty AS r_difficulty,
    r.cuisine_type AS r_cuisine_type, r.source_type AS r_source_type,
    r.source_url AS r_source_url, r.source_api_id AS r_source_api_id,
    r.is_favorited AS r_is_favorited, r.is_offline_available AS r_is_offline_available,
    r.calories_per_serving AS r_calories_per_serving,
    r.protein_per_serving AS r_protein_per_serving,
    r.carbs_per_serving AS r_carbs_per_serving,
    r.fat_per_serving AS r_fat_per_serving,
    r.fiber_per_serving AS r_fiber_per_serving,
    r.sugar_per_serving AS r_sugar_per_serving,
    r.sodium_per_serving AS r_sodium_per_serving,
    r.instructions AS r_instructions, r.dietary_tags AS r_dietary_tags,
    r.created_at AS r_created_at, r.updated_at AS r_updated_at
  FROM meal_slots ms
  LEFT JOIN meal_slot_recipes msr ON msr.meal_slot_id = ms.id
  LEFT JOIN recipes r ON r.id = msr.recipe_id
  WHERE ms.meal_plan_id = ?
  ORDER BY ms.date, ms.display_order, msr.display_order
`;

export function useMealPlan(weekStart: Date) {
  const db = usePowerSync();
  const userId = getCachedUserId() ?? '';
  const weekStartStr = getWeekStart(weekStart);

  const { data: planRows } = useQuery<PlanRow>(
    'SELECT * FROM meal_plans WHERE user_id = ? AND week_start = ? ORDER BY created_at ASC LIMIT 1',
    [userId, weekStartStr],
  );
  const mealPlanRow = planRows[0];

  const { data: slotRows } = useQuery<FlatSlotRow>(
    SLOT_QUERY,
    [mealPlanRow?.id ?? ''],
  );

  // Auto-create a meal plan for this week if none exists in local SQLite
  useEffect(() => {
    if (!userId || mealPlanRow) return;
    mealPlanService.ensureMealPlan(db, userId, weekStartStr);
  }, [userId, weekStartStr, mealPlanRow, db]);

  const weekPlan = useMemo<WeekPlan | null>(() => {
    if (!mealPlanRow) return null;

    const mealPlan: MealPlan = {
      id: mealPlanRow.id,
      user_id: mealPlanRow.user_id,
      week_start: mealPlanRow.week_start,
      created_at: mealPlanRow.created_at,
      updated_at: mealPlanRow.updated_at,
    };

    const slotMap = new Map<string, MealSlotWithRecipe>();
    for (const row of slotRows) {
      if (!slotMap.has(row.slot_id)) {
        slotMap.set(row.slot_id, {
          id: row.slot_id,
          meal_plan_id: row.meal_plan_id,
          label: row.label ?? '',
          date: row.date,
          time_of_day: row.time_of_day ?? null,
          display_order: row.slot_order,
          external_event_id: row.external_event_id ?? null,
          serving_override: row.serving_override ?? null,
          icon: row.slot_icon ?? null,
          created_at: row.slot_created_at,
          updated_at: row.slot_updated_at,
          recipes: [],
        });
      }
      if (row.msr_id && row.recipe_id && row.r_id) {
        const recipe: Recipe = {
          id: row.r_id,
          user_id: row.r_user_id ?? null,
          title: row.r_title ?? '',
          description: row.r_description ?? null,
          image_url: row.r_image_url ?? null,
          prep_minutes: row.r_prep_minutes ?? null,
          cook_minutes: row.r_cook_minutes ?? null,
          servings: row.r_servings ?? 1,
          difficulty: row.r_difficulty as Recipe['difficulty'] ?? null,
          cuisine_type: row.r_cuisine_type ?? null,
          source_type: (row.r_source_type ?? 'user_created') as Recipe['source_type'],
          source_url: row.r_source_url ?? null,
          source_api_id: row.r_source_api_id ?? null,
          is_favorited: Boolean(row.r_is_favorited),
          is_offline_available: Boolean(row.r_is_offline_available),
          calories_per_serving: row.r_calories_per_serving ?? null,
          protein_per_serving: row.r_protein_per_serving ?? null,
          carbs_per_serving: row.r_carbs_per_serving ?? null,
          fat_per_serving: row.r_fat_per_serving ?? null,
          fiber_per_serving: row.r_fiber_per_serving ?? null,
          sugar_per_serving: row.r_sugar_per_serving ?? null,
          sodium_per_serving: row.r_sodium_per_serving ?? null,
          instructions: row.r_instructions ? JSON.parse(row.r_instructions) : null,
          dietary_tags: row.r_dietary_tags ? JSON.parse(row.r_dietary_tags) : null,
          created_at: row.r_created_at ?? '',
          updated_at: row.r_updated_at ?? '',
        };
        slotMap.get(row.slot_id)!.recipes.push({
          id: row.msr_id,
          meal_slot_id: row.slot_id,
          recipe_id: row.recipe_id,
          servings_eaten: row.servings_eaten ?? null,
          display_order: row.recipe_order ?? 0,
          recipe,
        });
      }
    }

    return { mealPlan, slots: Array.from(slotMap.values()) };
  }, [mealPlanRow, slotRows]);

  const createSlot = useCallback(
    async (params: { label: string; date: string; time?: string; displayOrder: number; icon?: string | null }): Promise<string | null> => {
      if (!weekPlan) return null;
      const slot = await mealPlanService.createSlot(db, {
        mealPlanId: weekPlan.mealPlan.id,
        ...params,
      });
      return slot.id;
    },
    [db, weekPlan],
  );

  const addRecipeToSlot = useCallback(async (slotId: string, recipeId: string) => {
    await mealPlanService.addRecipeToSlot(db, slotId, recipeId);
  }, [db]);

  const removeRecipeFromSlot = useCallback(async (slotRecipeId: string) => {
    await mealPlanService.removeRecipeFromSlot(db, slotRecipeId);
  }, [db]);

  const updateSlotRecipeServings = useCallback(async (slotRecipeId: string, servings: number | null) => {
    await mealPlanService.updateSlotRecipeServings(db, slotRecipeId, servings);
  }, [db]);

  const updateSlot = useCallback(
    async (slotId: string, patch: { label?: string; time_of_day?: string | null; icon?: string | null }) => {
      await mealPlanService.updateSlot(db, slotId, patch);
    },
    [db],
  );

  const deleteSlot = useCallback(async (slotId: string) => {
    await mealPlanService.deleteSlot(db, slotId);
  }, [db]);

  const refresh = useCallback(() => {}, []);
  useSessionReload(refresh);

  return {
    weekPlan,
    loading: false,
    error: null,
    createSlot,
    updateSlot,
    addRecipeToSlot,
    removeRecipeFromSlot,
    updateSlotRecipeServings,
    deleteSlot,
    refresh,
  };
}

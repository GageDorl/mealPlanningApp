import { useCallback, useMemo } from 'react';
import { usePowerSync, useQuery } from '@powersync/react-native';
import { getCachedUserId } from '@/services/supabase';
import * as mealPlanService from '@/services/meal-plan-service';
import type { WeekPlan, MealSlotWithRecipe, MealSlotFoodEntry, MealSlotFoodInput } from '@/services/meal-plan-service';
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
  WHERE ms.meal_plan_id IN (__MEAL_PLAN_IDS__)
  ORDER BY ms.date, ms.display_order, msr.display_order
`;

interface FlatFoodRow {
  msf_id: string;
  meal_slot_id: string;
  food_name: string;
  brand_name: string | null;
  serving_size_amount: number | null;
  serving_size_unit: string | null;
  servings_planned: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  saturated_fat: number | null;
  trans_fat: number | null;
  cholesterol: number | null;
  sodium: number | null;
  dietary_fiber: number | null;
  total_sugar: number | null;
  added_sugar: number | null;
  source: string | null;
  source_id: string | null;
  is_grocery_item: number | null;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

const FOOD_QUERY = `
  SELECT
    msf.id AS msf_id, msf.meal_slot_id, msf.food_name, msf.brand_name,
    msf.serving_size_amount, msf.serving_size_unit, msf.servings_planned,
    msf.calories, msf.protein, msf.carbs, msf.fat,
    msf.saturated_fat, msf.trans_fat, msf.cholesterol, msf.sodium,
    msf.dietary_fiber, msf.total_sugar, msf.added_sugar,
    msf.source, msf.source_id, msf.is_grocery_item, msf.display_order,
    msf.created_at, msf.updated_at
  FROM meal_slot_foods msf
  JOIN meal_slots ms ON ms.id = msf.meal_slot_id
  WHERE ms.meal_plan_id IN (__MEAL_PLAN_IDS__)
  ORDER BY msf.meal_slot_id, msf.display_order
`;

export function useMealPlan(weekStart: Date) {
  const db = usePowerSync();
  const userId = getCachedUserId() ?? '';
  const weekStartStr = getWeekStart(weekStart);

  // ensureMealPlan's local-cache existence check races against sync — offline-first apps
  // routinely end up with more than one meal_plans row for the same (user_id, week_start).
  // Rather than assume there's exactly one, fetch every matching row and merge their slots.
  // The oldest is treated as canonical for new writes so we stop compounding the problem.
  const { data: planRows } = useQuery<PlanRow>(
    'SELECT * FROM meal_plans WHERE user_id = ? AND week_start = ? ORDER BY created_at ASC',
    [userId, weekStartStr],
  );
  const mealPlanRow = planRows[0];
  const mealPlanIds = useMemo(() => planRows.map((p) => p.id), [planRows]);
  const mealPlanIdsKey = mealPlanIds.join(',');

  const slotSql = useMemo(
    () => SLOT_QUERY.replace('__MEAL_PLAN_IDS__', mealPlanIds.map(() => '?').join(',') || 'NULL'),
    [mealPlanIdsKey],
  );
  const foodSql = useMemo(
    () => FOOD_QUERY.replace('__MEAL_PLAN_IDS__', mealPlanIds.map(() => '?').join(',') || 'NULL'),
    [mealPlanIdsKey],
  );

  const { data: slotRows } = useQuery<FlatSlotRow>(slotSql, mealPlanIds);

  const { data: foodRows } = useQuery<FlatFoodRow>(foodSql, mealPlanIds);

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
          foods: [],
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

    for (const row of foodRows) {
      const entry: MealSlotFoodEntry = {
        id: row.msf_id,
        meal_slot_id: row.meal_slot_id,
        food_name: row.food_name,
        brand_name: row.brand_name ?? null,
        serving_size_amount: row.serving_size_amount ?? null,
        serving_size_unit: row.serving_size_unit ?? null,
        servings_planned: row.servings_planned ?? 1,
        calories: row.calories ?? null,
        protein: row.protein ?? null,
        carbs: row.carbs ?? null,
        fat: row.fat ?? null,
        saturated_fat: row.saturated_fat ?? null,
        trans_fat: row.trans_fat ?? null,
        cholesterol: row.cholesterol ?? null,
        sodium: row.sodium ?? null,
        dietary_fiber: row.dietary_fiber ?? null,
        total_sugar: row.total_sugar ?? null,
        added_sugar: row.added_sugar ?? null,
        source: (row.source ?? 'manual') as MealSlotFoodEntry['source'],
        source_id: row.source_id ?? null,
        is_grocery_item: Boolean(row.is_grocery_item),
        display_order: row.display_order ?? 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
      slotMap.get(row.meal_slot_id)?.foods.push(entry);
    }

    return { mealPlan, slots: Array.from(slotMap.values()) };
  }, [mealPlanRow, slotRows, foodRows]);

  const createSlot = useCallback(
    async (params: { label: string; date: string; time?: string; displayOrder: number; icon?: string | null }): Promise<string | null> => {
      if (!userId) return null;
      // Lazily ensure the plan exists here, at the point of an actual write, rather than
      // eagerly on every mount — the latter is what caused the local-cache/sync race to spam
      // duplicate meal_plans rows just from viewing a week with nothing in it yet.
      const mealPlanId = mealPlanRow?.id ?? await mealPlanService.ensureMealPlan(db, userId, weekStartStr);
      const slot = await mealPlanService.createSlot(db, {
        mealPlanId,
        ...params,
      });
      return slot.id;
    },
    [db, userId, weekStartStr, mealPlanRow],
  );

  const addRecipeToSlot = useCallback(async (slotId: string, recipeId: string) => {
    await mealPlanService.addRecipeToSlot(db, slotId, recipeId);
  }, [db]);

  const removeRecipeFromSlot = useCallback(async (slotRecipeId: string) => {
    await mealPlanService.removeRecipeFromSlot(db, slotRecipeId);
  }, [db]);

  const addFoodToSlot = useCallback(async (slotId: string, food: MealSlotFoodInput) => {
    return mealPlanService.addFoodToSlot(db, slotId, food);
  }, [db]);

  const removeFoodFromSlot = useCallback(async (slotFoodId: string) => {
    await mealPlanService.removeFoodFromSlot(db, slotFoodId);
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
    addFoodToSlot,
    removeFoodFromSlot,
    deleteSlot,
    refresh,
  };
}

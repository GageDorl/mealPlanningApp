import { supabase } from './supabase';
import { getFoodLogsForDay } from './food-log-service';
import { DefaultMacros } from '@/constants/macros';
import type { FoodLogItem } from '@/models/food-log';

const RECIPE_MACRO_FIELD: Record<string, keyof import('@/models/recipe').Recipe> = {
  calories: 'calories_per_serving',
  protein: 'protein_per_serving',
  carbs: 'carbs_per_serving',
  fat: 'fat_per_serving',
  fiber: 'fiber_per_serving',
  sugar: 'sugar_per_serving',
  sodium: 'sodium_per_serving',
};

const FOOD_LOG_MACRO_FIELD: Record<string, keyof FoodLogItem> = {
  calories: 'calories',
  protein: 'protein',
  carbs: 'carbs',
  fat: 'fat',
  fiber: 'dietary_fiber',
  sugar: 'total_sugar',
  sodium: 'sodium',
};

export interface MacroGoalRow {
  macro_name: string;
  daily_target: number;
  unit: string;
  display_order: number;
  is_active: boolean;
}

export interface MacroProgress {
  macro_name: string;
  label: string;
  current: number;
  goal: number;
  unit: string;
  percentage: number;
  color: string;
}

export interface MealMacroEntry {
  id: string;
  entry_type: 'planned' | 'logged';
  label: string | null;
  recipe_title?: string | null;
  food_name?: string | null;
  time_of_day?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyMacroProgress {
  date: string;
  macros: MacroProgress[];
  meal_breakdown: MealMacroEntry[];
}

function getMonday(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const diff = day === 0 ? 1 : 1 - day;
  date.setDate(date.getDate() + diff);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function getDailyProgress(userId: string, date: string): Promise<DailyMacroProgress> {
  const weekStart = getMonday(date);

  const [{ data: goalsData }, { data: planData }, foodLogs] = await Promise.all([
    supabase.from('macro_goals').select('*').eq('user_id', userId).eq('is_active', true).order('display_order'),
    supabase.from('meal_plans').select('id').eq('user_id', userId).eq('week_start', weekStart).maybeSingle(),
    getFoodLogsForDay(userId, date).catch(() => [] as import('./food-log-service').FoodLogWithItems[]),
  ]);

  const goals = (goalsData ?? []) as MacroGoalRow[];

  // Build food log breakdown entries
  const foodLogEntries: MealMacroEntry[] = foodLogs.flatMap((log) =>
    log.items.map((item) => ({
      id: item.id,
      entry_type: 'logged' as const,
      label: log.label ?? null,
      food_name: item.food_name,
      time_of_day: log.time_of_day ?? null,
      calories: Math.round((item.calories ?? 0) * item.servings_eaten),
      protein: Math.round(((item.protein ?? 0) * item.servings_eaten) * 10) / 10,
      carbs: Math.round(((item.carbs ?? 0) * item.servings_eaten) * 10) / 10,
      fat: Math.round(((item.fat ?? 0) * item.servings_eaten) * 10) / 10,
    }))
  );

  if (!planData) {
    const macros = buildMacroProgress(goals, [], {}, foodLogs.flatMap((l) => l.items));
    const meal_breakdown = sortByTime(foodLogEntries);
    return { date, macros, meal_breakdown };
  }

  const { data: slotsData } = await supabase
    .from('meal_slots')
    .select('id, label, recipe_id, serving_override, servings_eaten, time_of_day')
    .eq('meal_plan_id', planData.id)
    .eq('date', date);

  const slots = (slotsData ?? []) as Array<{
    id: string;
    label: string;
    recipe_id: string | null;
    serving_override: number | null;
    servings_eaten: number | null;
    time_of_day: string | null;
  }>;

  const recipeIds = slots.map((s) => s.recipe_id).filter((id): id is string => !!id);
  let recipesMap: Record<string, import('@/models/recipe').Recipe> = {};

  if (recipeIds.length > 0) {
    const { data: recipes } = await supabase.from('recipes').select('*').in('id', recipeIds);
    if (recipes) {
      recipesMap = Object.fromEntries(
        (recipes as import('@/models/recipe').Recipe[]).map((r) => [r.id, r]),
      );
    }
  }

  const plannedEntries: MealMacroEntry[] = slots.map((slot) => {
    const recipe = slot.recipe_id ? recipesMap[slot.recipe_id] ?? null : null;
    const servings = slot.servings_eaten ?? slot.serving_override ?? recipe?.servings ?? 1;
    const scale = recipe ? servings / (recipe.servings || 1) : 0;

    return {
      id: slot.id,
      entry_type: 'planned' as const,
      label: slot.label,
      recipe_title: recipe?.title ?? null,
      time_of_day: slot.time_of_day ?? null,
      calories: Math.round((recipe?.calories_per_serving ?? 0) * scale),
      protein: Math.round(((recipe?.protein_per_serving ?? 0) * scale) * 10) / 10,
      carbs: Math.round(((recipe?.carbs_per_serving ?? 0) * scale) * 10) / 10,
      fat: Math.round(((recipe?.fat_per_serving ?? 0) * scale) * 10) / 10,
    };
  });

  const macros = buildMacroProgress(goals, slots, recipesMap, foodLogs.flatMap((l) => l.items));
  const meal_breakdown = sortByTime([...plannedEntries, ...foodLogEntries]);

  return { date, macros, meal_breakdown };
}

export async function getWeeklyProgress(userId: string, weekStart: Date): Promise<DailyMacroProgress[]> {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const results = await Promise.all(days.map((date) => getDailyProgress(userId, date)));
  return results;
}

function sortByTime(entries: MealMacroEntry[]): MealMacroEntry[] {
  return entries.slice().sort((a, b) => {
    if (!a.time_of_day && !b.time_of_day) return 0;
    if (!a.time_of_day) return 1;
    if (!b.time_of_day) return -1;
    return a.time_of_day.localeCompare(b.time_of_day);
  });
}

function buildEmptyProgress(date: string, goals: MacroGoalRow[]): DailyMacroProgress {
  const macros = goals.map((goal) => {
    const def = DefaultMacros.find((m) => m.key === goal.macro_name);
    return {
      macro_name: goal.macro_name,
      label: def?.label ?? goal.macro_name,
      current: 0,
      goal: goal.daily_target,
      unit: goal.unit,
      percentage: 0,
      color: def?.color ?? '#888888',
    };
  });
  return { date, macros, meal_breakdown: [] };
}

function buildMacroProgress(
  goals: MacroGoalRow[],
  slots: Array<{ recipe_id: string | null; serving_override: number | null; servings_eaten?: number | null }>,
  recipesMap: Record<string, import('@/models/recipe').Recipe>,
  foodLogItems: FoodLogItem[] = [],
): MacroProgress[] {
  return goals.map((goal) => {
    const recipeField = RECIPE_MACRO_FIELD[goal.macro_name];
    const logField = FOOD_LOG_MACRO_FIELD[goal.macro_name];
    const def = DefaultMacros.find((m) => m.key === goal.macro_name);

    const fromPlanned = recipeField
      ? slots.reduce((sum, slot) => {
          if (!slot.recipe_id) return sum;
          const recipe = recipesMap[slot.recipe_id];
          if (!recipe) return sum;
          const servings = slot.servings_eaten ?? slot.serving_override ?? recipe.servings ?? 1;
          const scale = servings / (recipe.servings || 1);
          const value = (recipe[recipeField] as number | null | undefined) ?? 0;
          return sum + value * scale;
        }, 0)
      : 0;

    const fromLogged = logField
      ? foodLogItems.reduce((sum, item) => {
          const value = (item[logField] as number | null | undefined) ?? 0;
          return sum + value * item.servings_eaten;
        }, 0)
      : 0;

    const current = fromPlanned + fromLogged;
    const rounded = Math.round(current * 10) / 10;
    const percentage = goal.daily_target > 0 ? Math.min(100, (rounded / goal.daily_target) * 100) : 0;

    return {
      macro_name: goal.macro_name,
      label: def?.label ?? goal.macro_name,
      current: rounded,
      goal: goal.daily_target,
      unit: goal.unit,
      percentage: Math.round(percentage),
      color: def?.color ?? '#888888',
    };
  });
}

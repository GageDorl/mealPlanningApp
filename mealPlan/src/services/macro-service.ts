import { supabase } from './supabase';
import { DefaultMacros } from '@/constants/macros';

const RECIPE_MACRO_FIELD: Record<string, keyof import('@/models/recipe').Recipe> = {
  calories: 'calories_per_serving',
  protein: 'protein_per_serving',
  carbs: 'carbs_per_serving',
  fat: 'fat_per_serving',
  fiber: 'fiber_per_serving',
  sugar: 'sugar_per_serving',
  sodium: 'sodium_per_serving',
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
  slot_id: string;
  label: string;
  recipe_title: string | null;
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

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export async function getDailyProgress(userId: string, date: string): Promise<DailyMacroProgress> {
  const weekStart = getMonday(new Date(date));

  const [{ data: goalsData }, { data: planData }] = await Promise.all([
    supabase.from('macro_goals').select('*').eq('user_id', userId).eq('is_active', true).order('display_order'),
    supabase.from('meal_plans').select('id').eq('user_id', userId).eq('week_start', weekStart).maybeSingle(),
  ]);

  const goals = (goalsData ?? []) as MacroGoalRow[];

  if (!planData) {
    return buildEmptyProgress(date, goals);
  }

  const { data: slotsData } = await supabase
    .from('meal_slots')
    .select('id, label, recipe_id, serving_override')
    .eq('meal_plan_id', planData.id)
    .eq('date', date);

  const slots = (slotsData ?? []) as Array<{
    id: string;
    label: string;
    recipe_id: string | null;
    serving_override: number | null;
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

  const mealBreakdown: MealMacroEntry[] = slots.map((slot) => {
    const recipe = slot.recipe_id ? recipesMap[slot.recipe_id] ?? null : null;
    const servings = slot.serving_override ?? recipe?.servings ?? 1;
    const scale = recipe ? servings / (recipe.servings || 1) : 0;

    return {
      slot_id: slot.id,
      label: slot.label,
      recipe_title: recipe?.title ?? null,
      calories: Math.round((recipe?.calories_per_serving ?? 0) * scale),
      protein: Math.round(((recipe?.protein_per_serving ?? 0) * scale) * 10) / 10,
      carbs: Math.round(((recipe?.carbs_per_serving ?? 0) * scale) * 10) / 10,
      fat: Math.round(((recipe?.fat_per_serving ?? 0) * scale) * 10) / 10,
    };
  });

  const macros = buildMacroProgress(goals, slots, recipesMap);

  return { date, macros, meal_breakdown: mealBreakdown };
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
  slots: Array<{ recipe_id: string | null; serving_override: number | null }>,
  recipesMap: Record<string, import('@/models/recipe').Recipe>,
): MacroProgress[] {
  return goals.map((goal) => {
    const recipeField = RECIPE_MACRO_FIELD[goal.macro_name];
    const def = DefaultMacros.find((m) => m.key === goal.macro_name);

    const current = recipeField
      ? slots.reduce((sum, slot) => {
          if (!slot.recipe_id) return sum;
          const recipe = recipesMap[slot.recipe_id];
          if (!recipe) return sum;
          const servings = slot.serving_override ?? recipe.servings ?? 1;
          const scale = servings / (recipe.servings || 1);
          const value = (recipe[recipeField] as number | null | undefined) ?? 0;
          return sum + value * scale;
        }, 0)
      : 0;

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

import { supabase } from './supabase';
import type { MealPlan } from '@/models/meal-plan';
import type { MealSlot } from '@/models/meal-slot';
import type { Recipe } from '@/models/recipe';

export interface MealSlotWithRecipe extends MealSlot {
  recipe?: Recipe | null;
}

export interface WeekPlan {
  mealPlan: MealPlan;
  slots: MealSlotWithRecipe[];
}

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function generateId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function getWeek(weekStart: Date): Promise<WeekPlan> {
  const monday = getMonday(weekStart);

  const { data: existingPlan } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('week_start', monday)
    .single();

  let mealPlan: MealPlan;

  if (existingPlan) {
    mealPlan = existingPlan as MealPlan;
  } else {
    const now = nowIso();
    const newPlan = {
      id: generateId(),
      user_id: null,
      week_start: monday,
      created_at: now,
      updated_at: now,
    };

    const { data } = await supabase.from('meal_plans').insert(newPlan).select().single();
    mealPlan = (data as MealPlan) ?? newPlan;
  }

  const { data: slotsData } = await supabase
    .from('meal_slots')
    .select('*')
    .eq('meal_plan_id', mealPlan.id)
    .order('date')
    .order('time_of_day');

  const slots = (slotsData as MealSlot[]) ?? [];

  const recipeIds = slots
    .map((s) => s.recipe_id)
    .filter((id): id is string => !!id);

  let recipesMap: Record<string, Recipe> = {};
  if (recipeIds.length > 0) {
    const { data: recipes } = await supabase
      .from('recipes')
      .select('*')
      .in('id', recipeIds);

    if (recipes) {
      recipesMap = Object.fromEntries((recipes as Recipe[]).map((r) => [r.id, r]));
    }
  }

  const slotsWithRecipes: MealSlotWithRecipe[] = slots.map((slot) => ({
    ...slot,
    recipe: slot.recipe_id ? recipesMap[slot.recipe_id] ?? null : null,
  }));

  return { mealPlan, slots: slotsWithRecipes };
}

export async function createSlot(params: {
  mealPlanId: string;
  label: string;
  date: string;
  time?: string;
  displayOrder: number;
}): Promise<MealSlot> {
  const now = nowIso();
  const slot = {
    id: generateId(),
    meal_plan_id: params.mealPlanId,
    date: params.date,
    time_of_day: params.time ?? null,
    label: params.label,
    display_order: params.displayOrder,
    created_at: now,
    updated_at: now,
  };

  await supabase.from('meal_slots').insert(slot);

  return slot as MealSlot;
}

export async function assignRecipe(slotId: string, recipeId: string): Promise<void> {
  await supabase
    .from('meal_slots')
    .update({ recipe_id: recipeId, updated_at: nowIso() })
    .eq('id', slotId);
}

export async function removeRecipe(slotId: string): Promise<void> {
  await supabase
    .from('meal_slots')
    .update({ recipe_id: null, updated_at: nowIso() })
    .eq('id', slotId);
}

export async function deleteSlot(slotId: string): Promise<void> {
  await supabase.from('meal_slots').delete().eq('id', slotId);
}

export async function reorderSlots(
  mealPlanId: string,
  _date: string,
  slotIds: string[],
): Promise<void> {
  const now = nowIso();
  const updates = slotIds.map((id, index) =>
    supabase
      .from('meal_slots')
      .update({ display_order: index, updated_at: now })
      .eq('id', id)
      .eq('meal_plan_id', mealPlanId),
  );
  await Promise.all(updates);
}

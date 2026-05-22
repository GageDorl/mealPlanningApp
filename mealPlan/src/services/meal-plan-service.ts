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

function getSunday(mondayStr: string): string {
  const d = new Date(mondayStr);
  d.setDate(d.getDate() + 6);
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
  const sunday = getSunday(monday);

  // Try to find existing plan
  const { data: existingPlan } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('startDate', monday)
    .single();

  let mealPlan: MealPlan;

  if (existingPlan) {
    mealPlan = existingPlan as MealPlan;
  } else {
    // Create new plan for this week
    const now = nowIso();
    const newPlan: MealPlan = {
      id: generateId(),
      userId: '',
      startDate: monday,
      endDate: sunday,
      createdAt: now,
      updatedAt: now,
    };

    const { data } = await supabase.from('meal_plans').insert(newPlan).select().single();
    mealPlan = (data as MealPlan) ?? newPlan;
  }

  // Fetch slots with recipes
  const { data: slotsData } = await supabase
    .from('meal_slots')
    .select('*')
    .eq('planId', mealPlan.id)
    .order('date')
    .order('time');

  const slots = (slotsData as MealSlot[]) ?? [];

  // Fetch assigned recipes
  const recipeIds = slots
    .map((s) => s.assignedRecipeId)
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
    recipe: slot.assignedRecipeId ? recipesMap[slot.assignedRecipeId] ?? null : null,
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
  const slot: MealSlot = {
    id: generateId(),
    planId: params.mealPlanId,
    date: params.date,
    time: params.time ?? '',
    label: params.label,
    createdAt: now,
    updatedAt: now,
  };

  await supabase.from('meal_slots').insert(slot);

  return slot;
}

export async function assignRecipe(
  slotId: string,
  recipeId: string,
): Promise<void> {
  await supabase
    .from('meal_slots')
    .update({ assignedRecipeId: recipeId, updatedAt: nowIso() })
    .eq('id', slotId);
}

export async function removeRecipe(slotId: string): Promise<void> {
  await supabase
    .from('meal_slots')
    .update({ assignedRecipeId: null, updatedAt: nowIso() })
    .eq('id', slotId);
}

export async function deleteSlot(slotId: string): Promise<void> {
  await supabase.from('meal_slots').delete().eq('id', slotId);
}

export async function reorderSlots(
  mealPlanId: string,
  date: string,
  slotIds: string[],
): Promise<void> {
  const now = nowIso();
  const updates = slotIds.map((id, index) =>
    supabase
      .from('meal_slots')
      .update({ time: String(index).padStart(2, '0') + ':00', updatedAt: now })
      .eq('id', id)
      .eq('planId', mealPlanId),
  );
  await Promise.all(updates);
}

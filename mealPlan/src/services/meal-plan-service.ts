import { randomUUID } from 'expo-crypto';
import { supabase } from './supabase';
import { scheduleMealReminder, cancelMealReminder } from './notification-service';
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
  const day = d.getDay(); // 0=Sun, 1=Mon, …, 6=Sat
  // Sunday is the first day of the displayed week (Sun-Sat), so advance to the
  // following Monday rather than falling back to the previous one.
  const diff = day === 0 ? 1 : 1 - day;
  d.setDate(d.getDate() + diff);
  // Use local date parts — toISOString() is UTC and shifts the date for
  // users in positive-offset timezones.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function generateId(): string {
  return randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function getWeek(weekStart: Date): Promise<WeekPlan> {
  const monday = getMonday(weekStart);

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id ?? null;

  let query = supabase.from('meal_plans').select('*').eq('week_start', monday);
  if (userId) query = query.eq('user_id', userId);
  const { data: existingPlan } = await query.maybeSingle();

  let mealPlan: MealPlan;

  if (existingPlan) {
    mealPlan = existingPlan as MealPlan;
  } else {
    const now = nowIso();
    const newPlan = {
      id: generateId(),
      user_id: userId,
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

async function tryScheduleReminder(slotId: string, recipeId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return;

  const [{ data: user }, { data: slot }, { data: recipe }] = await Promise.all([
    supabase.from('users').select('notification_meal_reminders').eq('id', userId).single(),
    supabase.from('meal_slots').select('date, time_of_day').eq('id', slotId).single(),
    supabase.from('recipes').select('title').eq('id', recipeId).single(),
  ]);

  if (!user?.notification_meal_reminders || !slot?.date || !slot?.time_of_day || !recipe?.title) return;

  const [hour, minute] = (slot.time_of_day as string).split(':').map(Number);
  const [year, month, day] = (slot.date as string).split('-').map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  await scheduleMealReminder(slotId, recipe.title as string, date);
}

export async function assignRecipe(slotId: string, recipeId: string): Promise<void> {
  await supabase
    .from('meal_slots')
    .update({ recipe_id: recipeId, updated_at: nowIso() })
    .eq('id', slotId);
  await tryScheduleReminder(slotId, recipeId).catch(() => {});
}

export async function removeRecipe(slotId: string): Promise<void> {
  await supabase
    .from('meal_slots')
    .update({ recipe_id: null, updated_at: nowIso() })
    .eq('id', slotId);
  await cancelMealReminder(slotId).catch(() => {});
}

export async function updateServingsEaten(slotId: string, servingsEaten: number | null): Promise<void> {
  await supabase
    .from('meal_slots')
    .update({ servings_eaten: servingsEaten, updated_at: nowIso() })
    .eq('id', slotId);
}

export async function deleteSlot(slotId: string): Promise<void> {
  await cancelMealReminder(slotId).catch(() => {});
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

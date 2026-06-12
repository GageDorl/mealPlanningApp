import { randomUUID } from 'expo-crypto';
import { supabase } from './supabase';
import { scheduleMealReminder, cancelMealReminder } from './notification-service';
import type { MealPlan } from '@/models/meal-plan';
import type { MealSlot } from '@/models/meal-slot';
import type { Recipe } from '@/models/recipe';

export interface MealSlotRecipeEntry {
  id: string;
  meal_slot_id: string;
  recipe_id: string;
  servings_eaten: number | null;
  display_order: number;
  recipe: Recipe;
}

export interface MealSlotWithRecipe extends MealSlot {
  recipes: MealSlotRecipeEntry[];
}

export interface WeekPlan {
  mealPlan: MealPlan;
  slots: MealSlotWithRecipe[];
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // back to Sunday (matches calendar week_start)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function generateId(): string {
  return randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function getWeek(weekStart: Date): Promise<WeekPlan> {
  const monday = getWeekStart(weekStart);

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id ?? null;

  let query = supabase
    .from('meal_plans')
    .select('*')
    .eq('week_start', monday)
    .order('created_at', { ascending: true })
    .limit(1);
  if (userId) query = query.eq('user_id', userId);
  const { data: planRows } = await query;
  const existingPlan = (planRows as MealPlan[] | null)?.[0] ?? null;

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

  type SlotRecipeRow = MealSlotRecipeEntry & { recipes: Recipe };
  let slotRecipeRows: SlotRecipeRow[] = [];
  if (slots.length > 0) {
    const slotIds = slots.map((s) => s.id);
    const { data: srData } = await supabase
      .from('meal_slot_recipes')
      .select('*, recipes(*)')
      .in('meal_slot_id', slotIds)
      .order('display_order');
    slotRecipeRows = (srData ?? []) as SlotRecipeRow[];
  }

  const recipesBySlot = new Map<string, MealSlotRecipeEntry[]>();
  for (const row of slotRecipeRows) {
    const entry: MealSlotRecipeEntry = {
      id: row.id,
      meal_slot_id: row.meal_slot_id,
      recipe_id: row.recipe_id,
      servings_eaten: row.servings_eaten,
      display_order: row.display_order,
      recipe: row.recipes,
    };
    const list = recipesBySlot.get(row.meal_slot_id) ?? [];
    list.push(entry);
    recipesBySlot.set(row.meal_slot_id, list);
  }

  const slotsWithRecipes: MealSlotWithRecipe[] = slots.map((slot) => ({
    ...slot,
    recipes: recipesBySlot.get(slot.id) ?? [],
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

  const { error } = await supabase.from('meal_slots').insert(slot);
  if (error) throw error;

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

export async function addRecipeToSlot(slotId: string, recipeId: string): Promise<void> {
  const { data: existing } = await supabase
    .from('meal_slot_recipes')
    .select('display_order')
    .eq('meal_slot_id', slotId)
    .order('display_order', { ascending: false })
    .limit(1);
  const nextOrder = (existing as { display_order: number }[] | null)?.[0]?.display_order ?? -1;
  const now = nowIso();
  const { error } = await supabase.from('meal_slot_recipes').insert({
    id: generateId(),
    meal_slot_id: slotId,
    recipe_id: recipeId,
    servings_eaten: null,
    display_order: nextOrder + 1,
    created_at: now,
    updated_at: now,
  });
  if (error) throw error;
  await tryScheduleReminder(slotId, recipeId).catch(() => {});
}

export async function removeRecipeFromSlot(slotRecipeId: string): Promise<void> {
  const { error } = await supabase.from('meal_slot_recipes').delete().eq('id', slotRecipeId);
  if (error) throw error;
}

export async function updateSlotRecipeServings(slotRecipeId: string, servings: number | null): Promise<void> {
  const { error } = await supabase
    .from('meal_slot_recipes')
    .update({ servings_eaten: servings, updated_at: nowIso() })
    .eq('id', slotRecipeId);
  if (error) throw error;
}

export async function updateServingsEaten(slotId: string, servingsEaten: number | null): Promise<void> {
  const { error } = await supabase
    .from('meal_slots')
    .update({ servings_eaten: servingsEaten, updated_at: nowIso() })
    .eq('id', slotId);
  if (error) throw error;
}

export async function updateExternalEventId(slotId: string, eventId: string | null): Promise<void> {
  await supabase
    .from('meal_slots')
    .update({ external_event_id: eventId, updated_at: nowIso() })
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

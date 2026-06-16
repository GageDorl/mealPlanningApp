import { randomUUID } from 'expo-crypto';
import { supabase, getCachedUserId } from './supabase';
import { scheduleMealReminder, cancelMealReminder } from './notification-service';
import type { MealPlan } from '@/models/meal-plan';
import type { MealSlot } from '@/models/meal-slot';
import type { Recipe } from '@/models/recipe';

interface PsDb {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
  getAll<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

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

export async function getWeek(db: PsDb, weekStart: Date): Promise<WeekPlan> {
  const t0 = Date.now();
  const monday = getWeekStart(weekStart);
  const userId = getCachedUserId();
  console.log(`[getWeek] start week=${monday} userId=${userId ? 'present' : 'absent'}`);

  let query = supabase
    .from('meal_plans')
    .select('*')
    .eq('week_start', monday)
    .order('created_at', { ascending: true })
    .limit(1);
  if (userId) query = query.eq('user_id', userId);
  const { data: planRows, error: planErr } = await query;
  console.log(`[getWeek] +${Date.now() - t0}ms meal_plans: ${planRows?.length ?? 0} rows${planErr ? ' err=' + planErr.message : ''}`);
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

    await db.execute(
      'INSERT INTO meal_plans (id, user_id, week_start, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [newPlan.id, newPlan.user_id, newPlan.week_start, newPlan.created_at, newPlan.updated_at],
    );
    mealPlan = newPlan as MealPlan;
    console.log(`[getWeek] +${Date.now() - t0}ms created new meal_plan`);
  }

  const { data: slotsData, error: slotsErr } = await supabase
    .from('meal_slots')
    .select('*')
    .eq('meal_plan_id', mealPlan.id)
    .order('date')
    .order('time_of_day');
  console.log(`[getWeek] +${Date.now() - t0}ms meal_slots: ${(slotsData as MealSlot[] | null)?.length ?? 0} rows${slotsErr ? ' err=' + slotsErr.message : ''}`);

  const slots = (slotsData as MealSlot[]) ?? [];

  type SlotRecipeRow = MealSlotRecipeEntry & { recipes: Recipe };
  let slotRecipeRows: SlotRecipeRow[] = [];
  if (slots.length > 0) {
    const slotIds = slots.map((s) => s.id);
    const { data: srData, error: srErr } = await supabase
      .from('meal_slot_recipes')
      .select('*, recipes(*)')
      .in('meal_slot_id', slotIds)
      .order('display_order');
    console.log(`[getWeek] +${Date.now() - t0}ms meal_slot_recipes: ${(srData ?? []).length} rows${srErr ? ' err=' + srErr.message : ''}`);
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

  console.log(`[getWeek] +${Date.now() - t0}ms done`);
  return { mealPlan, slots: slotsWithRecipes };
}

export async function createSlot(db: PsDb, params: {
  mealPlanId: string;
  label: string;
  date: string;
  time?: string;
  displayOrder: number;
  icon?: string | null;
}): Promise<MealSlot> {
  const now = nowIso();
  const slot = {
    id: generateId(),
    meal_plan_id: params.mealPlanId,
    date: params.date,
    time_of_day: params.time ?? null,
    label: params.label,
    display_order: params.displayOrder,
    icon: params.icon ?? null,
    created_at: now,
    updated_at: now,
  };

  await db.execute(
    'INSERT INTO meal_slots (id, meal_plan_id, recipe_id, label, date, time_of_day, serving_override, external_event_id, display_order, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [slot.id, slot.meal_plan_id, null, slot.label, slot.date, slot.time_of_day, null, null, slot.display_order, slot.icon, slot.created_at, slot.updated_at],
  );

  return slot as MealSlot;
}

async function tryScheduleReminder(slotId: string, recipeId: string): Promise<void> {
  const userId = getCachedUserId();
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

export async function addRecipeToSlot(db: PsDb, slotId: string, recipeId: string): Promise<void> {
  const existing = await db.getAll<{ display_order: number }>(
    'SELECT display_order FROM meal_slot_recipes WHERE meal_slot_id = ? ORDER BY display_order DESC LIMIT 1',
    [slotId],
  );
  const nextOrder = existing[0]?.display_order ?? -1;
  const now = nowIso();
  await db.execute(
    'INSERT INTO meal_slot_recipes (id, meal_slot_id, recipe_id, servings_eaten, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [generateId(), slotId, recipeId, null, nextOrder + 1, now, now],
  );
  await tryScheduleReminder(slotId, recipeId).catch(() => {});
}

export async function removeRecipeFromSlot(db: PsDb, slotRecipeId: string): Promise<void> {
  await db.execute('DELETE FROM meal_slot_recipes WHERE id = ?', [slotRecipeId]);
}

export async function updateSlotRecipeServings(db: PsDb, slotRecipeId: string, servings: number | null): Promise<void> {
  await db.execute(
    'UPDATE meal_slot_recipes SET servings_eaten = ?, updated_at = ? WHERE id = ?',
    [servings, nowIso(), slotRecipeId],
  );
}

export async function updateSlot(db: PsDb, slotId: string, patch: { label?: string; time_of_day?: string | null; icon?: string | null }): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.label !== undefined) { sets.push('label = ?'); values.push(patch.label); }
  if ('time_of_day' in patch) { sets.push('time_of_day = ?'); values.push(patch.time_of_day ?? null); }
  if ('icon' in patch) { sets.push('icon = ?'); values.push(patch.icon ?? null); }
  if (sets.length === 0) return;
  sets.push('updated_at = ?');
  values.push(nowIso(), slotId);
  await db.execute(`UPDATE meal_slots SET ${sets.join(', ')} WHERE id = ?`, values);
}

export async function updateServingsEaten(db: PsDb, slotId: string, servingsEaten: number | null): Promise<void> {
  await db.execute(
    'UPDATE meal_slots SET servings_eaten = ?, updated_at = ? WHERE id = ?',
    [servingsEaten, nowIso(), slotId],
  );
}

export async function updateExternalEventId(db: PsDb, slotId: string, eventId: string | null): Promise<void> {
  await db.execute(
    'UPDATE meal_slots SET external_event_id = ?, updated_at = ? WHERE id = ?',
    [eventId, nowIso(), slotId],
  );
}

export async function deleteSlot(db: PsDb, slotId: string): Promise<void> {
  await cancelMealReminder(slotId).catch(() => {});
  await db.execute('DELETE FROM meal_slot_recipes WHERE meal_slot_id = ?', [slotId]);
  await db.execute('DELETE FROM meal_slots WHERE id = ?', [slotId]);
}

export async function reorderSlots(
  db: PsDb,
  mealPlanId: string,
  _date: string,
  slotIds: string[],
): Promise<void> {
  const now = nowIso();
  for (let i = 0; i < slotIds.length; i++) {
    await db.execute(
      'UPDATE meal_slots SET display_order = ?, updated_at = ? WHERE id = ? AND meal_plan_id = ?',
      [i, now, slotIds[i], mealPlanId],
    );
  }
}

export async function ensureMealPlan(db: PsDb, userId: string, weekStart: string): Promise<string> {
  const existing = await db.getAll<{ id: string }>(
    'SELECT id FROM meal_plans WHERE user_id = ? AND week_start = ? LIMIT 1',
    [userId, weekStart],
  );
  if (existing.length > 0) return existing[0].id;
  const id = generateId();
  const now = nowIso();
  await db.execute(
    'INSERT INTO meal_plans (id, user_id, week_start, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, userId, weekStart, now, now],
  );
  return id;
}

import { randomUUID } from 'expo-crypto';
import { supabase } from './supabase';
import type { FoodLog, FoodLogItem } from '@/models/food-log';
import { saveToLibrary } from './personal-food-service';

interface PsDb {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
  getAll<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

export interface FoodLogWithItems extends FoodLog {
  items: FoodLogItem[];
}

export type FoodLogItemInput = Omit<FoodLogItem, 'id' | 'food_log_id' | 'display_order' | 'created_at' | 'updated_at'>;

const ITEM_COLS = 'id, food_log_id, food_name, brand_name, serving_size_amount, serving_size_unit, servings_eaten, calories, protein, carbs, fat, saturated_fat, trans_fat, cholesterol, sodium, dietary_fiber, total_sugar, added_sugar, source, source_id, display_order, created_at, updated_at';

function itemParams(itemId: string, logId: string, item: FoodLogItemInput, order: number, now: string): unknown[] {
  return [
    itemId, logId, item.food_name, item.brand_name ?? null,
    item.serving_size_amount ?? null, item.serving_size_unit ?? null, item.servings_eaten,
    item.calories ?? null, item.protein ?? null, item.carbs ?? null, item.fat ?? null,
    item.saturated_fat ?? null, item.trans_fat ?? null, item.cholesterol ?? null,
    item.sodium ?? null, item.dietary_fiber ?? null, item.total_sugar ?? null, item.added_sugar ?? null,
    item.source, item.source_id ?? null, order, now, now,
  ];
}

export async function createFoodLog(
  db: PsDb,
  userId: string,
  date: string,
  label: string | null,
  timeOfDay: string | null,
  items: FoodLogItemInput[],
  icon?: string | null,
): Promise<FoodLogWithItems> {
  const now = new Date().toISOString();
  const logId = randomUUID();

  await db.execute(
    'INSERT INTO food_logs (id, user_id, date, label, time_of_day, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [logId, userId, date, label, timeOfDay, icon ?? null, now, now],
  );

  const insertedItems: FoodLogItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const itemId = randomUUID();
    await db.execute(
      `INSERT INTO food_log_items (${ITEM_COLS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      itemParams(itemId, logId, items[i], i, now),
    );
    insertedItems.push({ ...items[i], id: itemId, food_log_id: logId, display_order: i, created_at: now, updated_at: now });
  }

  // Background: auto-save manual entries to personal library (deduplicated by name)
  const manualItems = insertedItems.filter((i) => i.source === 'manual' && i.food_name.trim());
  if (manualItems.length > 0) {
    void Promise.all(
      manualItems.map(async (item) => {
        const rows = await db.getAll<{ cnt: number }>(
          'SELECT COUNT(*) as cnt FROM personal_foods WHERE user_id = ? AND LOWER(food_name) = LOWER(?)',
          [userId, item.food_name.trim()],
        );
        if ((rows[0]?.cnt ?? 0) === 0) {
          await saveToLibrary(db, userId, item);
        }
      }),
    ).catch(() => {});
  }

  const log: FoodLog = { id: logId, user_id: userId, date, label: label ?? undefined, time_of_day: timeOfDay ?? undefined, icon: icon ?? undefined, created_at: now, updated_at: now };
  return { ...log, items: insertedItems };
}

export async function getFoodLogsForWeek(
  userId: string,
  weekStart: string,
  weekEnd: string,
): Promise<FoodLogWithItems[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*, food_log_items(*)')
    .eq('user_id', userId)
    .gte('date', weekStart)
    .lt('date', weekEnd)
    .order('time_of_day', { ascending: true, nullsFirst: false });

  if (error) throw error;

  return ((data ?? []) as any[]).map((log) => ({
    ...log,
    items: (log.food_log_items ?? []) as FoodLogItem[],
  }));
}

export async function getFoodLogsForDay(
  userId: string,
  date: string,
): Promise<FoodLogWithItems[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*, food_log_items(*)')
    .eq('user_id', userId)
    .eq('date', date)
    .order('time_of_day', { ascending: true, nullsFirst: false });

  if (error) throw error;

  return ((data ?? []) as any[]).map((log) => ({
    ...log,
    items: (log.food_log_items ?? []) as FoodLogItem[],
  }));
}

export async function deleteFoodLog(db: PsDb, id: string): Promise<void> {
  await db.execute('DELETE FROM food_log_items WHERE food_log_id = ?', [id]);
  await db.execute('DELETE FROM food_logs WHERE id = ?', [id]);
}

export async function deleteFoodLogItem(db: PsDb, id: string): Promise<void> {
  await db.execute('DELETE FROM food_log_items WHERE id = ?', [id]);
}

export async function updateFoodLogItem(db: PsDb, id: string, patch: Partial<FoodLogItem>): Promise<void> {
  const allowed = [
    'food_name', 'brand_name', 'serving_size_amount', 'serving_size_unit', 'servings_eaten',
    'calories', 'protein', 'carbs', 'fat', 'saturated_fat', 'trans_fat', 'cholesterol',
    'sodium', 'dietary_fiber', 'total_sugar', 'added_sugar', 'source', 'source_id',
  ];
  const setClauses: string[] = [];
  const values: unknown[] = [];
  for (const key of allowed) {
    if (key in patch) {
      setClauses.push(`${key} = ?`);
      values.push((patch as Record<string, unknown>)[key] ?? null);
    }
  }
  if (setClauses.length === 0) return;
  setClauses.push('updated_at = ?');
  values.push(new Date().toISOString(), id);
  await db.execute(`UPDATE food_log_items SET ${setClauses.join(', ')} WHERE id = ?`, values);
}

export async function updateFoodLog(db: PsDb, id: string, patch: Partial<Pick<FoodLog, 'time_of_day' | 'label' | 'icon'>>): Promise<void> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  if ('time_of_day' in patch) { setClauses.push('time_of_day = ?'); values.push(patch.time_of_day ?? null); }
  if ('label' in patch) { setClauses.push('label = ?'); values.push(patch.label ?? null); }
  if ('icon' in patch) { setClauses.push('icon = ?'); values.push(patch.icon ?? null); }
  if (setClauses.length === 0) return;
  setClauses.push('updated_at = ?');
  values.push(new Date().toISOString(), id);
  await db.execute(`UPDATE food_logs SET ${setClauses.join(', ')} WHERE id = ?`, values);
}

export async function addItemsToFoodLog(db: PsDb, foodLogId: string, items: FoodLogItemInput[]): Promise<FoodLogItem[]> {
  const [row] = await db.getAll<{ cnt: number }>(
    'SELECT COUNT(*) AS cnt FROM food_log_items WHERE food_log_id = ?',
    [foodLogId],
  );
  const startOrder = row?.cnt ?? 0;
  const now = new Date().toISOString();
  const insertedItems: FoodLogItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const itemId = randomUUID();
    const order = startOrder + i;
    await db.execute(
      `INSERT INTO food_log_items (${ITEM_COLS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      itemParams(itemId, foodLogId, items[i], order, now),
    );
    insertedItems.push({ ...items[i], id: itemId, food_log_id: foodLogId, display_order: order, created_at: now, updated_at: now });
  }

  return insertedItems;
}

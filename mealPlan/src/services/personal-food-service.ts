import { randomUUID } from 'expo-crypto';
import { supabase } from './supabase';
import type { PersonalFood } from '@/models/personal-food';
import type { FoodLogItem } from '@/models/food-log';

interface PsDb {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

export type PersonalFoodInput = Omit<PersonalFood, 'id' | 'created_at' | 'updated_at'>;

const FOOD_COLS = 'id, user_id, food_name, brand_name, serving_size_amount, serving_size_unit, calories, protein, carbs, fat, saturated_fat, trans_fat, cholesterol, sodium, dietary_fiber, total_sugar, added_sugar, fatsecret_id, barcode, created_at, updated_at';

export async function saveToLibrary(db: PsDb, userId: string, item: FoodLogItem): Promise<PersonalFood> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const fatsecretId = item.source === 'fatsecret' ? (item.source_id ?? null) : null;

  await db.execute(
    `INSERT INTO personal_foods (${FOOD_COLS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, userId, item.food_name, item.brand_name ?? null,
      item.serving_size_amount ?? null, item.serving_size_unit ?? null,
      item.calories ?? null, item.protein ?? null, item.carbs ?? null, item.fat ?? null,
      item.saturated_fat ?? null, item.trans_fat ?? null, item.cholesterol ?? null,
      item.sodium ?? null, item.dietary_fiber ?? null, item.total_sugar ?? null, item.added_sugar ?? null,
      fatsecretId, null, now, now,
    ],
  );

  // Link the food log item back to the newly-created library entry so the
  // "saved" indicator persists across sessions.
  await db.execute(
    'UPDATE food_log_items SET source = ?, source_id = ?, updated_at = ? WHERE id = ?',
    ['library', id, now, item.id],
  );

  return {
    id,
    user_id: userId,
    food_name: item.food_name,
    brand_name: item.brand_name ?? null,
    serving_size_amount: item.serving_size_amount ?? null,
    serving_size_unit: item.serving_size_unit ?? null,
    calories: item.calories ?? null,
    protein: item.protein ?? null,
    carbs: item.carbs ?? null,
    fat: item.fat ?? null,
    saturated_fat: item.saturated_fat ?? null,
    trans_fat: item.trans_fat ?? null,
    cholesterol: item.cholesterol ?? null,
    sodium: item.sodium ?? null,
    dietary_fiber: item.dietary_fiber ?? null,
    total_sugar: item.total_sugar ?? null,
    added_sugar: item.added_sugar ?? null,
    fatsecret_id: fatsecretId,
    barcode: null,
    created_at: now,
    updated_at: now,
  };
}

export async function getPersonalFoods(userId: string, query?: string): Promise<PersonalFood[]> {
  let req = supabase
    .from('personal_foods')
    .select('*')
    .eq('user_id', userId)
    .order('food_name', { ascending: true });

  if (query && query.trim().length > 0) {
    req = req.ilike('food_name', `%${query.trim()}%`);
  }

  const { data, error } = await req;
  if (error) throw error;
  return (data ?? []) as PersonalFood[];
}

export async function deletePersonalFood(db: PsDb, id: string): Promise<void> {
  await db.execute('DELETE FROM personal_foods WHERE id = ?', [id]);
}

export async function updatePersonalFood(db: PsDb, id: string, patch: Partial<PersonalFoodInput>): Promise<void> {
  const allowed = [
    'food_name', 'brand_name', 'serving_size_amount', 'serving_size_unit',
    'calories', 'protein', 'carbs', 'fat', 'saturated_fat', 'trans_fat',
    'cholesterol', 'sodium', 'dietary_fiber', 'total_sugar', 'added_sugar', 'fatsecret_id', 'barcode',
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
  await db.execute(`UPDATE personal_foods SET ${setClauses.join(', ')} WHERE id = ?`, values);
}

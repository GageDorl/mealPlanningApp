import { supabase } from './supabase';
import type { FoodLog, FoodLogItem } from '@/models/food-log';

export interface FoodLogWithItems extends FoodLog {
  items: FoodLogItem[];
}

export type FoodLogItemInput = Omit<FoodLogItem, 'id' | 'food_log_id' | 'display_order' | 'created_at' | 'updated_at'>;

export async function createFoodLog(
  userId: string,
  date: string,
  label: string | null,
  timeOfDay: string | null,
  items: FoodLogItemInput[],
): Promise<FoodLogWithItems> {
  const { data: log, error: logError } = await supabase
    .from('food_logs')
    .insert({ user_id: userId, date, label, time_of_day: timeOfDay })
    .select()
    .single();

  if (logError || !log) throw logError ?? new Error('Failed to create food log');

  const { data: insertedItems, error: itemsError } = await supabase
    .from('food_log_items')
    .insert(items.map((item, i) => ({ ...item, food_log_id: log.id, display_order: i })))
    .select();

  if (itemsError) throw itemsError;

  return { ...(log as FoodLog), items: (insertedItems ?? []) as FoodLogItem[] };
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

export async function deleteFoodLog(id: string): Promise<void> {
  const { error } = await supabase.from('food_logs').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteFoodLogItem(id: string): Promise<void> {
  const { error } = await supabase.from('food_log_items').delete().eq('id', id);
  if (error) throw error;
}

export async function updateFoodLogItem(id: string, patch: Partial<FoodLogItem>): Promise<void> {
  const { error } = await supabase.from('food_log_items').update(patch).eq('id', id);
  if (error) throw error;
}

export async function updateFoodLog(id: string, patch: Partial<Pick<FoodLog, 'time_of_day' | 'label'>>): Promise<void> {
  const { error } = await supabase.from('food_logs').update(patch).eq('id', id);
  if (error) throw error;
}

export async function addItemsToFoodLog(foodLogId: string, items: FoodLogItemInput[]): Promise<FoodLogItem[]> {
  const { data: existing } = await supabase
    .from('food_log_items')
    .select('display_order')
    .eq('food_log_id', foodLogId)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const startOrder = ((existing as { display_order: number } | null)?.display_order ?? -1) + 1;

  const { data, error } = await supabase
    .from('food_log_items')
    .insert(items.map((item, i) => ({ ...item, food_log_id: foodLogId, display_order: startOrder + i })))
    .select();

  if (error) throw error;
  return (data ?? []) as FoodLogItem[];
}

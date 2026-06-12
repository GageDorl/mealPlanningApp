import { supabase } from './supabase';
import type { PersonalFood } from '@/models/personal-food';
import type { FoodLogItem } from '@/models/food-log';

export type PersonalFoodInput = Omit<PersonalFood, 'id' | 'created_at' | 'updated_at'>;

export async function saveToLibrary(userId: string, item: FoodLogItem): Promise<PersonalFood> {
  const { data, error } = await supabase
    .from('personal_foods')
    .insert({
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
      fatsecret_id: item.source === 'fatsecret' ? (item.source_id ?? null) : null,
    })
    .select()
    .single();

  if (error || !data) throw error ?? new Error('Failed to save to library');
  return data as PersonalFood;
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

export async function deletePersonalFood(id: string): Promise<void> {
  const { error } = await supabase.from('personal_foods').delete().eq('id', id);
  if (error) throw error;
}

export async function updatePersonalFood(id: string, patch: Partial<PersonalFoodInput>): Promise<void> {
  const { error } = await supabase.from('personal_foods').update(patch).eq('id', id);
  if (error) throw error;
}

import { supabase, getCachedUserId } from '@/services/supabase';

export async function addPopularRecipe(recipeId: string, displayOrder: number): Promise<void> {
  const { error } = await supabase
    .from('popular_recipes')
    .insert({ recipe_id: recipeId, display_order: displayOrder, added_by: getCachedUserId() });
  if (error) throw error;
}

export async function removePopularRecipe(popularId: string): Promise<void> {
  const { error } = await supabase.from('popular_recipes').delete().eq('id', popularId);
  if (error) throw error;
}

export async function reorderPopularRecipes(updates: { id: string; display_order: number }[]): Promise<void> {
  await Promise.all(
    updates.map(({ id, display_order }) =>
      supabase.from('popular_recipes').update({ display_order }).eq('id', id)
    )
  );
}

export async function getPopularRecipesLimit(): Promise<number> {
  const { data } = await supabase
    .from('app_config')
    .select('popular_recipes_max')
    .eq('id', 1)
    .single();
  return data?.popular_recipes_max ?? 20;
}

export async function setPopularRecipesLimit(max: number): Promise<void> {
  const { error } = await supabase
    .from('app_config')
    .update({ popular_recipes_max: max, updated_by: getCachedUserId(), updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) throw error;
}

import { supabase } from './supabase';
import type { Recipe } from '@/models/recipe';

export interface RecipeIngredientInput {
  raw_text: string;
  name: string;
  quantity?: number;
  unit?: string;
  display_order: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface RecipeFormData {
  title: string;
  description?: string;
  image_url?: string;
  prep_minutes?: number;
  cook_minutes?: number;
  servings: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisine_type?: string;
  source_type: 'api' | 'url_import' | 'user_created' | 'shared';
  source_url?: string;
  source_api_id?: string;
  calories_per_serving?: number;
  protein_per_serving?: number;
  carbs_per_serving?: number;
  fat_per_serving?: number;
  fiber_per_serving?: number;
  sugar_per_serving?: number;
  sodium_per_serving?: number;
  instructions?: string[];
  dietary_tags?: string[];
  ingredients: RecipeIngredientInput[];
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function saveRecipe(userId: string, recipeData: RecipeFormData): Promise<Recipe> {
  const now = new Date().toISOString();
  const recipeId = generateId();

  const { data, error } = await supabase
    .from('recipes')
    .insert({
      id: recipeId,
      user_id: userId,
      title: recipeData.title,
      description: recipeData.description ?? null,
      image_url: recipeData.image_url ?? null,
      prep_minutes: recipeData.prep_minutes ?? null,
      cook_minutes: recipeData.cook_minutes ?? null,
      servings: recipeData.servings,
      difficulty: recipeData.difficulty ?? null,
      cuisine_type: recipeData.cuisine_type ?? null,
      source_type: recipeData.source_type,
      source_url: recipeData.source_url ?? null,
      source_api_id: recipeData.source_api_id ?? null,
      is_favorited: false,
      is_offline_available: true,
      calories_per_serving: recipeData.calories_per_serving ?? null,
      protein_per_serving: recipeData.protein_per_serving ?? null,
      carbs_per_serving: recipeData.carbs_per_serving ?? null,
      fat_per_serving: recipeData.fat_per_serving ?? null,
      fiber_per_serving: recipeData.fiber_per_serving ?? null,
      sugar_per_serving: recipeData.sugar_per_serving ?? null,
      sodium_per_serving: recipeData.sodium_per_serving ?? null,
      instructions: recipeData.instructions ? JSON.stringify(recipeData.instructions) : null,
      dietary_tags: recipeData.dietary_tags ? JSON.stringify(recipeData.dietary_tags) : null,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (error) throw error;

  if (recipeData.ingredients.length > 0) {
    await supabase.from('recipe_ingredients').insert(
      recipeData.ingredients.map((ing) => ({
        id: generateId(),
        recipe_id: recipeId,
        ingredient_id: null,
        raw_text: ing.raw_text,
        name: ing.name,
        quantity: ing.quantity ?? null,
        unit: ing.unit ?? null,
        display_order: ing.display_order,
        calories: ing.calories ?? null,
        protein: ing.protein ?? null,
        carbs: ing.carbs ?? null,
        fat: ing.fat ?? null,
      }))
    );
  }

  return data as Recipe;
}

export async function toggleFavorite(recipeId: string): Promise<boolean> {
  const { data: current } = await supabase
    .from('recipes')
    .select('is_favorited')
    .eq('id', recipeId)
    .single();

  const newValue = !current?.is_favorited;
  await supabase
    .from('recipes')
    .update({ is_favorited: newValue, updated_at: new Date().toISOString() })
    .eq('id', recipeId);

  return newValue;
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  await supabase
    .from('meal_slots')
    .update({ recipe_id: null, updated_at: new Date().toISOString() })
    .eq('recipe_id', recipeId);

  await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
  await supabase.from('recipes').delete().eq('id', recipeId);
}

export async function getSavedRecipes(userId: string): Promise<Recipe[]> {
  const { data } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []) as Recipe[];
}

export async function getRecipeById(recipeId: string): Promise<Recipe | null> {
  const { data } = await supabase.from('recipes').select('*').eq('id', recipeId).single();
  return (data as Recipe) ?? null;
}

export interface RecipeIngredientRow {
  id: string;
  recipe_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  raw_text: string;
  display_order: number;
}

export async function getRecipeIngredients(recipeId: string): Promise<RecipeIngredientRow[]> {
  const { data } = await supabase
    .from('recipe_ingredients')
    .select('id, recipe_id, name, quantity, unit, raw_text, display_order')
    .eq('recipe_id', recipeId)
    .order('display_order');
  return (data ?? []) as RecipeIngredientRow[];
}

export async function updateRecipe(recipeId: string, recipeData: RecipeFormData): Promise<Recipe> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('recipes')
    .update({
      title: recipeData.title,
      description: recipeData.description ?? null,
      image_url: recipeData.image_url ?? null,
      prep_minutes: recipeData.prep_minutes ?? null,
      cook_minutes: recipeData.cook_minutes ?? null,
      servings: recipeData.servings,
      difficulty: recipeData.difficulty ?? null,
      cuisine_type: recipeData.cuisine_type ?? null,
      calories_per_serving: recipeData.calories_per_serving ?? null,
      protein_per_serving: recipeData.protein_per_serving ?? null,
      carbs_per_serving: recipeData.carbs_per_serving ?? null,
      fat_per_serving: recipeData.fat_per_serving ?? null,
      instructions: recipeData.instructions ? JSON.stringify(recipeData.instructions) : null,
      dietary_tags: recipeData.dietary_tags ? JSON.stringify(recipeData.dietary_tags) : null,
      updated_at: now,
    })
    .eq('id', recipeId)
    .select('*')
    .single();

  if (error) throw error;

  await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);

  if (recipeData.ingredients.length > 0) {
    await supabase.from('recipe_ingredients').insert(
      recipeData.ingredients.map((ing) => ({
        id: generateId(),
        recipe_id: recipeId,
        ingredient_id: null,
        raw_text: ing.raw_text,
        name: ing.name,
        quantity: ing.quantity ?? null,
        unit: ing.unit ?? null,
        display_order: ing.display_order,
        calories: ing.calories ?? null,
        protein: ing.protein ?? null,
        carbs: ing.carbs ?? null,
        fat: ing.fat ?? null,
      }))
    );
  }

  return data as Recipe;
}

export async function getTopRecipes(userId: string, limit = 4): Promise<Recipe[]> {
  const { data: plans } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('user_id', userId);

  if (!plans || plans.length === 0) return [];

  const planIds = (plans as { id: string }[]).map((p) => p.id);

  const { data: slots } = await supabase
    .from('meal_slots')
    .select('recipe_id')
    .in('meal_plan_id', planIds)
    .not('recipe_id', 'is', null);

  if (!slots || slots.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const slot of slots as { recipe_id: string }[]) {
    counts[slot.recipe_id] = (counts[slot.recipe_id] ?? 0) + 1;
  }

  const topIds = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([id]) => id);

  const { data: recipes } = await supabase.from('recipes').select('*').in('id', topIds);
  if (!recipes) return [];

  const recipeMap = Object.fromEntries((recipes as Recipe[]).map((r) => [r.id, r]));
  return topIds.map((id) => recipeMap[id]).filter(Boolean) as Recipe[];
}

export async function isRecipeSaved(userId: string, sourceApiId: string): Promise<boolean> {
  const { data } = await supabase
    .from('recipes')
    .select('id')
    .eq('user_id', userId)
    .eq('source_api_id', sourceApiId)
    .maybeSingle();
  return !!data;
}

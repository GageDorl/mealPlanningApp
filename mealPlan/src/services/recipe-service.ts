import { randomUUID } from 'expo-crypto';
import { supabase } from './supabase';
import type { Recipe } from '@/models/recipe';

interface PsDb {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

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

export async function saveRecipe(db: PsDb, userId: string, recipeData: RecipeFormData): Promise<Recipe> {
  const now = new Date().toISOString();
  const recipeId = randomUUID();

  await db.execute(
    `INSERT INTO recipes (id, user_id, title, description, image_url, prep_minutes, cook_minutes, servings, difficulty, cuisine_type, source_type, source_url, source_api_id, is_favorited, is_offline_available, calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving, fiber_per_serving, sugar_per_serving, sodium_per_serving, instructions, dietary_tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      recipeId, userId, recipeData.title, recipeData.description ?? null,
      recipeData.image_url ?? null, recipeData.prep_minutes ?? null, recipeData.cook_minutes ?? null,
      recipeData.servings, recipeData.difficulty ?? null, recipeData.cuisine_type ?? null,
      recipeData.source_type, recipeData.source_url ?? null, recipeData.source_api_id ?? null,
      0, 1,
      recipeData.calories_per_serving ?? null, recipeData.protein_per_serving ?? null,
      recipeData.carbs_per_serving ?? null, recipeData.fat_per_serving ?? null,
      recipeData.fiber_per_serving ?? null, recipeData.sugar_per_serving ?? null,
      recipeData.sodium_per_serving ?? null,
      recipeData.instructions ? JSON.stringify(recipeData.instructions) : null,
      recipeData.dietary_tags ? JSON.stringify(recipeData.dietary_tags) : null,
      now, now,
    ],
  );

  for (const ing of recipeData.ingredients) {
    await db.execute(
      `INSERT INTO recipe_ingredients (id, recipe_id, ingredient_id, raw_text, name, quantity, unit, display_order, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), recipeId, null, ing.raw_text, ing.name, ing.quantity ?? null, ing.unit ?? null, ing.display_order, ing.calories ?? null, ing.protein ?? null, ing.carbs ?? null, ing.fat ?? null],
    );
  }

  return {
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
    instructions: recipeData.instructions ?? null,
    dietary_tags: recipeData.dietary_tags ?? null,
    created_at: now,
    updated_at: now,
  } as Recipe;
}

export async function toggleFavorite(db: PsDb, recipeId: string, currentFavorited: boolean): Promise<boolean> {
  const newValue = !currentFavorited;
  await db.execute(
    'UPDATE recipes SET is_favorited = ?, updated_at = ? WHERE id = ?',
    [newValue ? 1 : 0, new Date().toISOString(), recipeId],
  );
  return newValue;
}

export async function deleteRecipe(db: PsDb, recipeId: string): Promise<void> {
  await db.execute('UPDATE meal_slots SET recipe_id = NULL WHERE recipe_id = ?', [recipeId]);
  await db.execute('DELETE FROM meal_slot_recipes WHERE recipe_id = ?', [recipeId]);
  await db.execute('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [recipeId]);
  await db.execute('DELETE FROM recipes WHERE id = ?', [recipeId]);
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

export async function updateRecipe(db: PsDb, recipeId: string, recipeData: RecipeFormData): Promise<Recipe> {
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE recipes SET title = ?, description = ?, image_url = ?, prep_minutes = ?, cook_minutes = ?, servings = ?, difficulty = ?, cuisine_type = ?, calories_per_serving = ?, protein_per_serving = ?, carbs_per_serving = ?, fat_per_serving = ?, fiber_per_serving = ?, sugar_per_serving = ?, sodium_per_serving = ?, instructions = ?, dietary_tags = ?, updated_at = ? WHERE id = ?`,
    [
      recipeData.title, recipeData.description ?? null, recipeData.image_url ?? null,
      recipeData.prep_minutes ?? null, recipeData.cook_minutes ?? null,
      recipeData.servings, recipeData.difficulty ?? null, recipeData.cuisine_type ?? null,
      recipeData.calories_per_serving ?? null, recipeData.protein_per_serving ?? null,
      recipeData.carbs_per_serving ?? null, recipeData.fat_per_serving ?? null,
      recipeData.fiber_per_serving ?? null, recipeData.sugar_per_serving ?? null,
      recipeData.sodium_per_serving ?? null,
      recipeData.instructions ? JSON.stringify(recipeData.instructions) : null,
      recipeData.dietary_tags ? JSON.stringify(recipeData.dietary_tags) : null,
      now, recipeId,
    ],
  );

  await db.execute('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [recipeId]);

  for (const ing of recipeData.ingredients) {
    await db.execute(
      `INSERT INTO recipe_ingredients (id, recipe_id, ingredient_id, raw_text, name, quantity, unit, display_order, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), recipeId, null, ing.raw_text, ing.name, ing.quantity ?? null, ing.unit ?? null, ing.display_order, ing.calories ?? null, ing.protein ?? null, ing.carbs ?? null, ing.fat ?? null],
    );
  }

  return {
    id: recipeId,
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
    instructions: recipeData.instructions ?? null,
    dietary_tags: recipeData.dietary_tags ?? null,
    updated_at: now,
  } as Recipe;
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
    .select('id')
    .in('meal_plan_id', planIds);

  if (!slots || slots.length === 0) return [];

  const slotIds = (slots as { id: string }[]).map((s) => s.id);
  const { data: slotRecipes } = await supabase
    .from('meal_slot_recipes')
    .select('recipe_id')
    .in('meal_slot_id', slotIds);

  if (!slotRecipes || slotRecipes.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const sr of slotRecipes as { recipe_id: string }[]) {
    counts[sr.recipe_id] = (counts[sr.recipe_id] ?? 0) + 1;
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

export async function getSavedRecipeIdByApiId(userId: string, sourceApiId: string): Promise<string | null> {
  const { data } = await supabase
    .from('recipes')
    .select('id')
    .eq('user_id', userId)
    .eq('source_api_id', sourceApiId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

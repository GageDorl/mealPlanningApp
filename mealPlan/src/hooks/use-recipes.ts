import { useCallback, useMemo } from 'react';
import { usePowerSync, useQuery } from '@powersync/react-native';
import { getCachedUserId } from '@/services/supabase';
import {
  saveRecipe,
  toggleFavorite,
  deleteRecipe,
  type RecipeFormData,
} from '@/services/recipe-service';
import type { Recipe } from '@/models/recipe';

function parseRecipeRow(row: Record<string, unknown>): Recipe {
  return {
    ...(row as unknown as Recipe),
    is_favorited: Boolean(row.is_favorited),
    is_offline_available: Boolean(row.is_offline_available),
    instructions: typeof row.instructions === 'string'
      ? JSON.parse(row.instructions)
      : (row.instructions ?? null),
    dietary_tags: typeof row.dietary_tags === 'string'
      ? JSON.parse(row.dietary_tags)
      : (row.dietary_tags ?? null),
  };
}

export function useRecipes() {
  const db = usePowerSync();
  const userId = getCachedUserId() ?? '';

  const { data: rows } = useQuery<Record<string, unknown>>(
    'SELECT * FROM recipes WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
  );

  const recipes = useMemo<Recipe[]>(() => rows.map(parseRecipeRow), [rows]);

  const save = useCallback(async (recipeData: RecipeFormData): Promise<Recipe> => {
    const uid = getCachedUserId();
    if (!uid) throw new Error('Not authenticated');
    return saveRecipe(db, uid, recipeData);
  }, [db]);

  const favorite = useCallback(async (recipeId: string) => {
    const current = recipes.find((r) => r.id === recipeId);
    return toggleFavorite(db, recipeId, current?.is_favorited ?? false);
  }, [db, recipes]);

  const remove = useCallback(async (recipeId: string) => {
    await deleteRecipe(db, recipeId);
  }, [db]);

  const checkSaved = useCallback(async (sourceApiId: string): Promise<boolean> => {
    const uid = getCachedUserId();
    if (!uid) return false;
    const rows = await db.getAll<{ id: string }>(
      'SELECT id FROM recipes WHERE user_id = ? AND source_api_id = ? LIMIT 1',
      [uid, sourceApiId],
    );
    return rows.length > 0;
  }, [db]);

  return {
    recipes,
    loading: false,
    error: null,
    save,
    favorite,
    remove,
    checkSaved,
    refresh: useCallback(() => {}, []),
  };
}

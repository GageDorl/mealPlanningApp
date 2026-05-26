import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import {
  getSavedRecipes,
  saveRecipe,
  toggleFavorite,
  deleteRecipe,
  isRecipeSaved,
  type RecipeFormData,
} from '@/services/recipe-service';
import type { Recipe } from '@/models/recipe';

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) {
        setRecipes([]);
        return;
      }
      const data = await getSavedRecipes(userId);
      setRecipes(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (recipeData: RecipeFormData): Promise<Recipe> => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) throw new Error('Not authenticated');
    const recipe = await saveRecipe(userId, recipeData);
    setRecipes((prev) => [recipe, ...prev]);
    return recipe;
  }, []);

  const favorite = useCallback(async (recipeId: string) => {
    const newValue = await toggleFavorite(recipeId);
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? { ...r, is_favorited: newValue } : r))
    );
    return newValue;
  }, []);

  const remove = useCallback(async (recipeId: string) => {
    await deleteRecipe(recipeId);
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
  }, []);

  const checkSaved = useCallback(async (sourceApiId: string): Promise<boolean> => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) return false;
    return isRecipeSaved(userId, sourceApiId);
  }, []);

  return { recipes, loading, error, save, favorite, remove, checkSaved, refresh: load };
}

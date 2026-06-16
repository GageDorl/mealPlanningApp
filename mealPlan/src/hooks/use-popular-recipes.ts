import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@powersync/react-native';
import * as service from '@/services/popular-recipes-service';

interface PopularRow {
  popular_id: string;
  recipe_id: string;
  display_order: number;
  title: string;
  image_url: string | null;
  calories_per_serving: number | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
}

export interface PopularRecipeEntry {
  id: string;
  recipe_id: string;
  display_order: number;
  recipe: {
    id: string;
    title: string;
    image_url: string | null;
    calories_per_serving: number | null;
    prep_minutes: number | null;
    cook_minutes: number | null;
  };
}

const QUERY = `
  SELECT
    pr.id AS popular_id, pr.recipe_id, pr.display_order,
    r.title, r.image_url, r.calories_per_serving, r.prep_minutes, r.cook_minutes
  FROM popular_recipes pr
  JOIN recipes r ON r.id = pr.recipe_id
  ORDER BY pr.display_order ASC
`;

export function usePopularRecipes() {
  const { data: rows } = useQuery<PopularRow>(QUERY, []);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    service.getPopularRecipesLimit().then(setLimit).catch(() => {});
  }, []);

  const items: PopularRecipeEntry[] = rows.map((row) => ({
    id: row.popular_id,
    recipe_id: row.recipe_id,
    display_order: row.display_order,
    recipe: {
      id: row.recipe_id,
      title: row.title,
      image_url: row.image_url,
      calories_per_serving: row.calories_per_serving,
      prep_minutes: row.prep_minutes,
      cook_minutes: row.cook_minutes,
    },
  }));

  const addRecipe = useCallback(async (recipeId: string) => {
    const nextOrder = items.length > 0 ? Math.max(...items.map((i) => i.display_order)) + 1 : 0;
    await service.addPopularRecipe(recipeId, nextOrder);
  }, [items]);

  const removeRecipe = useCallback(async (popularId: string) => {
    await service.removePopularRecipe(popularId);
  }, []);

  const reorderRecipes = useCallback(async (updates: { id: string; display_order: number }[]) => {
    await service.reorderPopularRecipes(updates);
  }, []);

  const updateLimit = useCallback(async (newLimit: number) => {
    await service.setPopularRecipesLimit(newLimit);
    setLimit(newLimit);
  }, []);

  return { items, limit, addRecipe, removeRecipe, reorderRecipes, updateLimit };
}

import { useMemo } from 'react';
import { useQuery } from '@powersync/react-native';
import { getCachedUserId } from '@/services/supabase';
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

const TOP_RECIPES_QUERY = `
  SELECT r.*, COUNT(msr.id) AS usage_count
  FROM recipes r
  JOIN meal_slot_recipes msr ON msr.recipe_id = r.id
  JOIN meal_slots ms ON ms.id = msr.meal_slot_id
  JOIN meal_plans mp ON mp.id = ms.meal_plan_id
  WHERE mp.user_id = ?
  GROUP BY r.id
  ORDER BY usage_count DESC
  LIMIT ?
`;

export function useTopRecipes(limit = 4) {
  const userId = getCachedUserId() ?? '';
  const { data: rows } = useQuery<Record<string, unknown>>(TOP_RECIPES_QUERY, [userId, limit]);
  const recipes = useMemo<Recipe[]>(() => rows.map(parseRecipeRow), [rows]);
  return { recipes, loading: false };
}

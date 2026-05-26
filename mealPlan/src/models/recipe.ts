export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_id?: string | null;
  raw_text: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  display_order: number;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

export interface Recipe {
  id: string;
  user_id?: string | null;
  title: string;
  description?: string | null;
  image_url?: string | null;
  prep_minutes?: number | null;
  cook_minutes?: number | null;
  servings: number;
  difficulty?: 'easy' | 'medium' | 'hard' | null;
  cuisine_type?: string | null;
  source_type: 'api' | 'url_import' | 'user_created' | 'shared';
  source_url?: string | null;
  source_api_id?: string | null;
  is_favorited: boolean;
  is_offline_available: boolean;
  calories_per_serving?: number | null;
  protein_per_serving?: number | null;
  carbs_per_serving?: number | null;
  fat_per_serving?: number | null;
  fiber_per_serving?: number | null;
  sugar_per_serving?: number | null;
  sodium_per_serving?: number | null;
  instructions?: any[] | null;
  dietary_tags?: string[] | null;
  created_at: string;
  updated_at: string;
}

export const recipeTable = {
  name: 'recipes',
  columns: {
    id: 'text',
    user_id: 'text',
    title: 'text',
    description: 'text',
    image_url: 'text',
    prep_minutes: 'integer',
    cook_minutes: 'integer',
    servings: 'integer',
    difficulty: 'text',
    cuisine_type: 'text',
    source_type: 'text',
    source_url: 'text',
    source_api_id: 'text',
    is_favorited: 'integer',
    is_offline_available: 'integer',
    calories_per_serving: 'integer',
    protein_per_serving: 'integer',
    carbs_per_serving: 'integer',
    fat_per_serving: 'integer',
    fiber_per_serving: 'integer',
    sugar_per_serving: 'integer',
    sodium_per_serving: 'integer',
    instructions: 'text',
    dietary_tags: 'text',
    created_at: 'text',
    updated_at: 'text',
  },
  primaryKey: 'id',
} as const;

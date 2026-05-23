export interface RecipeIngredient {
  id: string;
  recipeId: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  order: number;
}

export interface Recipe {
  id: string;
  userId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  servings: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  cuisine?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  sourceUrl?: string;
  sourceName?: string;
  tags: string[];
  steps: string[];
  createdAt: string;
  updatedAt: string;
}

export const recipeTable = {
  name: 'recipes',
  columns: {
    id: 'text',
    userId: 'text',
    title: 'text',
    description: 'text',
    imageUrl: 'text',
    servings: 'integer',
    prepTimeMinutes: 'integer',
    cookTimeMinutes: 'integer',
    calories: 'integer',
    protein: 'integer',
    carbs: 'integer',
    fat: 'integer',
    fiber: 'integer',
    sugar: 'integer',
    sodium: 'integer',
    cuisine: 'text',
    difficulty: 'text',
    sourceUrl: 'text',
    sourceName: 'text',
    tags: 'json',
    steps: 'json',
    createdAt: 'text',
    updatedAt: 'text',
  },
  primaryKey: 'id',
} as const;

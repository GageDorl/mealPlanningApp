export interface Ingredient {
  id: string;
  name: string;
  defaultUnit: string;
  defaultQuantity: number;
  category?: string;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export const ingredientTable = {
  name: 'ingredients',
  columns: {
    id: 'text',
    name: 'text',
    defaultUnit: 'text',
    defaultQuantity: 'real',
    category: 'text',
    nutrition: 'json',
    createdAt: 'text',
    updatedAt: 'text',
  },
  primaryKey: 'id',
} as const;

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


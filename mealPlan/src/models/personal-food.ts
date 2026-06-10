export interface PersonalFood {
  id: string;
  user_id: string;
  food_name: string;
  brand_name?: string | null;
  serving_size_amount?: number | null;
  serving_size_unit?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  saturated_fat?: number | null;
  trans_fat?: number | null;
  cholesterol?: number | null;
  sodium?: number | null;
  dietary_fiber?: number | null;
  total_sugar?: number | null;
  added_sugar?: number | null;
  fatsecret_id?: string | null;
  created_at: string;
  updated_at: string;
}

export const personalFoodTable = {
  name: 'personal_foods',
  columns: {
    id: 'text',
    user_id: 'text',
    food_name: 'text',
    brand_name: 'text',
    serving_size_amount: 'real',
    serving_size_unit: 'text',
    calories: 'real',
    protein: 'real',
    carbs: 'real',
    fat: 'real',
    saturated_fat: 'real',
    trans_fat: 'real',
    cholesterol: 'real',
    sodium: 'real',
    dietary_fiber: 'real',
    total_sugar: 'real',
    added_sugar: 'real',
    fatsecret_id: 'text',
    created_at: 'text',
    updated_at: 'text',
  },
  primaryKey: 'id',
} as const;

export interface FoodLog {
  id: string;
  user_id: string;
  date: string; // 'YYYY-MM-DD'
  time_of_day?: string | null; // 'HH:MM'
  label?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodLogItem {
  id: string;
  food_log_id: string;
  food_name: string;
  brand_name?: string | null;
  serving_size_amount?: number | null;
  serving_size_unit?: string | null;
  servings_eaten: number;
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
  source: 'manual' | 'library' | 'fatsecret' | 'recipe';
  source_id?: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const foodLogTable = {
  name: 'food_logs',
  columns: {
    id: 'text',
    user_id: 'text',
    date: 'text',
    time_of_day: 'text',
    label: 'text',
    created_at: 'text',
    updated_at: 'text',
  },
  primaryKey: 'id',
} as const;

export const foodLogItemTable = {
  name: 'food_log_items',
  columns: {
    id: 'text',
    food_log_id: 'text',
    food_name: 'text',
    brand_name: 'text',
    serving_size_amount: 'real',
    serving_size_unit: 'text',
    servings_eaten: 'real',
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
    source: 'text',
    source_id: 'text',
    display_order: 'integer',
    created_at: 'text',
    updated_at: 'text',
  },
  primaryKey: 'id',
} as const;

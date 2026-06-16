export interface FoodLog {
  id: string;
  user_id: string;
  date: string; // 'YYYY-MM-DD'
  time_of_day?: string | null; // 'HH:MM'
  label?: string | null;
  icon?: string | null;
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
  source: 'manual' | 'library' | 'fatsecret' | 'recipe' | 'community';
  source_id?: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}


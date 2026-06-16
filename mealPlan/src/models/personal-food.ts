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
  barcode?: string | null;
  created_at: string;
  updated_at: string;
}


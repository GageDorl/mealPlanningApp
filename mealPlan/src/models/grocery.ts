export interface GroceryList {
  id: string;
  user_id: string;
  meal_plan_id: string;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export interface GroceryItem {
  id: string;
  grocery_list_id: string;
  ingredient_id?: string | null;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  category?: string | null;
  is_checked: number; // SQLite stores booleans as 0/1
  deficit_note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PantryStaple {
  id: string;
  user_id: string;
  ingredient_name: string;
  quantity?: number | null;
  unit?: string | null;
  created_at: string;
}

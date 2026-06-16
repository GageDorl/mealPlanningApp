export interface MealSlot {
  id: string;
  meal_plan_id: string;
  recipe_id?: string | null;
  label: string;
  date: string; // 'YYYY-MM-DD'
  time_of_day?: string | null; // 'HH:MM'
  serving_override?: number | null;
  servings_eaten?: number | null;
  external_event_id?: string | null;
  display_order: number;
  icon?: string | null;
  created_at: string;
  updated_at: string;
}


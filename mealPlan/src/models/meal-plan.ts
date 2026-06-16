export interface MealPlan {
  id: string;
  user_id: string | null;
  week_start: string; // 'YYYY-MM-DD'
  created_at: string;
  updated_at: string;
}


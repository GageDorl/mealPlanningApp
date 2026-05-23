export interface MealPlan {
  id: string;
  user_id: string | null;
  week_start: string; // 'YYYY-MM-DD'
  created_at: string;
  updated_at: string;
}

export const mealPlanTable = {
  name: 'meal_plans',
  columns: {
    id: 'text',
    user_id: 'text',
    week_start: 'text',
    created_at: 'text',
    updated_at: 'text',
  },
  primaryKey: 'id',
} as const;

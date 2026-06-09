export interface MealSlot {
  id: string;
  meal_plan_id: string;
  recipe_id?: string | null;
  label: string;
  date: string; // 'YYYY-MM-DD'
  time_of_day?: string | null; // 'HH:MM'
  serving_override?: number | null;
  external_event_id?: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const mealSlotTable = {
  name: 'meal_slots',
  columns: {
    id: 'text',
    meal_plan_id: 'text',
    recipe_id: 'text',
    label: 'text',
    date: 'text',
    time_of_day: 'text',
    serving_override: 'integer',
    external_event_id: 'text',
    display_order: 'integer',
    created_at: 'text',
    updated_at: 'text',
  },
  primaryKey: 'id',
} as const;

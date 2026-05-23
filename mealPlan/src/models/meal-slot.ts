export interface MealSlot {
  id: string;
  planId: string;
  date: string;
  time: string;
  label: string;
  assignedRecipeId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const mealSlotTable = {
  name: 'meal_slots',
  columns: {
    id: 'text',
    planId: 'text',
    date: 'text',
    time: 'text',
    label: 'text',
    assignedRecipeId: 'text',
    notes: 'text',
    createdAt: 'text',
    updatedAt: 'text',
  },
  primaryKey: 'id',
} as const;

export interface MealPlan {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export const mealPlanTable = {
  name: 'meal_plans',
  columns: {
    id: 'text',
    userId: 'text',
    startDate: 'text',
    endDate: 'text',
    title: 'text',
    createdAt: 'text',
    updatedAt: 'text',
  },
  primaryKey: 'id',
} as const;

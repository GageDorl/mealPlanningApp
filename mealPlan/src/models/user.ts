export interface User {
  id: string;
  email: string;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
  macroGoals: Record<string, number>;
  dietaryPreferences: string[];
  notificationSettings: {
    mealReminders: boolean;
    planningNudges: boolean;
    macroCheckIns: boolean;
  };
  onboardingCompleted: boolean;
}

export const userTable = {
  name: 'users',
  columns: {
    id: 'text',
    email: 'text',
    displayName: 'text',
    createdAt: 'text',
    updatedAt: 'text',
    macroGoals: 'json',
    dietaryPreferences: 'json',
    notificationSettings: 'json',
    onboardingCompleted: 'boolean',
  },
  primaryKey: 'id',
} as const;

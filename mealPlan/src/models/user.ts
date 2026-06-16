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


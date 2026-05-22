import type { ReactNode } from 'react';
import env from '@/constants/env';
import { groceryTable } from '@/models/grocery';
import { ingredientTable } from '@/models/ingredient';
import { mealPlanTable } from '@/models/meal-plan';
import { mealSlotTable } from '@/models/meal-slot';
import { recipeTable } from '@/models/recipe';
import { userTable } from '@/models/user';

const RawPowerSyncProvider: any = (require('@powersync/react-native') as any).PowerSyncProvider;

const syncTables = [
  userTable,
  recipeTable,
  ingredientTable,
  mealPlanTable,
  mealSlotTable,
  groceryTable,
] as const;

interface PowerSyncProviderProps {
  children: ReactNode;
}

export function PowerSyncProvider({ children }: PowerSyncProviderProps) {
  return (
    <RawPowerSyncProvider
      syncUrl={env.POWERSYNC_URL}
      databaseName="prepd"
      tables={syncTables as any}
    >
      {children}
    </RawPowerSyncProvider>
  );
}

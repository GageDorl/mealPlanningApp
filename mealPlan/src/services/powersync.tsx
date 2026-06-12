import type { ReactNode } from 'react';

import env from '@/constants/env';
import { foodLogItemTable, foodLogTable } from '@/models/food-log';
import { groceryTable } from '@/models/grocery';
import { ingredientTable } from '@/models/ingredient';
import { mealPlanTable } from '@/models/meal-plan';
import { mealSlotTable } from '@/models/meal-slot';
import { personalFoodTable } from '@/models/personal-food';
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
  foodLogTable,
  foodLogItemTable,
  personalFoodTable,
] as const;

interface PowerSyncProviderProps {
  children: ReactNode;
}

const FallbackProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
const PowerSyncProviderImpl = RawPowerSyncProvider ?? FallbackProvider;

export function PowerSyncProvider({ children }: PowerSyncProviderProps) {
  return (
    <PowerSyncProviderImpl
      syncUrl={env.POWERSYNC_URL}
      databaseName="prepd"
      tables={syncTables as any}
    >
      {children}
    </PowerSyncProviderImpl>
  );
}

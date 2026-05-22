export interface MacroDefinition {
  key: string;
  label: string;
  unit: string;
  defaultGoal: number;
}

export const DefaultMacros: MacroDefinition[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', defaultGoal: 2000 },
  { key: 'protein', label: 'Protein', unit: 'g', defaultGoal: 150 },
  { key: 'carbs', label: 'Carbs', unit: 'g', defaultGoal: 250 },
  { key: 'fat', label: 'Fat', unit: 'g', defaultGoal: 65 },
];

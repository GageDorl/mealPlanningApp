export interface MacroDefinition {
  key: string;
  label: string;
  unit: string;
  color: string;
  defaultGoal: number;
}

export const DefaultMacros: MacroDefinition[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: '#FF6B2C', defaultGoal: 2000 },
  { key: 'protein', label: 'Protein', unit: 'g', color: '#4A90D9', defaultGoal: 150 },
  { key: 'carbs', label: 'Carbs', unit: 'g', color: '#F5A623', defaultGoal: 250 },
  { key: 'fat', label: 'Fat', unit: 'g', color: '#7B68EE', defaultGoal: 65 },
  { key: 'fiber', label: 'Fiber', unit: 'g', color: '#50C878', defaultGoal: 30 },
  { key: 'sugar', label: 'Sugar', unit: 'g', color: '#FF69B4', defaultGoal: 50 },
  { key: 'sodium', label: 'Sodium', unit: 'mg', color: '#8B8B8B', defaultGoal: 2300 },
];

export const CoreMacroKeys = ['calories', 'protein', 'carbs', 'fat'] as const;
export type CoreMacroKey = (typeof CoreMacroKeys)[number];

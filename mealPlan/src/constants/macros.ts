export interface MacroDefinition {
  key: string;
  label: string;
  unit: string;
  color: string;
  defaultGoal: number;
}

export const DefaultMacros: MacroDefinition[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: '#FF6B2C', defaultGoal: 2000 },
  { key: 'fat', label: 'Fat', unit: 'g', color: '#7B68EE', defaultGoal: 65 },
  { key: 'sodium', label: 'Sodium', unit: 'mg', color: '#8B8B8B', defaultGoal: 2300 },
  { key: 'carbs', label: 'Carbs', unit: 'g', color: '#F5A623', defaultGoal: 250 },
  { key: 'fiber', label: 'Fiber', unit: 'g', color: '#50C878', defaultGoal: 30 },
  { key: 'sugar', label: 'Sugar', unit: 'g', color: '#FF69B4', defaultGoal: 50 },
  { key: 'protein', label: 'Protein', unit: 'g', color: '#4A90D9', defaultGoal: 150 },
];

export const CoreMacroKeys = ['calories', 'protein', 'carbs', 'fat'] as const;
export type CoreMacroKey = (typeof CoreMacroKeys)[number];

// Extended food-label fields not tracked as daily goals — displayed in food log UI only.
// defaultGoal: 0 means no goal; used to distinguish from tracked macros.
export const FoodLabelMacros: MacroDefinition[] = [
  { key: 'saturated_fat', label: 'Saturated Fat', unit: 'g', color: '#E07B54', defaultGoal: 0 },
  { key: 'trans_fat', label: 'Trans Fat', unit: 'g', color: '#C0392B', defaultGoal: 0 },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', color: '#D4AC0D', defaultGoal: 0 },
  { key: 'added_sugar', label: 'Added Sugar', unit: 'g', color: '#C471ED', defaultGoal: 0 },
];

export type FoodLabelMacroKey = 'saturated_fat' | 'trans_fat' | 'cholesterol' | 'added_sugar';

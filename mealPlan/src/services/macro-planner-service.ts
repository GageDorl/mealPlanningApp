export type GoalType = 'maintain' | 'lose' | 'gain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
export type Sex = 'male' | 'female' | 'other';

export interface MacroPlannerInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  goalType: GoalType;
  activityLevel: ActivityLevel;
  dietaryTags: string[];
}

export interface MacroRecommendation {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goalType: GoalType;
  activityLevel: ActivityLevel;
  caloriesLabel: string;
  proteinRatio: number;
  carbsRatio: number;
  fatRatio: number;
  mealPattern: string;
  guidance: string[];
}

const activityFactors: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

const goalAdjustments: Record<GoalType, number> = {
  lose: 0.85,
  maintain: 1,
  gain: 1.1,
};

const macroRatios: Record<GoalType, { protein: number; carbs: number; fat: number }> = {
  lose: { protein: 0.3, carbs: 0.35, fat: 0.35 },
  maintain: { protein: 0.25, carbs: 0.45, fat: 0.3 },
  gain: { protein: 0.25, carbs: 0.5, fat: 0.25 },
};

const goalLabels: Record<GoalType, string> = {
  lose: 'Lose weight',
  maintain: 'Maintain weight',
  gain: 'Gain muscle',
};

const activityLabels: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly active',
  moderate: 'Moderately active',
  active: 'Active',
};

const sexLabels: Record<Sex, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Prefer not to say',
};

function estimateBmr(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  if (sex === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  if (sex === 'female') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 78;
}

export function getGoalLabel(goalType: GoalType): string {
  return goalLabels[goalType];
}

export function getActivityLabel(activityLevel: ActivityLevel): string {
  return activityLabels[activityLevel];
}

export function getSexLabel(sex: Sex): string {
  return sexLabels[sex];
}

export function recommendMacroPlan(input: MacroPlannerInput): MacroRecommendation {
  const { weightKg, heightCm, age, sex, goalType, activityLevel, dietaryTags } = input;
  const bmr = estimateBmr(weightKg, heightCm, age, sex);
  const activityFactor = activityFactors[activityLevel];
  const goalAdjustment = goalAdjustments[goalType];
  const targetCalories = Math.round(bmr * activityFactor * goalAdjustment);

  const ratios = macroRatios[goalType];
  const proteinCalories = targetCalories * ratios.protein;
  const carbsCalories = targetCalories * ratios.carbs;
  const fatCalories = targetCalories * ratios.fat;

  const protein = Math.round(proteinCalories / 4);
  const carbs = Math.round(carbsCalories / 4);
  const fat = Math.round(fatCalories / 9);

  const mealPattern = goalType === 'gain'
    ? '3 meals plus 1-2 snacks to support muscle growth.'
    : goalType === 'lose'
      ? '3 balanced meals with one light snack to keep energy steady.'
      : '3 meals with optional light snack based on hunger.';

  const guidance: string[] = [
    `Aim for a ${goalLabels[goalType].toLowerCase()} strategy with ${activityLabels[activityLevel].toLowerCase()} activity.`,
    'Build each meal around lean protein, whole grains, vegetables, and healthy fats.',
    'Keep sodium moderate, fiber ample, and added sugar low for better daily balance.',
  ];

  if (dietaryTags.includes('vegan') || dietaryTags.includes('vegetarian')) {
    guidance.push('Use plant-based proteins like legumes, tofu, tempeh, and nuts to meet your protein target.');
  }

  if (dietaryTags.includes('gluten-free')) {
    guidance.push('Choose naturally gluten-free grains like rice, oats, quinoa, and buckwheat.');
  }

  if (dietaryTags.includes('paleo')) {
    guidance.push('Favor whole foods and non-processed sources of protein, fats, and carbohydrates.');
  }

  return {
    calories: targetCalories,
    protein,
    carbs,
    fat,
    goalType,
    activityLevel,
    caloriesLabel: `${targetCalories} kcal · ${goalLabels[goalType]}`,
    proteinRatio: ratios.protein,
    carbsRatio: ratios.carbs,
    fatRatio: ratios.fat,
    mealPattern,
    guidance,
  };
}

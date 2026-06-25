export type GoalType = 'maintain' | 'lose' | 'gain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
export type Sex = 'male' | 'female' | 'other';

export interface MacroPlannerInput {
  weightLbs: number;
  heightIn: number;
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

// g of protein per lb of bodyweight by goal — based on current sports nutrition research
const proteinPerLb: Record<GoalType, number> = {
  lose: 0.80,
  maintain: 0.60,
  gain: 0.70,
};

// carb/fat split of remaining calories after protein is accounted for
const carbFatSplit: Record<GoalType, { carbs: number; fat: number }> = {
  lose: { carbs: 0.50, fat: 0.50 },
  maintain: { carbs: 0.60, fat: 0.40 },
  gain: { carbs: 0.67, fat: 0.33 },
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

// Mifflin-St Jeor in US customary: 4.536 × lbs + 15.875 × inches − 5 × age ± sex offset
function estimateBmr(weightLbs: number, heightIn: number, age: number, sex: Sex): number {
  const base = 4.536 * weightLbs + 15.875 * heightIn - 5 * age;
  if (sex === 'male') return base + 5;
  if (sex === 'female') return base - 161;
  return base - 78;
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
  const { weightLbs, heightIn, age, sex, goalType, activityLevel, dietaryTags } = input;
  const bmr = estimateBmr(weightLbs, heightIn, age, sex);
  const activityFactor = activityFactors[activityLevel];
  const goalAdjustment = goalAdjustments[goalType];
  const targetCalories = Math.round(bmr * activityFactor * goalAdjustment);

  const protein = Math.round(weightLbs * proteinPerLb[goalType]);
  const remainingCalories = targetCalories - protein * 4;
  const split = carbFatSplit[goalType];
  const carbs = Math.round((remainingCalories * split.carbs) / 4);
  const fat = Math.round((remainingCalories * split.fat) / 9);

  const proteinCalories = protein * 4;
  const carbsCalories = carbs * 4;
  const fatCalories = fat * 9;

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
    proteinRatio: proteinCalories / targetCalories,
    carbsRatio: carbsCalories / targetCalories,
    fatRatio: fatCalories / targetCalories,
    mealPattern,
    guidance,
  };
}

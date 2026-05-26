import type { UsdaIngredientResult } from '@/services/usda';

export interface MacroCalculation {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

const UNIT_TO_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  mg: 0.001,
  milligram: 0.001,
  milligrams: 0.001,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
  cup: 240,
  cups: 240,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
};

export function convertToGrams(quantity: number, unit: string): number {
  const factor = UNIT_TO_GRAMS[unit.toLowerCase().trim()];
  return factor != null ? quantity * factor : quantity; // unknown unit → treat as grams
}

export function calculateForQuantity(
  ingredient: UsdaIngredientResult,
  quantity: number,
  unit: string
): MacroCalculation {
  const grams = convertToGrams(quantity, unit);
  const ratio = grams / 100;

  return {
    calories: Math.round(ingredient.caloriesPer100g * ratio),
    protein: parseFloat((ingredient.proteinPer100g * ratio).toFixed(1)),
    carbs: parseFloat((ingredient.carbsPer100g * ratio).toFixed(1)),
    fat: parseFloat((ingredient.fatPer100g * ratio).toFixed(1)),
    ...(ingredient.fiberPer100g != null
      ? { fiber: parseFloat((ingredient.fiberPer100g * ratio).toFixed(1)) }
      : {}),
    ...(ingredient.sugarPer100g != null
      ? { sugar: parseFloat((ingredient.sugarPer100g * ratio).toFixed(1)) }
      : {}),
    ...(ingredient.sodiumPer100g != null
      ? { sodium: Math.round(ingredient.sodiumPer100g * ratio) }
      : {}),
  };
}

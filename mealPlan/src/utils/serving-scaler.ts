export interface ScalableIngredient {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  raw_text?: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

export interface ScaledIngredient extends ScalableIngredient {
  scaledQuantity?: number | null;
}

export interface ScalableMacros {
  calories_per_serving?: number | null;
  protein_per_serving?: number | null;
  carbs_per_serving?: number | null;
  fat_per_serving?: number | null;
  fiber_per_serving?: number | null;
  sugar_per_serving?: number | null;
  sodium_per_serving?: number | null;
}

export interface ScaledRecipe {
  ingredients: ScaledIngredient[];
  macros: ScalableMacros;
  servings: number;
}

export function scaleRecipe(
  ingredients: ScalableIngredient[],
  macros: ScalableMacros,
  originalServings: number,
  targetServings: number
): ScaledRecipe {
  const ratio = originalServings > 0 ? targetServings / originalServings : 1;

  const scaledIngredients: ScaledIngredient[] = ingredients.map((ing) => ({
    ...ing,
    scaledQuantity: ing.quantity != null ? parseFloat((ing.quantity * ratio).toFixed(2)) : null,
    calories: ing.calories != null ? ing.calories * ratio : null,
    protein: ing.protein != null ? ing.protein * ratio : null,
    carbs: ing.carbs != null ? ing.carbs * ratio : null,
    fat: ing.fat != null ? ing.fat * ratio : null,
  }));

  const scaledMacros: ScalableMacros = {
    calories_per_serving:
      macros.calories_per_serving != null ? Math.round(macros.calories_per_serving * ratio) : null,
    protein_per_serving:
      macros.protein_per_serving != null
        ? parseFloat((macros.protein_per_serving * ratio).toFixed(1))
        : null,
    carbs_per_serving:
      macros.carbs_per_serving != null
        ? parseFloat((macros.carbs_per_serving * ratio).toFixed(1))
        : null,
    fat_per_serving:
      macros.fat_per_serving != null
        ? parseFloat((macros.fat_per_serving * ratio).toFixed(1))
        : null,
    fiber_per_serving:
      macros.fiber_per_serving != null
        ? parseFloat((macros.fiber_per_serving * ratio).toFixed(1))
        : null,
    sugar_per_serving:
      macros.sugar_per_serving != null
        ? parseFloat((macros.sugar_per_serving * ratio).toFixed(1))
        : null,
    sodium_per_serving:
      macros.sodium_per_serving != null ? Math.round(macros.sodium_per_serving * ratio) : null,
  };

  return { ingredients: scaledIngredients, macros: scaledMacros, servings: targetServings };
}

const FRACTION_MAP: Array<[number, string]> = [
  [0.125, '⅛'],
  [0.25, '¼'],
  [0.333, '⅓'],
  [0.5, '½'],
  [0.667, '⅔'],
  [0.75, '¾'],
];

export function formatQuantity(quantity: number | null | undefined): string {
  if (quantity == null) return '';
  if (quantity === 0) return '0';
  if (quantity === Math.floor(quantity)) return quantity.toString();

  const whole = Math.floor(quantity);
  const frac = quantity - whole;
  const match = FRACTION_MAP.find(([val]) => Math.abs(frac - val) < 0.04);
  if (match) return whole > 0 ? `${whole} ${match[1]}` : match[1];

  return quantity.toFixed(1).replace(/\.0$/, '');
}

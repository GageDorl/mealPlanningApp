import AsyncStorage from '@react-native-async-storage/async-storage';
import env from '@/constants/env';
import { supabase } from '@/services/supabase';

const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const CACHE_PREFIX = 'usda:ingredient:';

export interface UsdaIngredientResult {
  fdcId: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
  sugarPer100g?: number;
  sodiumPer100g?: number;
}

export interface UsdaLookupResponse {
  results: UsdaIngredientResult[];
}

export interface FoodPortion {
  portionDescription: string;
  gramWeight: number;
  amount: number;
}

// Units that represent a weight or volume — no portion lookup needed
const WEIGHT_VOLUME_UNITS = new Set([
  'g', 'kg', 'oz', 'lb', 'ml', 'l', 'cup', 'tbsp', 'tsp',
]);

function getNutrientValue(
  nutrients: Array<{ nutrientName: string; value: number }>,
  nameFragment: string
): number {
  const lower = nameFragment.toLowerCase();
  return (
    nutrients.find((n) => n.nutrientName.toLowerCase().includes(lower))?.value ?? 0
  );
}

export async function lookupIngredient(
  query: string,
  dataType?: string[],
  page = 1
): Promise<UsdaLookupResponse> {
  const cacheKey = `${CACHE_PREFIX}${query.toLowerCase().trim()}:p${page}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as UsdaLookupResponse;
  } catch {
    // ignore cache read errors
  }

  const url = new URL(`${BASE_URL}/foods/search`);
  url.searchParams.set('query', query);
  url.searchParams.set('api_key', env.USDA_API_KEY || 'DEMO_KEY');
  url.searchParams.set('dataType', (dataType ?? ['Foundation', 'SR Legacy']).join(','));
  url.searchParams.set('pageSize', '10');
  url.searchParams.set('pageNumber', String(page));

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`USDA lookup failed: ${response.status}`);

  const raw = await response.json();
  const results: UsdaIngredientResult[] = ((raw.foods ?? []) as any[])
    .slice(0, 10)
    .map((food: any) => {
      const nutrients: Array<{ nutrientName: string; value: number }> =
        food.foodNutrients ?? [];
      const fiber = getNutrientValue(nutrients, 'fiber');
      const sugar = getNutrientValue(nutrients, 'sugars');
      const sodium = getNutrientValue(nutrients, 'sodium');
      return {
        fdcId: String(food.fdcId),
        name: food.description ?? query,
        caloriesPer100g: Math.round(getNutrientValue(nutrients, 'energy')),
        proteinPer100g: parseFloat(getNutrientValue(nutrients, 'protein').toFixed(1)),
        carbsPer100g: parseFloat(
          getNutrientValue(nutrients, 'carbohydrate').toFixed(1)
        ),
        fatPer100g: parseFloat(
          getNutrientValue(nutrients, 'total lipid').toFixed(1)
        ),
        ...(fiber > 0 ? { fiberPer100g: parseFloat(fiber.toFixed(1)) } : {}),
        ...(sugar > 0 ? { sugarPer100g: parseFloat(sugar.toFixed(1)) } : {}),
        ...(sodium > 0 ? { sodiumPer100g: Math.round(sodium) } : {}),
      };
    });

  const result: UsdaLookupResponse = { results };
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
  } catch {
    // ignore cache write errors
  }

  return result;
}

// Returns portions for a given fdcId. Checks Supabase shared cache first,
// then falls back to the USDA detail endpoint and stores the result.
export async function getFoodPortions(fdcId: string, foodName: string): Promise<FoodPortion[]> {
  // 1. Check shared Supabase cache
  const { data } = await supabase
    .from('usda_food_portions')
    .select('portions')
    .eq('fdc_id', fdcId)
    .single();

  if (data?.portions) {
    return data.portions as FoodPortion[];
  }

  // 2. Fetch from USDA detail endpoint
  const url = new URL(`${BASE_URL}/food/${fdcId}`);
  url.searchParams.set('api_key', env.USDA_API_KEY || 'DEMO_KEY');

  const response = await fetch(url.toString());
  if (!response.ok) return [];

  const raw = await response.json();
  const portions: FoodPortion[] = ((raw.foodPortions ?? []) as any[]).map((p: any) => ({
    portionDescription: p.portionDescription ?? '',
    gramWeight: p.gramWeight ?? 0,
    amount: p.amount ?? 1,
  })).filter((p: FoodPortion) => p.gramWeight > 0);

  // 3. Store in Supabase via Edge Function (fire-and-forget)
  supabase.functions
    .invoke('store-food-portions', { body: { fdcId, foodName, portions } })
    .catch(() => {});

  return portions;
}

// Resolves a gram equivalent from portions when the ingredient has no weight/volume unit.
// Returns undefined if a confident match can't be made.
export async function resolvePortionGrams(
  fdcId: string,
  foodName: string,
  qty: number,
  unit: string
): Promise<number | undefined> {
  if (WEIGHT_VOLUME_UNITS.has(unit)) return undefined;

  const portions = await getFoodPortions(fdcId, foodName);
  if (portions.length === 0) return undefined;

  // Prefer portions whose description suggests a single whole item
  const PREFERRED_TERMS = ['medium', 'each', 'whole', 'large', 'small', '1 '];
  const sorted = [...portions].sort((a, b) => {
    const aScore = PREFERRED_TERMS.findIndex((t) =>
      a.portionDescription.toLowerCase().includes(t)
    );
    const bScore = PREFERRED_TERMS.findIndex((t) =>
      b.portionDescription.toLowerCase().includes(t)
    );
    // Lower index = higher preference; -1 (not found) goes last
    return (aScore === -1 ? 999 : aScore) - (bScore === -1 ? 999 : bScore);
  });

  const best = sorted[0];
  const gramsPerUnit = best.gramWeight / (best.amount || 1);
  return parseFloat((qty * gramsPerUnit).toFixed(1));
}

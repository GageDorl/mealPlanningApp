import env from '@/constants/env';
import { getCached, getCachedIfFresh, setCached } from './local-cache-service';

const BASE_URL = 'https://api.spoonacular.com';

export interface SpoonacularSearchResult {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface SpoonacularSearchResponse {
  results: SpoonacularSearchResult[];
  totalResults: number;
  offset: number;
  cached?: boolean;
}

export interface SpoonacularSearchParams {
  query: string;
  cuisine?: string;
  diet?: string[];
  maxReadyTime?: number;
  offset?: number;
  number?: number;
}

export interface SpoonacularRecipeDetail {
  id: number;
  title: string;
  description: string;
  image: string;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  cuisineType: string | null;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    rawText: string;
  }>;
  instructions: string[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  dietaryTags: string[];
  sourceUrl: string;
}

function makeCacheKey(prefix: string, params: object): string {
  return `spoonacular:${prefix}:${JSON.stringify(params)}`;
}

function getNutrientAmount(nutrients: Array<{ name: string; amount: number }>, name: string): number {
  return nutrients.find((n) => n.name.toLowerCase() === name.toLowerCase())?.amount ?? 0;
}

function inferDifficulty(readyInMinutes: number): 'easy' | 'medium' | 'hard' | null {
  if (readyInMinutes <= 0) return null;
  if (readyInMinutes <= 20) return 'easy';
  if (readyInMinutes <= 45) return 'medium';
  return 'hard';
}

export async function searchRecipes(
  params: SpoonacularSearchParams
): Promise<SpoonacularSearchResponse> {
  const cacheKey = makeCacheKey('search', params);
  const cached = await getCachedIfFresh<SpoonacularSearchResponse>('cached_recipes', cacheKey);
  if (cached) return { ...cached, cached: true };

  const url = new URL(`${BASE_URL}/recipes/complexSearch`);
  url.searchParams.set('apiKey', env.SPOONACULAR_API_KEY);
  url.searchParams.set('query', params.query);
  url.searchParams.set('number', String(params.number ?? 10));
  url.searchParams.set('offset', String(params.offset ?? 0));
  url.searchParams.set('addRecipeNutrition', 'true');
  url.searchParams.set('addRecipeInformation', 'true');
  if (params.cuisine) url.searchParams.set('cuisine', params.cuisine);
  if (params.diet?.length) url.searchParams.set('diet', params.diet.join(','));
  if (params.maxReadyTime) url.searchParams.set('maxReadyTime', String(params.maxReadyTime));

  let response: Response;
  try {
    response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Spoonacular search failed: ${response.status}`);
  } catch {
    const stale = await getCached<SpoonacularSearchResponse>('cached_recipes', cacheKey);
    if (stale) return { ...stale, cached: true };
    throw new Error('Spoonacular search failed and no cached results available');
  }

  const raw = await response.json();
  const result: SpoonacularSearchResponse = {
    totalResults: raw.totalResults ?? 0,
    offset: raw.offset ?? 0,
    results: ((raw.results ?? []) as any[]).map((r) => {
      const nutrients: Array<{ name: string; amount: number }> = r.nutrition?.nutrients ?? [];
      return {
        id: r.id,
        title: r.title,
        image: r.image ?? '',
        readyInMinutes: r.readyInMinutes ?? 0,
        servings: r.servings ?? 1,
        nutrition: {
          calories: Math.round(getNutrientAmount(nutrients, 'calories')),
          protein: Math.round(getNutrientAmount(nutrients, 'protein')),
          carbs: Math.round(getNutrientAmount(nutrients, 'carbohydrates')),
          fat: Math.round(getNutrientAmount(nutrients, 'fat')),
        },
      };
    }),
  };

  await setCached('cached_recipes', cacheKey, result);
  return result;
}

export async function getRecipeDetail(spoonacularId: number): Promise<SpoonacularRecipeDetail> {
  const cacheKey = makeCacheKey('detail', { id: spoonacularId });
  const cached = await getCachedIfFresh<SpoonacularRecipeDetail>('cached_recipes', cacheKey);
  if (cached) return cached;

  const url = new URL(`${BASE_URL}/recipes/${spoonacularId}/information`);
  url.searchParams.set('apiKey', env.SPOONACULAR_API_KEY);
  url.searchParams.set('includeNutrition', 'true');

  let response: Response;
  try {
    response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Spoonacular detail failed: ${response.status}`);
  } catch {
    const stale = await getCached<SpoonacularRecipeDetail>('cached_recipes', cacheKey);
    if (stale) return stale;
    throw new Error('Spoonacular detail failed and no cached result available');
  }

  const raw = await response.json();
  const nutrients: Array<{ name: string; amount: number }> = raw.nutrition?.nutrients ?? [];

  const instructions: string[] = [];
  for (const section of (raw.analyzedInstructions ?? []) as any[]) {
    for (const step of section.steps ?? []) {
      instructions.push(step.step as string);
    }
  }

  const totalMinutes: number = raw.readyInMinutes ?? 0;
  const prepMinutes: number = raw.preparationMinutes > 0 ? raw.preparationMinutes : Math.round(totalMinutes * 0.4);
  const cookMinutes: number = raw.cookingMinutes > 0 ? raw.cookingMinutes : Math.round(totalMinutes * 0.6);

  const fiberAmount = Math.round(getNutrientAmount(nutrients, 'fiber'));
  const sugarAmount = Math.round(getNutrientAmount(nutrients, 'sugar'));
  const sodiumAmount = Math.round(getNutrientAmount(nutrients, 'sodium'));

  const detail: SpoonacularRecipeDetail = {
    id: raw.id,
    title: raw.title,
    description: typeof raw.summary === 'string' ? raw.summary.replace(/<[^>]+>/g, '') : '',
    image: raw.image ?? '',
    prepMinutes,
    cookMinutes,
    servings: raw.servings ?? 1,
    difficulty: inferDifficulty(totalMinutes),
    cuisineType: (raw.cuisines as string[])?.[0] ?? null,
    ingredients: ((raw.extendedIngredients ?? []) as any[]).map((ing) => ({
      name: ing.name ?? '',
      quantity: ing.amount ?? 0,
      unit: ing.unit ?? '',
      rawText: ing.original ?? `${ing.amount} ${ing.unit} ${ing.name}`,
    })),
    instructions,
    nutrition: {
      calories: Math.round(getNutrientAmount(nutrients, 'calories')),
      protein: Math.round(getNutrientAmount(nutrients, 'protein')),
      carbs: Math.round(getNutrientAmount(nutrients, 'carbohydrates')),
      fat: Math.round(getNutrientAmount(nutrients, 'fat')),
      ...(fiberAmount > 0 ? { fiber: fiberAmount } : {}),
      ...(sugarAmount > 0 ? { sugar: sugarAmount } : {}),
      ...(sodiumAmount > 0 ? { sodium: sodiumAmount } : {}),
    },
    dietaryTags: [
      ...(raw.vegetarian ? ['vegetarian'] : []),
      ...(raw.vegan ? ['vegan'] : []),
      ...(raw.glutenFree ? ['gluten-free'] : []),
      ...(raw.dairyFree ? ['dairy-free'] : []),
    ],
    sourceUrl: raw.sourceUrl ?? raw.spoonacularSourceUrl ?? '',
  };

  await setCached('cached_recipes', cacheKey, detail);
  return detail;
}

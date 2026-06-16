'use client';
import { supabase } from '@/services/supabase';
import { lookupPublicFoodByBarcode, searchPublicFoods, cachePublicFood } from '@/services/public-food-service';
import { getCached, getCachedIfFresh, setCached } from './local-cache-service';
import type { PublicFood } from '@/services/public-food-service';

export interface FatSecretServing {
  serving_id: string;
  serving_description: string;
  metric_serving_amount?: number;
  metric_serving_unit?: string; // 'g' | 'ml'
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  saturated_fat?: number;
  trans_fat?: number;
  cholesterol?: number;
  sodium?: number;
  fiber?: number;
  sugar?: number;
  added_sugar?: number;
}

export interface FoodDetails {
  id: string;
  name: string;
  brand_name?: string;
  servings: FatSecretServing[];
  stale?: boolean;
}

export interface FoodSearchResult {
  id: string;
  name: string;
  brand_name?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  servingDescription?: string;
  caloriesPerServing?: number;
  proteinPerServing?: number;
  carbsPerServing?: number;
  fatPerServing?: number;
}

export interface FoodSearchResponse {
  results: FoodSearchResult[];
  page: number;
  hasMore: boolean;
  offline?: boolean;
}


interface PsDb {
  getAll<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

interface PersonalFoodRow {
  id: string;
  food_name: string;
  brand_name: string | null;
  serving_size_amount: number | null;
  serving_size_unit: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  saturated_fat: number | null;
  trans_fat: number | null;
  cholesterol: number | null;
  sodium: number | null;
  dietary_fiber: number | null;
  total_sugar: number | null;
  added_sugar: number | null;
  fatsecret_id: string | null;
  barcode: string | null;
}

function mapPersonalFoodToFoodDetails(row: PersonalFoodRow): FoodDetails {
  const servingDesc = row.serving_size_amount != null
    ? `${row.serving_size_amount}${row.serving_size_unit ?? ''}`
    : '1 serving';
  return {
    id: `personal:${row.id}`,
    name: row.food_name,
    brand_name: row.brand_name ?? undefined,
    servings: [{
      serving_id: row.id,
      serving_description: servingDesc,
      calories: row.calories ?? undefined,
      protein: row.protein ?? undefined,
      carbs: row.carbs ?? undefined,
      fat: row.fat ?? undefined,
      saturated_fat: row.saturated_fat ?? undefined,
      trans_fat: row.trans_fat ?? undefined,
      cholesterol: row.cholesterol ?? undefined,
      sodium: row.sodium ?? undefined,
      fiber: row.dietary_fiber ?? undefined,
      sugar: row.total_sugar ?? undefined,
      added_sugar: row.added_sugar ?? undefined,
    }],
  };
}

function mapPublicFoodToFoodDetails(food: PublicFood): FoodDetails {
  const servingDesc = food.serving_size_amount != null
    ? `${food.serving_size_amount}${food.serving_size_unit ?? ''}`
    : '1 serving';
  return {
    id: `public:${food.id}`,
    name: food.food_name,
    brand_name: food.brand_name ?? undefined,
    servings: [{
      serving_id: food.id,
      serving_description: servingDesc,
      calories: food.calories ?? undefined,
      protein: food.protein ?? undefined,
      carbs: food.carbs ?? undefined,
      fat: food.fat ?? undefined,
    }],
  };
}

function mapPersonalFoodToSearchResult(row: PersonalFoodRow): FoodSearchResult {
  return {
    id: `personal:${row.id}`,
    name: row.food_name,
    brand_name: row.brand_name ?? undefined,
    caloriesPer100g: row.calories ?? 0,
    proteinPer100g: row.protein ?? 0,
    carbsPer100g: row.carbs ?? 0,
    fatPer100g: row.fat ?? 0,
    servingDescription: row.serving_size_amount != null
      ? `${row.serving_size_amount}${row.serving_size_unit ?? ''}`
      : undefined,
    caloriesPerServing: row.calories ?? undefined,
    proteinPerServing: row.protein ?? undefined,
    carbsPerServing: row.carbs ?? undefined,
    fatPerServing: row.fat ?? undefined,
  };
}

function mapPublicFoodToSearchResult(food: PublicFood): FoodSearchResult {
  return {
    id: `public:${food.id}`,
    name: food.food_name,
    brand_name: food.brand_name ?? undefined,
    caloriesPer100g: food.calories ?? 0,
    proteinPer100g: food.protein ?? 0,
    carbsPer100g: food.carbs ?? 0,
    fatPer100g: food.fat ?? 0,
    servingDescription: food.serving_size_amount != null
      ? `${food.serving_size_amount}${food.serving_size_unit ?? ''}`
      : undefined,
    caloriesPerServing: food.calories ?? undefined,
    proteinPerServing: food.protein ?? undefined,
    carbsPerServing: food.carbs ?? undefined,
    fatPerServing: food.fat ?? undefined,
  };
}

export async function lookupIngredient(query: string, page = 1, db?: PsDb): Promise<FoodSearchResponse> {
  const cacheKey = `fatsecret:search:${query.toLowerCase().trim()}:p${page}`;

  // Steps 1 & 2 only on page 1 — local sources don't paginate
  let personalResults: FoodSearchResult[] = [];
  let communityResults: FoodSearchResult[] = [];

  if (page === 1 && db) {
    const personalRows = await db.getAll<PersonalFoodRow>(
      'SELECT * FROM personal_foods WHERE food_name LIKE ? OR brand_name LIKE ? ORDER BY food_name LIMIT 20',
      [`%${query}%`, `%${query}%`],
    );
    personalResults = personalRows.map(mapPersonalFoodToSearchResult);
  }

  if (page === 1) {
    const communityFoods = await searchPublicFoods(query);
    const personalIds = new Set(personalResults.map((r) => r.id));
    communityResults = communityFoods
      .filter((f) => !personalIds.has(`personal:${f.id}`))
      .map(mapPublicFoodToSearchResult);
  }

  const cached = await getCachedIfFresh<FoodSearchResponse>('cached_foods', cacheKey);
  if (cached) {
    return {
      ...cached,
      results: [...personalResults, ...communityResults, ...cached.results.filter((r: FoodSearchResult) => !communityResults.some((c) => c.id === `public:${r.id}`))],
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke<FoodSearchResponse>(
      'search-food',
      { body: { query: query.trim(), page } }
    );

    if (error || !data) throw new Error('Food search failed');

    await setCached('cached_foods', cacheKey, data);

    const communityFsIds = new Set(communityResults.map((r) => r.id.replace('public:', '')));
    const filteredFs = data.results.filter((r) => !communityFsIds.has(r.id));
    return {
      ...data,
      results: [...personalResults, ...communityResults, ...filteredFs],
    };
  } catch {
    const stale = await getCached<FoodSearchResponse>('cached_foods', cacheKey);
    if (stale) {
      const communityFsIds = new Set(communityResults.map((r) => r.id.replace('public:', '')));
      return {
        ...stale,
        offline: true,
        results: [...personalResults, ...communityResults, ...stale.results.filter((r: FoodSearchResult) => !communityFsIds.has(r.id))],
      };
    }
    return { results: [...personalResults, ...communityResults], page, hasMore: false, offline: true };
  }
}

export async function lookupBarcode(barcode: string, db?: PsDb): Promise<FoodDetails | null> {
  // Step 1: personal food local DB
  if (db) {
    const rows = await db.getAll<PersonalFoodRow>(
      'SELECT * FROM personal_foods WHERE barcode = ? LIMIT 1',
      [barcode],
    );
    if (rows.length > 0) return mapPersonalFoodToFoodDetails(rows[0]);
  }

  // Step 2: community food barcode cache
  const communityFood = await lookupPublicFoodByBarcode(barcode);
  if (communityFood) return mapPublicFoodToFoodDetails(communityFood);

  // Step 3: local SQLite cache
  const cacheKey = `fatsecret:barcode:${barcode}`;
  const cached = await getCachedIfFresh<FoodDetails>('cached_foods', cacheKey);
  if (cached) return cached;

  // Step 4: FatSecret network call
  let invokeResult: { data: FoodDetails | null; error: unknown };
  try {
    invokeResult = await Promise.race([
      supabase.functions.invoke<FoodDetails>('search-food', { body: { barcode } }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
    ]);
  } catch (e) {
    console.log('[lookupBarcode] invoke failed or timed out:', e);
    return getCached<FoodDetails>('cached_foods', cacheKey);
  }
  const { data, error } = invokeResult;

  if (error || !data) return getCached<FoodDetails>('cached_foods', cacheKey);

  await setCached('cached_foods', cacheKey, data);
  cachePublicFood({
    food_name: data.name,
    brand_name: data.brand_name,
    calories: data.servings[0]?.calories,
    protein: data.servings[0]?.protein,
    carbs: data.servings[0]?.carbs,
    fat: data.servings[0]?.fat,
    saturated_fat: data.servings[0]?.saturated_fat,
    trans_fat: data.servings[0]?.trans_fat,
    cholesterol: data.servings[0]?.cholesterol,
    sodium: data.servings[0]?.sodium,
    dietary_fiber: data.servings[0]?.fiber,
    total_sugar: data.servings[0]?.sugar,
    added_sugar: data.servings[0]?.added_sugar,
    fatsecret_id: data.id,
    barcode,
    source: 'fatsecret',
  });
  return data;
}

export async function getFoodDetails(foodId: string): Promise<FoodDetails | null> {
  const cacheKey = `fatsecret:food:${foodId}`;
  const cached = await getCachedIfFresh<FoodDetails>('cached_foods', cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase.functions.invoke<FoodDetails>(
      'search-food',
      { body: { food_id: foodId } }
    );

    if (error || !data) return null;

    await setCached('cached_foods', cacheKey, data);
    return data;
  } catch {
    return getCached<FoodDetails>('cached_foods', cacheKey);
  }
}

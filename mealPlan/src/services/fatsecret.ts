'use client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';

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
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry<T> { data: T; cachedAt: number }

async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch {}
}

export async function lookupIngredient(query: string, page = 1): Promise<FoodSearchResponse> {
  const cacheKey = `fatsecret:search:${query.toLowerCase().trim()}:p${page}`;
  const cached = await getFromCache<FoodSearchResponse>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase.functions.invoke<FoodSearchResponse>(
    'search-food',
    { body: { query: query.trim(), page } }
  );

  if (error || !data) throw new Error('Food search failed');

  await setCache(cacheKey, data);
  return data;
}

export async function lookupBarcode(barcode: string): Promise<FoodDetails | null> {
  const cacheKey = `fatsecret:barcode:${barcode}`;
  const cached = await getFromCache<FoodDetails>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase.functions.invoke<FoodDetails>(
    'search-food',
    { body: { barcode } }
  );

  if (error || !data) return null;

  await setCache(cacheKey, data);
  return data;
}

export async function getFoodDetails(foodId: string): Promise<FoodDetails | null> {
  const cacheKey = `fatsecret:food:${foodId}`;
  const cached = await getFromCache<FoodDetails>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase.functions.invoke<FoodDetails>(
    'search-food',
    { body: { food_id: foodId } }
  );

  if (error || !data) return null;

  await setCache(cacheKey, data);
  return data;
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';

export interface FoodSearchResult {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
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
  const cacheKey = `fatsecret:${query.toLowerCase().trim()}:p${page}`;
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

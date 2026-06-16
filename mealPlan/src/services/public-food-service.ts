import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const SEARCH_TTL_MS = 60 * 60 * 1000;
const BARCODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry<T> { data: T; cachedAt: number }

async function getFromCache<T>(key: string, ttlMs: number): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > ttlMs) return null;
    return entry.data;
  } catch { return null; }
}

async function getStaleFromCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return (JSON.parse(raw) as CacheEntry<T>).data;
  } catch { return null; }
}

async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch {}
}

export interface PublicFood {
  id: string;
  food_name: string;
  brand_name?: string | null;
  serving_size_amount?: number | null;
  serving_size_unit?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fatsecret_id?: string | null;
  barcode?: string | null;
  approved: boolean;
  trusted: boolean;
  flagged: boolean;
  submitted_by: string;
  created_at: string;
}

export interface PublicFoodPayload {
  food_name: string;
  brand_name?: string | null;
  serving_size_amount?: number | null;
  serving_size_unit?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  saturated_fat?: number | null;
  trans_fat?: number | null;
  cholesterol?: number | null;
  sodium?: number | null;
  dietary_fiber?: number | null;
  total_sugar?: number | null;
  added_sugar?: number | null;
  fatsecret_id?: string | null;
  source: 'manual' | 'fatsecret' | 'recipe';
  barcode?: string | null;
  save_to_library?: boolean;
}

// Non-blocking: stores a FatSecret food in public_foods so future searches skip the API.
// Never throws — failure must not block the user flow that triggered this.
export function cachePublicFood(payload: PublicFoodPayload): void {
  supabase.functions
    .invoke('submit-public-food', { body: payload })
    .catch(() => {});
}

// Blocking: called when the user explicitly chooses "Share publicly".
export async function sharePublicFood(payload: PublicFoodPayload): Promise<void> {
  const { error } = await supabase.functions.invoke('submit-public-food', { body: payload });
  if (error) throw error;
}

// Search approved community foods by name/brand (case-insensitive, max 30 results).
// Falls back to stale cache silently when offline.
export async function searchPublicFoods(query: string): Promise<PublicFood[]> {
  if (!query.trim()) return [];
  const key = `public_foods:search:${query.toLowerCase().trim()}`;
  const fresh = await getFromCache<PublicFood[]>(key, SEARCH_TTL_MS);
  if (fresh) return fresh;

  try {
    const safeQuery = query.trim().replace(/[(),]/g, '');
    const { data, error } = await supabase
      .from('public_foods')
      .select('id, food_name, brand_name, serving_size_amount, serving_size_unit, calories, protein, carbs, fat, fatsecret_id, barcode, approved, trusted, flagged, submitted_by, created_at')
      .eq('approved', true)
      .or(`food_name.ilike.%${safeQuery}%,brand_name.ilike.%${safeQuery}%`)
      .limit(30);
    if (error) throw error;
    const results = (data ?? []) as PublicFood[];
    await setCache(key, results);
    return results;
  } catch {
    return (await getStaleFromCache<PublicFood[]>(key)) ?? [];
  }
}

// Barcode lookup against the approved community food DB. Falls back to stale cache when offline.
export async function lookupPublicFoodByBarcode(barcode: string): Promise<PublicFood | null> {
  const key = `public_foods:barcode:${barcode}`;
  const fresh = await getFromCache<PublicFood>(key, BARCODE_TTL_MS);
  if (fresh) return fresh;

  try {
    const { data, error } = await supabase
      .from('public_foods')
      .select('id, food_name, brand_name, serving_size_amount, serving_size_unit, calories, protein, carbs, fat, fatsecret_id, barcode, approved, trusted, flagged, submitted_by, created_at')
      .eq('barcode', barcode)
      .eq('approved', true)
      .single();
    if (error || !data) return null;
    await setCache(key, data as PublicFood);
    return data as PublicFood;
  } catch {
    return getStaleFromCache<PublicFood>(key);
  }
}

// Returns all public_foods rows submitted by the current user (approved or pending).
export async function getMyPublicFoods(): Promise<PublicFood[]> {
  const { data, error } = await supabase
    .from('public_foods')
    .select('id, food_name, brand_name, serving_size_amount, serving_size_unit, calories, protein, carbs, fat, fatsecret_id, barcode, approved, trusted, flagged, submitted_by, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PublicFood[];
}

// Called from the "Flag this food" UI (7c). Returns true on success, false if already flagged.
export async function flagPublicFood(foodId: string, reason?: string): Promise<boolean> {
  const { error } = await supabase.functions.invoke('flag-food', {
    body: { food_id: foodId, reason },
  });
  if (error) {
    if ((error as { status?: number }).status === 409) return false;
    throw error;
  }
  return true;
}

// --- Moderation (Phase 7.1) ---

export interface FoodFlag {
  id: string;
  flagged_by: string;
  reason: string | null;
  resolved: boolean;
  created_at: string;
}

export interface FlaggedPublicFood extends PublicFood {
  food_flags: FoodFlag[];
}

export type ModerateAction = 'approve' | 'reject' | 'clear-flags' | 're-pend' | 'remove';

// Returns all unapproved public_foods ordered oldest-first (moderator/admin only).
export async function getPendingFoods(): Promise<PublicFood[]> {
  const { data, error } = await supabase
    .from('public_foods')
    .select('id, food_name, brand_name, serving_size_amount, serving_size_unit, calories, protein, carbs, fat, fatsecret_id, barcode, approved, trusted, flagged, submitted_by, created_at')
    .eq('approved', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PublicFood[];
}

// Returns flagged public_foods with their flags, ordered by flag_count descending (moderator/admin only).
export async function getFlaggedFoods(): Promise<FlaggedPublicFood[]> {
  const { data, error } = await supabase
    .from('public_foods')
    .select('id, food_name, brand_name, serving_size_amount, serving_size_unit, calories, protein, carbs, fat, fatsecret_id, barcode, approved, trusted, flagged, submitted_by, created_at, food_flags(id, flagged_by, reason, resolved, created_at)')
    .eq('flagged', true)
    .order('flag_count', { ascending: false });
  if (error) throw error;
  return (data ?? []) as FlaggedPublicFood[];
}

// Calls the moderate-food edge function on behalf of a moderator/admin.
export async function moderateFood(foodId: string, action: ModerateAction, notes?: string): Promise<void> {
  const { error } = await supabase.functions.invoke('moderate-food', {
    body: { food_id: foodId, action, notes },
  });
  if (error) throw error;
}

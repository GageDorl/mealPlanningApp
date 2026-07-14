import AsyncStorage from '@react-native-async-storage/async-storage'
import type { FoodSuggestion } from '@/services/food-suggestions-service'

function cacheKey(userId: string, date: string): string {
  return `food_suggestions_${userId}_${date}`
}

export async function getCachedSuggestions(userId: string, date: string): Promise<FoodSuggestion[] | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(userId, date))
    if (!raw) return null
    return JSON.parse(raw) as FoodSuggestion[]
  } catch {
    return null
  }
}

export async function cacheSuggestions(userId: string, date: string, suggestions: FoodSuggestion[]): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(userId, date), JSON.stringify(suggestions))
  } catch {
    // cache is best-effort
  }
}

export async function clearSuggestionCache(userId: string, date: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(cacheKey(userId, date))
  } catch {
    // ignore
  }
}

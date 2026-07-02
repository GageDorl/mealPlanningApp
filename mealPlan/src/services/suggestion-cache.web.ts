import type { FoodSuggestion } from '@/services/food-suggestions-service'

function cacheKey(userId: string, date: string): string {
  return `food_suggestions_${userId}_${date}`
}

export async function getCachedSuggestions(userId: string, date: string): Promise<FoodSuggestion[] | null> {
  try {
    const raw = localStorage.getItem(cacheKey(userId, date))
    if (!raw) return null
    return JSON.parse(raw) as FoodSuggestion[]
  } catch {
    return null
  }
}

export async function cacheSuggestions(userId: string, date: string, suggestions: FoodSuggestion[]): Promise<void> {
  try {
    localStorage.setItem(cacheKey(userId, date), JSON.stringify(suggestions))
  } catch {
    // cache is best-effort (can throw in private browsing)
  }
}

export async function clearSuggestionCache(userId: string, date: string): Promise<void> {
  try {
    localStorage.removeItem(cacheKey(userId, date))
  } catch {
    // ignore
  }
}

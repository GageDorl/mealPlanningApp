import { supabase } from '@/services/supabase'
import { getCachedSuggestions, cacheSuggestions } from '@/services/suggestion-cache'

export interface FoodSuggestion {
  name: string
  brand: string
  serving: string
  calories: number
  protein: number
  carbs: number
  fat: number
  reason: string
}

function dateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function fetchSuggestions(
  userId: string,
  date: Date,
  refreshPrompt?: string
): Promise<FoodSuggestion[]> {
  const dateStr = dateString(date)

  if (!refreshPrompt) {
    const cached = await getCachedSuggestions(userId, dateStr)
    if (cached) return cached
  }

  const { data, error } = await supabase.functions.invoke<{ suggestions: FoodSuggestion[] }>(
    'suggest-foods',
    { body: { date: dateStr, ...(refreshPrompt ? { refresh_prompt: refreshPrompt } : {}) } }
  )

  if (error || !data?.suggestions?.length) {
    throw new Error(error?.message ?? 'No suggestions returned')
  }

  await cacheSuggestions(userId, dateStr, data.suggestions)
  return data.suggestions
}

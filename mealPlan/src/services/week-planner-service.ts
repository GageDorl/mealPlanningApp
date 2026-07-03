import { supabase } from '@/services/supabase'
import env from '@/constants/env'

export interface WeeklyBudget {
  mode: 'general' | 'specific'
  tier?: 'none' | 'budget' | 'splurge'
  weekly_amount?: number
}

export interface WeeklyQuestionnaire {
  days_cooking: number
  meals_per_day: number
  cook_time: 'quick' | 'moderate' | 'any'
  prep_style: 'fresh' | 'batch'
  budget: WeeklyBudget
  notes: string
}

export interface WeeklyMealItem {
  name: string
  type: 'cook' | 'buy'
  restaurant: boolean
  estimated_macros: { calories: number; protein: number; carbs: number; fat: number }
  estimated_cost: number
}

export interface WeeklyMealSuggestion {
  day: number
  meal_label: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
  items: WeeklyMealItem[]
  reason: string
}

export interface PantryItemInput {
  name: string
  quantity: number | null
  unit: string | null
}

// supabase.functions.invoke() shares the client's global fetch, which has a hard 15s
// AbortController timeout (see fetchWithTimeout in services/supabase.ts) — reasonable for
// normal queries, but this call legitimately takes longer. Bypass it with our own fetch and
// a much longer timeout rather than widening the 15s limit for every other Supabase request.
const SUGGESTIONS_TIMEOUT_MS = 90_000

export async function fetchWeeklySuggestions(
  questionnaire: WeeklyQuestionnaire,
  pantryItems: PantryItemInput[] = [],
): Promise<WeeklyMealSuggestion[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SUGGESTIONS_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${env.SUPABASE_URL}/functions/v1/suggest-weekly-meals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: env.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ questionnaire, pantry_items: pantryItems }),
      signal: controller.signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('Timed out waiting for suggestions. Please try again.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }

  const data = await response.json().catch(() => null) as { suggestions?: WeeklyMealSuggestion[]; error?: string } | null

  if (!response.ok || !data?.suggestions?.length) {
    throw new Error(data?.error ?? 'No suggestions returned')
  }

  return data.suggestions
}

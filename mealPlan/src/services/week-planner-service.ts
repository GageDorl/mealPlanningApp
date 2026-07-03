import { supabase } from '@/services/supabase'

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
  estimated_macros: { calories: number; protein: number; carbs: number; fat: number }
  estimated_cost: number
}

export interface WeeklyMealSuggestion {
  day: number
  meal_label: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
  items: WeeklyMealItem[]
  reason: string
}

export async function fetchWeeklySuggestions(questionnaire: WeeklyQuestionnaire): Promise<WeeklyMealSuggestion[]> {
  const { data, error } = await supabase.functions.invoke<{ suggestions: WeeklyMealSuggestion[] }>(
    'suggest-weekly-meals',
    { body: { questionnaire } }
  )

  if (error || !data?.suggestions?.length) {
    throw new Error(error?.message ?? 'No suggestions returned')
  }

  return data.suggestions
}

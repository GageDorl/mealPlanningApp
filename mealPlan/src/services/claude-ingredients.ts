import { supabase } from '@/services/supabase'
import { parseIngredientString } from '@/utils/ingredient-parser'
import type { RecipeIngredientInput } from '@/services/recipe-service'

export interface AIParsedIngredient {
  rawText: string
  name: string
  quantity?: number
  unit?: string
  notes?: string
}

export interface AIPantryResult {
  groceryIndex: number
  covered: boolean
  deficit?: number
  deficitUnit?: string
  note?: string
}

export interface GroceryItemForPantryCheck {
  name: string
  quantity: number | null
  unit: string | null
}

export interface PantryItemForCheck {
  name: string
  quantity: number | null
  unit: string | null
}

export interface AIGroceryItem {
  name: string
  quantity: number
  unit: string
  category: string
  deficitNote?: string
}

/**
 * Parses raw ingredient strings using Claude Haiku.
 * Handles edge cases the regex parser misses: "a handful of parsley", "1 (14oz) can tomatoes", ranges, etc.
 * Falls back to the local regex parser if the edge function fails.
 */
export async function parseIngredientsWithAI(rawStrings: string[]): Promise<RecipeIngredientInput[]> {
  if (rawStrings.length === 0) return []

  try {
    const { data, error } = await supabase.functions.invoke<{ parsed: AIParsedIngredient[] }>(
      'parse-ingredients',
      { body: { ingredients: rawStrings } }
    )

    if (error || !data?.parsed?.length) throw new Error(error?.message ?? 'Empty response')

    return data.parsed.map((p, idx) => ({
      raw_text: p.rawText,
      name: p.name,
      quantity: p.quantity ?? undefined,
      unit: p.unit ?? undefined,
      display_order: idx,
    }))
  } catch (err) {
    console.warn('[claude-ingredients] parse-ingredients failed, using local parser:', err)
    return rawStrings.map((raw, idx) => {
      const parsed = parseIngredientString(raw)
      return {
        raw_text: raw,
        name: parsed.name,
        quantity: parsed.quantity ?? undefined,
        unit: parsed.unit || undefined,
        display_order: idx,
      }
    })
  }
}

/**
 * Generates a consolidated grocery list using Claude Haiku.
 * Handles duplicate ingredients across different units, pantry filtering, and categorization
 * in a single API call. Falls back to an empty array (caller uses legacy aggregator).
 */
export async function generateGroceryListWithAI(
  ingredients: Array<{ name: string; quantity: number | null; unit: string | null }>,
  pantryItems: PantryItemForCheck[]
): Promise<AIGroceryItem[]> {
  if (ingredients.length === 0) return []

  try {
    const { data, error } = await supabase.functions.invoke<{ items: AIGroceryItem[] }>(
      'generate-grocery-list',
      { body: { ingredients, pantryItems } }
    )

    if (error || !data?.items) throw new Error(error?.message ?? 'Empty response')
    return data.items
  } catch (err) {
    console.warn('[claude-ingredients] generate-grocery-list failed:', err)
    return []
  }
}

/**
 * Checks which grocery items are covered by pantry using Claude Haiku.
 * Handles fuzzy name matching ("garlic" vs "garlic cloves") and unit conversions (cups vs ml).
 * Falls back to returning all items as uncovered if the edge function fails.
 */
export async function checkPantryWithAI(
  groceryItems: GroceryItemForPantryCheck[],
  pantryItems: PantryItemForCheck[]
): Promise<AIPantryResult[]> {
  if (groceryItems.length === 0) return []
  if (pantryItems.length === 0) {
    return groceryItems.map((_, i) => ({ groceryIndex: i, covered: false }))
  }

  try {
    const { data, error } = await supabase.functions.invoke<{ results: AIPantryResult[] }>(
      'pantry-check',
      { body: { groceryItems, pantryItems } }
    )

    if (error || !data?.results) throw new Error(error?.message ?? 'Empty response')

    return data.results
  } catch (err) {
    console.warn('[claude-ingredients] pantry-check failed, skipping pantry filter:', err)
    // Safe fallback: return everything as not covered (include all items in grocery list)
    return groceryItems.map((_, i) => ({ groceryIndex: i, covered: false }))
  }
}

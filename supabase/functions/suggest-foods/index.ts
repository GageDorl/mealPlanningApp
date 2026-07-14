import { createClient } from 'jsr:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

interface FoodSuggestion {
  name: string
  brand: string
  serving: string
  calories: number
  protein: number
  carbs: number
  fat: number
  reason: string
}

// Defined at module level so the text is identical across requests — required for cache hits
const SYSTEM_PROMPT = `You are a nutrition assistant for a meal planning app. Suggest 3–5 specific foods or snacks to help the user close their remaining macro gaps for the day.

Rules:
- Be specific: "Chobani Plain Non-Fat Greek Yogurt (150g container)" not "Greek yogurt"
- Include real brand names when relevant, or well-known dishes
- Serving sizes must be realistic (what a person would actually eat in one sitting)
- Macros in your response should reflect the suggested serving size
- Reason should be 1 sentence explaining why this food fits the user's remaining macros
- Respect dietary preferences and restrictions strictly
- Suggestions should collectively help close the macro gaps, not just one macro
- If remaining calories exceed 600, include at least one full meal suggestion (e.g. a restaurant dish, a home-cooked dinner, a fast food order) — not just snacks
- Before suggesting any specific restaurant menu item or packaged branded product, use web_search to look up its current nutritional info — calorie counts vary by preparation and menu items change. Search for e.g. "McDonald's Big Mac calories 2024" or "Chobani plain greek yogurt nutrition facts". For generic or homemade foods you know well, call suggest_foods directly.`

const WEB_SEARCH_TOOL = {
  type: 'web_search_20250305',
  name: 'web_search',
  max_uses: 3,
}

const SUGGEST_FOODS_TOOL: Anthropic.Tool = {
  name: 'suggest_foods',
  description: 'Output 3–5 specific food suggestions with macros and reasoning',
  input_schema: {
    type: 'object' as const,
    properties: {
      suggestions: {
        type: 'array',
        minItems: 3,
        maxItems: 5,
        items: {
          type: 'object',
          properties: {
            name:     { type: 'string', description: 'Specific food or dish name including brand if applicable' },
            brand:    { type: 'string', description: 'Brand name, or empty string for generic/homemade items' },
            serving:  { type: 'string', description: 'Serving size description, e.g. "1 container (150g)"' },
            calories: { type: 'number', description: 'Calories for the suggested serving' },
            protein:  { type: 'number', description: 'Protein in grams for the suggested serving' },
            carbs:    { type: 'number', description: 'Carbohydrates in grams for the suggested serving' },
            fat:      { type: 'number', description: 'Fat in grams for the suggested serving' },
            reason:   { type: 'string', description: 'One sentence explaining why this fits the remaining macros' },
          },
          required: ['name', 'brand', 'serving', 'calories', 'protein', 'carbs', 'fat', 'reason'],
        },
      },
    },
    required: ['suggestions'],
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  let date: string
  let refreshPrompt: string | undefined
  try {
    const body = await req.json()
    date = typeof body.date === 'string' ? body.date : ''
    refreshPrompt = typeof body.refresh_prompt === 'string' && body.refresh_prompt.trim() ? body.refresh_prompt.trim() : undefined
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date).getTime())) {
      return json({ error: 'Invalid date format. Expected YYYY-MM-DD.' }, 400)
    }
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  try {
    // --- Macro goals ---
    const { data: goals } = await supabase
      .from('macro_goals')
      .select('macro_name, daily_target')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const goalMap: Record<string, number> = {}
    for (const g of goals ?? []) {
      goalMap[g.macro_name] = Number(g.daily_target)
    }

    // --- Today's consumed amounts ---
    const { data: todayLogs } = await supabase
      .from('food_logs')
      .select('food_log_items(calories, protein, carbs, fat, servings_eaten)')
      .eq('user_id', user.id)
      .eq('date', date)

    const consumed = { calories: 0, protein: 0, carbs: 0, fat: 0 }
    for (const log of todayLogs ?? []) {
      for (const item of (log.food_log_items as any[]) ?? []) {
        const s = Number(item.servings_eaten) || 1
        consumed.calories += (Number(item.calories) || 0) * s
        consumed.protein  += (Number(item.protein)  || 0) * s
        consumed.carbs    += (Number(item.carbs)    || 0) * s
        consumed.fat      += (Number(item.fat)      || 0) * s
      }
    }

    const remaining = {
      calories: Math.max(0, Math.round((goalMap['calories'] ?? 0) - consumed.calories)),
      protein:  Math.max(0, Math.round((goalMap['protein']  ?? 0) - consumed.protein)),
      carbs:    Math.max(0, Math.round((goalMap['carbs']    ?? 0) - consumed.carbs)),
      fat:      Math.max(0, Math.round((goalMap['fat']      ?? 0) - consumed.fat)),
    }

    // --- 30-day food history ---
    const cutoff = new Date(date)
    cutoff.setDate(cutoff.getDate() - 30)
    const thirtyDaysAgo = cutoff.toISOString().split('T')[0]

    const sevenDaysCutoff = new Date(date)
    sevenDaysCutoff.setDate(sevenDaysCutoff.getDate() - 7)
    const sevenDaysAgo = sevenDaysCutoff.toISOString().split('T')[0]

    const { data: historyLogs } = await supabase
      .from('food_logs')
      .select('date, food_log_items(food_name, brand_name, calories, protein, carbs, fat, servings_eaten)')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgo)
      .lt('date', date)
      .order('date', { ascending: false })

    // Frequency count — last 7 days weighted 2x; macros accumulated for averaging
    const freqMap = new Map<string, { count: number; entries: number; cal: number; protein: number; carbs: number; fat: number }>()
    for (const log of historyLogs ?? []) {
      const weight = (log.date as string) >= sevenDaysAgo ? 2 : 1
      for (const item of (log.food_log_items as any[]) ?? []) {
        const key = item.food_name + (item.brand_name ? ` (${item.brand_name})` : '')
        const prev = freqMap.get(key) ?? { count: 0, entries: 0, cal: 0, protein: 0, carbs: 0, fat: 0 }
        const s = Number(item.servings_eaten) || 1
        freqMap.set(key, {
          count:   prev.count + weight,
          entries: prev.entries + 1,
          cal:     prev.cal     + Math.round((Number(item.calories) || 0) * s),
          protein: prev.protein + Math.round((Number(item.protein)  || 0) * s),
          carbs:   prev.carbs   + Math.round((Number(item.carbs)    || 0) * s),
          fat:     prev.fat     + Math.round((Number(item.fat)      || 0) * s),
        })
      }
    }
    const topFoods = [...freqMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 12)
      .map(([name, d]) => `- ${name}: ~${Math.round(d.cal / d.entries)}cal, ${Math.round(d.protein / d.entries)}g protein, ${Math.round(d.carbs / d.entries)}g carbs, ${Math.round(d.fat / d.entries)}g fat`)

    // --- Dietary preferences ---
    const { data: prefRows } = await supabase
      .from('dietary_preferences')
      .select('tag')
      .eq('user_id', user.id)
    const dietaryPrefs = (prefRows ?? []).map((r: any) => r.tag)

    // --- Build Claude prompt ---
    const historySection = topFoods.length > 0
      ? `Foods this user has logged recently (most frequent first, last 7 days weighted):\n${topFoods.join('\n')}`
      : 'No food log history — base suggestions on macro needs and dietary preferences only.'

    const refreshSection = refreshPrompt
      ? `\nThe user has a specific preference for this refresh: "${refreshPrompt}". Prioritize this above other considerations.`
      : ''

    const userMessage = `My remaining macros for today:
- Calories: ${remaining.calories} kcal
- Protein: ${remaining.protein}g
- Carbs: ${remaining.carbs}g
- Fat: ${remaining.fat}g

Dietary preferences/restrictions: ${dietaryPrefs.length > 0 ? dietaryPrefs.join(', ') : 'None'}

${historySection}${refreshSection}

Suggest 3–5 specific foods to help me meet my remaining macros.`

    const systemBlock: Anthropic.TextBlockParam & { cache_control: { type: 'ephemeral' } } = {
      type: 'text',
      text: SYSTEM_PROMPT,
      cache_control: { type: 'ephemeral' },
    }

    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }]

    let suggestions: FoodSuggestion[] | null = null
    for (let i = 0; i < 6; i++) {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: [systemBlock] as any,
        messages,
        tools: [WEB_SEARCH_TOOL, SUGGEST_FOODS_TOOL] as any,
        tool_choice: { type: 'auto' },
      })

      if (response.stop_reason === 'tool_use') {
        const suggestBlock = response.content.find(
          (b: Anthropic.ContentBlock): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'suggest_foods'
        )
        if (suggestBlock) {
          suggestions = (suggestBlock.input as { suggestions: FoodSuggestion[] }).suggestions
          break
        }
        // Another tool was called alongside suggest_foods — append and loop
        messages.push({ role: 'assistant', content: response.content as any })
        continue
      }

      // pause_turn: web search is running server-side — append and continue
      // end_turn: Claude responded in text without calling the tool — nudge it
      messages.push({ role: 'assistant', content: response.content as any })
      if (response.stop_reason === 'end_turn') {
        messages.push({ role: 'user', content: 'Now call the suggest_foods tool with your recommendations.' })
      }
    }

    if (!suggestions) throw new Error('Unexpected response format from Claude')
    return json({ suggestions })
  } catch (err) {
    console.error('[suggest-foods]', err)
    return json({ error: (err as Error).message }, 500)
  }
})

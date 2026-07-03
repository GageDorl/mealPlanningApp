import { createClient } from 'jsr:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

type CookTime = 'quick' | 'moderate' | 'any'
type PrepStyle = 'fresh' | 'batch'
type BudgetMode = 'general' | 'specific'
type BudgetTier = 'none' | 'budget' | 'splurge'

interface WeeklyBudget {
  mode: BudgetMode
  tier?: BudgetTier
  weekly_amount?: number
}

interface WeeklyQuestionnaire {
  days_cooking: number
  meals_per_day: number
  cook_time: CookTime
  prep_style: PrepStyle
  budget: WeeklyBudget
  notes: string
}

interface WeeklyMealItem {
  name: string
  type: 'cook' | 'buy'
  restaurant: boolean
  estimated_macros: { calories: number; protein: number; carbs: number; fat: number }
  estimated_cost: number
}

interface WeeklyMealSuggestion {
  day: number
  meal_label: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
  items: WeeklyMealItem[]
  reason?: string
}

// Defined at module level so the text is identical across requests — required for cache hits
const SYSTEM_PROMPT = `You are a meal planning assistant for a nutrition app. The user wants a full week of meal ideas — not just what to cook, but what to eat for every meal of every day, mixing home-cooked dishes with things they can simply buy or grab.

Rules:
- Cover all 7 days of the week. For each day, provide exactly \`meals_per_day\` meal slots.
- Choose meal slots based on meals_per_day: 1 → Dinner. 2 → Lunch, Dinner. 3 → Breakfast, Lunch, Dinner. 4 → Breakfast, Lunch, Dinner, Snack. 5 or more → Breakfast, Lunch, Dinner, Snack, Snack (repeat Snack for any beyond 5).
- Each meal slot has an \`items\` array — a real meal is often more than one item (e.g. a breakfast of a protein bar AND a protein shake, or a dinner of a cooked entree plus a side). Use 1-3 items per meal slot: use more than one when that's realistically how the meal is composed, but don't pad unnecessarily — a single dish is often enough, especially for "cook" dinners.
- The user will cook on \`days_cooking\` of the 7 days (their choice of which days is unspecified — just pick that many days to mark as cooking days). On cooking days, at least the Dinner slot should include an item of type "cook" — a specific home-cooked dish doable within the requested cook_time. On the remaining days, and for any meal slot/item that doesn't need cooking, use type "buy" — something purchased ready-to-eat or with minimal prep.
- Every item's \`name\` must be a single, specific, real product or dish — precise enough that it could be looked up by name in a nutrition database search. "cook" items are specific dish names (e.g. "Sheet-Pan Lemon Herb Chicken with Roasted Vegetables"). "buy" items must be an exact real product including brand and variant/flavor where applicable (e.g. "Quest Protein Bar - Chocolate Chip Cookie Dough", "Premier Protein Shake - Chocolate", "Chick-fil-A Grilled Chicken Sandwich") or a specific grocery item (e.g. "Rotisserie Chicken, 1/4 chicken") — never a vague category like "a protein bar" or "some fruit". Never combine two foods into one item's name — if a meal has a bar and a shake, that's two separate items.
- A "buy" item must be something the user could walk in and purchase exactly as described — a real restaurant menu item (name the restaurant) or a real packaged/prepared grocery product (name the actual product, e.g. "Costco Rotisserie Chicken", "Lean Cuisine Salmon with Basil Pesto Cream Sauce", "Trader Joe's Cauliflower Gnocchi"). Never describe a "buy" item the way you'd describe a home-cooked dish (e.g. "Baked Salmon with Quinoa and Roasted Vegetables") unless that is the literal name of a real product — if you can't name a specific real product or menu item, make it a "cook" item instead.
- Set \`restaurant\` to true only for a "buy" item that's a restaurant/fast-food menu order — something eaten there or picked up, not shopped for. Set it to false for a grocery/packaged product, and always false for "cook" items.
- If a meal slot's "buy" items are restaurant orders, every restaurant item in that same slot must come from the same restaurant — a meal is one stop. Never pair items from two different restaurants in the same meal (e.g. never a Taco Bell item alongside a McDonald's item for the same Lunch slot).
- If prep_style is "batch" (meal prep), repeat the same 2-3 "cook" dishes across the cooking days so the user can batch cook once and eat leftovers — this applies to "cook" items only.
- Repeating the same grocery/convenience "buy" item across multiple days is fine and often realistic — a packaged staple like a protein bar or a protein shake is normal to have most days, especially if the user's notes describe it as their usual routine. But a restaurant/fast-food "buy" item is different: don't have the user order the exact same restaurant item on more than 2 days in the week — vary restaurant choices instead of defaulting to the same order every time.
- Every item needs estimated_macros for a realistic single serving, and estimated_cost in whole dollars for that single serving/item (a realistic real-world price).
- Respect the user's budget guidance in their message: if they gave a specific weekly dollar amount, keep the sum of every item's estimated_cost at or under it. If they said budget-friendly, favor lower-cost options throughout. If splurge, cost is not a constraint. If no preference was given, just use realistic real-world prices.
- Respect dietary preferences and restrictions strictly.
- Use the user's recent food log history and notes to understand their real routine — if the user describes a regular staple (e.g. "I usually have a protein bar and shake for breakfast"), repeat that staple as described. Otherwise, treat their history as a taste signal (cuisines, proteins, flavors they gravitate toward) rather than a literal checklist to repeat, and favor variety — especially for restaurant/fast-food choices.
- The user's pantry contents (if given) are things they already have at home. Use them as inspiration for "cook" dishes when it makes sense, and don't suggest a "buy" item that's just a grocery-store version of something already sitting in their pantry (that would be wasteful).
- Keep each day's total estimated macros (summed across all items in all that day's meal slots) reasonably close to the user's daily macro goals.
- Only include \`reason\` when there's something non-obvious worth telling the user (e.g. it repeats their usual staple, it's tight on budget, it uses a pantry item). Keep it to a short phrase, not a sentence. Omit it entirely for ordinary meals — most meals don't need one.`

// The earlier "it failed" reports were the *client's* 15s fetch abort timeout, not Supabase's much
// larger 150s server-side one (fixed in week-planner-service.ts, which now uses its own 90s
// timeout) — so a single call for the whole week has plenty of headroom and no longer needs to be
// split into concurrent chunks. One chunk also means one call's worth of output/cost per "Get
// Suggestions" tap instead of two, and lets the model see the whole week at once for variety.
const DAY_CHUNKS: number[][] = [[1, 2, 3, 4, 5, 6, 7]]

function buildTool(maxSlots: number): Anthropic.Tool {
  return {
    name: 'suggest_weekly_meals',
    description: 'Output one meal slot per requested (day, meal) pair, each containing one or more specific food items',
    input_schema: {
      type: 'object' as const,
      properties: {
        suggestions: {
          type: 'array',
          minItems: 1,
          maxItems: maxSlots,
          items: {
            type: 'object',
            properties: {
              day:        { type: 'number', description: '1-indexed day number, 1-7' },
              meal_label: { type: 'string', enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'] },
              items: {
                type: 'array',
                minItems: 1,
                maxItems: 3,
                description: 'One or more individual food items that make up this meal — e.g. a protein bar AND a protein shake for breakfast',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'A single specific, real, nutrition-database-searchable product or dish name — never two foods combined into one name' },
                    type: { type: 'string', enum: ['cook', 'buy'], description: '"cook" for a home-cooked dish, "buy" for something purchased ready-to-eat or with minimal prep' },
                    restaurant: { type: 'boolean', description: 'true if this "buy" item is a restaurant/fast-food menu order (eaten there or picked up, not something you\'d shop for); false for a grocery/packaged product you\'d buy at a store, or for any "cook" item' },
                    estimated_macros: {
                      type: 'object',
                      properties: {
                        calories: { type: 'number' },
                        protein:  { type: 'number' },
                        carbs:    { type: 'number' },
                        fat:      { type: 'number' },
                      },
                      required: ['calories', 'protein', 'carbs', 'fat'],
                    },
                    estimated_cost: { type: 'number', description: 'Realistic price in whole dollars for this single serving/item' },
                  },
                  required: ['name', 'type', 'restaurant', 'estimated_macros', 'estimated_cost'],
                },
              },
              reason: { type: 'string', description: 'Optional short phrase (not a sentence) — only include when there is something non-obvious worth noting; omit for ordinary meals' },
            },
            required: ['day', 'meal_label', 'items'],
          },
        },
      },
      required: ['suggestions'],
    },
  }
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

  let questionnaire: WeeklyQuestionnaire
  let pantryItems: Array<{ name: string; quantity: number | null; unit: string | null }>
  try {
    const body = await req.json()
    const q = body.questionnaire ?? {}
    // Client-supplied, not queried server-side — the user may have just edited their pantry
    // in this same flow, and a Postgres read could lag behind that local-only edit until
    // PowerSync finishes syncing it up.
    pantryItems = Array.isArray(body.pantry_items)
      ? body.pantry_items
          .filter((p: any) => typeof p?.name === 'string' && p.name.trim())
          .map((p: any) => ({ name: String(p.name).trim(), quantity: Number(p.quantity) || null, unit: typeof p.unit === 'string' ? p.unit : null }))
      : []
    const daysCooking = Number(q.days_cooking)
    const mealsPerDay = Number(q.meals_per_day)
    const cookTime = q.cook_time
    const prepStyle = q.prep_style
    if (!Number.isInteger(daysCooking) || daysCooking < 0 || daysCooking > 7) {
      return json({ error: 'days_cooking must be an integer between 0 and 7' }, 400)
    }
    if (!Number.isInteger(mealsPerDay) || mealsPerDay < 1 || mealsPerDay > 6) {
      return json({ error: 'meals_per_day must be an integer between 1 and 6' }, 400)
    }
    if (!['quick', 'moderate', 'any'].includes(cookTime)) {
      return json({ error: 'Invalid cook_time' }, 400)
    }
    if (!['fresh', 'batch'].includes(prepStyle)) {
      return json({ error: 'Invalid prep_style' }, 400)
    }

    const rawBudget = q.budget ?? {}
    const budgetMode: BudgetMode = rawBudget.mode === 'specific' ? 'specific' : 'general'
    const budget: WeeklyBudget = budgetMode === 'specific'
      ? { mode: 'specific', weekly_amount: Number(rawBudget.weekly_amount) > 0 ? Number(rawBudget.weekly_amount) : undefined }
      : { mode: 'general', tier: (['none', 'budget', 'splurge'] as BudgetTier[]).includes(rawBudget.tier) ? rawBudget.tier : 'none' }

    questionnaire = {
      days_cooking: daysCooking,
      meals_per_day: mealsPerDay,
      cook_time: cookTime,
      prep_style: prepStyle,
      budget,
      notes: typeof q.notes === 'string' ? q.notes.slice(0, 200) : '',
    }
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  try {
    // --- Daily macro goals ---
    const { data: goals } = await supabase
      .from('macro_goals')
      .select('macro_name, daily_target')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const goalMap: Record<string, number> = {}
    for (const g of goals ?? []) {
      goalMap[g.macro_name] = Number(g.daily_target)
    }

    // --- 30-day food history ---
    const today = new Date().toISOString().split('T')[0]
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const thirtyDaysAgo = cutoff.toISOString().split('T')[0]

    const sevenDaysCutoff = new Date()
    sevenDaysCutoff.setDate(sevenDaysCutoff.getDate() - 7)
    const sevenDaysAgo = sevenDaysCutoff.toISOString().split('T')[0]

    const { data: historyLogs } = await supabase
      .from('food_logs')
      .select('date, food_log_items(food_name, brand_name, calories, protein, carbs, fat, servings_eaten)')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgo)
      .lt('date', today)
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
    const sortedFoods = [...freqMap.entries()].sort((a, b) => b[1].count - a[1].count)
    const topFoods = sortedFoods
      .slice(0, 12)
      .map(([name, d]) => `- ${name}: ~${Math.round(d.cal / d.entries)}cal, ${Math.round(d.protein / d.entries)}g protein, ${Math.round(d.carbs / d.entries)}g carbs, ${Math.round(d.fat / d.entries)}g fat`)
    const topMeals = sortedFoods.slice(0, 10).map(([name]) => name)

    // --- Dietary preferences ---
    const { data: prefRows } = await supabase
      .from('dietary_preferences')
      .select('tag')
      .eq('user_id', user.id)
    const dietaryPrefs = (prefRows ?? []).map((r: any) => r.tag)

    // --- Pantry staples (client-supplied — see parsing above) ---
    const pantryLines = pantryItems.map((p) => p.quantity ? `${p.name} (${p.quantity}${p.unit ? ' ' + p.unit : ''})` : p.name)
    const pantrySection = pantryLines.length > 0
      ? `Things I already have at home: ${pantryLines.join(', ')}`
      : "I haven't listed any pantry items."

    // --- Build Claude prompt ---
    const historySection = topFoods.length > 0
      ? `Foods I've eaten recently (most frequent first, last 7 days weighted):\n${topFoods.join('\n')}`
      : 'No food log history yet — base suggestions on macro goals and dietary preferences only.'

    const cookTimeLabel = questionnaire.cook_time === 'quick' ? 'Quick (under 30 min)' : questionnaire.cook_time === 'moderate' ? 'Moderate (30-60 min)' : 'No preference'
    const prepStyleLabel = questionnaire.prep_style === 'batch' ? 'Meal prep — batch cook once and eat leftovers' : 'Cook fresh each day'

    const budgetLine = questionnaire.budget.mode === 'specific'
      ? questionnaire.budget.weekly_amount
        ? `Weekly food budget: about $${questionnaire.budget.weekly_amount} total for all suggestions combined.`
        : 'Budget preference: no specific preference given.'
      : questionnaire.budget.tier === 'budget'
        ? 'Budget preference: keep costs low / budget-friendly.'
        : questionnaire.budget.tier === 'splurge'
          ? 'Budget preference: splurging is fine, cost is not a major concern.'
          : 'Budget preference: no specific preference given.'

    const systemBlock: Anthropic.TextBlockParam & { cache_control: { type: 'ephemeral' } } = {
      type: 'text',
      text: SYSTEM_PROMPT,
      cache_control: { type: 'ephemeral' },
    }

    function buildUserMessage(days: number[], chunkCookingDays: number, otherDays: number[]): string {
      const otherDaysNote = otherDays.length > 0
        ? `\n\nDay(s) ${otherDays.join(', ')} are being planned in a separate request — you won't see their choices. Repeating a grocery/convenience staple (like a usual breakfast bar and shake) across your days here is still fine. But for restaurant/fast-food picks specifically, don't assume the same "safe" choice is fine every time — vary which restaurant/order you pick within ${days.join(', ')} so the week doesn't end up with the same fast-food order appearing on many days once combined with the other requests.`
        : ''

      return `I want a full week of meal ideas: ${questionnaire.meals_per_day} meal(s) per day. This request covers day(s) ${days.join(', ')} of the full 7-day week — plan only these days, numbering each suggestion's "day" field exactly as given (${days.join(', ')}), not 1-indexed relative to this chunk.${otherDaysNote}

Of these ${days.length} day(s), I'll cook on ${chunkCookingDays} of them — the rest should be "buy" suggestions (something I purchase, not cook).

Cook time preference (for "cook" suggestions): ${cookTimeLabel}
Prep style: ${prepStyleLabel}
${budgetLine}
${questionnaire.notes ? `Notes from me: "${questionnaire.notes}"` : ''}

My daily macro goals: ${goalMap['calories'] ?? 'unset'} cal, ${goalMap['protein'] ?? 'unset'}g protein, ${goalMap['carbs'] ?? 'unset'}g carbs, ${goalMap['fat'] ?? 'unset'}g fat.

Dietary preferences/restrictions: ${dietaryPrefs.length > 0 ? dietaryPrefs.join(', ') : 'None'}

${pantrySection}

${historySection}

Foods/meals I've had before (repeat routine staples if they fit; otherwise use as a taste signal, not a checklist): ${topMeals.length > 0 ? topMeals.join(', ') : 'None yet'}

Suggest ${days.length * questionnaire.meals_per_day} meals total — ${questionnaire.meals_per_day} per day, across day(s) ${days.join(', ')}.`
    }

    async function runChunk(days: number[], chunkCookingDays: number, otherDays: number[]): Promise<WeeklyMealSuggestion[]> {
      const maxSlots = days.length * questionnaire.meals_per_day
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        // One call now covers up to 7 days x 6 meals/day x 3 items (worst case ~126 items),
        // roughly double the old per-chunk ceiling — sized up accordingly.
        max_tokens: 12000,
        system: [systemBlock] as any,
        messages: [{ role: 'user', content: buildUserMessage(days, chunkCookingDays, otherDays) }],
        tools: [buildTool(maxSlots)],
        tool_choice: { type: 'tool', name: 'suggest_weekly_meals' },
      })

      const suggestBlock = response.content.find(
        (b: Anthropic.ContentBlock): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'suggest_weekly_meals'
      )
      if (!suggestBlock) throw new Error('Unexpected response format from Claude')
      return (suggestBlock.input as { suggestions: WeeklyMealSuggestion[] }).suggestions
    }

    // Distribute days_cooking proportionally across chunks so each chunk's prompt is self-consistent
    let cookingRemaining = questionnaire.days_cooking
    const chunkCookingCounts = DAY_CHUNKS.map((days, i) => {
      const isLast = i === DAY_CHUNKS.length - 1
      const share = isLast ? cookingRemaining : Math.min(cookingRemaining, Math.round(questionnaire.days_cooking * days.length / 7))
      cookingRemaining -= share
      return share
    })

    const chunkResults = await Promise.all(
      DAY_CHUNKS.map((days, i) => {
        const otherDays = DAY_CHUNKS.flatMap((d, j) => (j === i ? [] : d))
        return runChunk(days, chunkCookingCounts[i], otherDays)
      })
    )
    const suggestions = chunkResults.flat()
    return json({ suggestions })
  } catch (err) {
    console.error('[suggest-weekly-meals]', err)
    return json({ error: (err as Error).message }, 500)
  }
})

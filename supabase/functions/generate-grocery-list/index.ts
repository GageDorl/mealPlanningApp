import { createClient } from 'jsr:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

const CATEGORIES = ['produce', 'protein', 'dairy', 'grains', 'pantry', 'spices', 'frozen', 'beverages', 'other'] as const

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

  let ingredients: Array<{ name: string; quantity: number | null; unit: string | null }>
  let pantryItems: Array<{ name: string; quantity: number | null; unit: string | null }>
  try {
    const body = await req.json()
    ingredients = Array.isArray(body.ingredients) ? body.ingredients : []
    pantryItems = Array.isArray(body.pantryItems) ? body.pantryItems : []
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (ingredients.length === 0) return json({ items: [] })

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 8192,
      system: `You are a grocery list generator for a meal planning app. Given raw recipe ingredients from multiple recipes and the user's pantry, produce a clean, consolidated shopping list.

Do all four of these in one pass:

1. CONSOLIDATE duplicates — even when units differ. Use common unit conversions to sum everything into one line:
   - 1 cup ≈ 8 fl oz ≈ 240 ml | 1 lb = 16 oz ≈ 453 g | 1 kg = 1000 g
   - For COUNT produce: consolidate counts directly ("2 avocados" + "1 avocado" = 3 avocados)
   - For WEIGHT produce: convert counts to weight first, then sum (1 medium onion ≈ 8 oz | 1 medium carrot ≈ 3 oz | 1 medium tomato ≈ 5 oz | 1 medium zucchini ≈ 6 oz)
   - Fuzzy name matching: "chicken breast" and "chicken breasts" are the same item

2. USE grocery-store-friendly units and quantities:
   - Produce sold by COUNT in stores → unit "each", round up to whole number. Count produce includes: avocado, eggplant, lemon, lime, orange, grapefruit, cucumber, bell pepper, jalapeño, poblano pepper, ear of corn, artichoke, head of garlic, head of cabbage, head of lettuce, beet, turnip, acorn squash, butternut squash, kabocha squash, mango, pineapple, papaya, banana (per banana)
   - All other produce → lb (round up to nearest 0.5 lb)
   - Dairy, liquids → oz, cup, or l depending on scale
   - Dry goods (flour, sugar, rice) → cup or lb
   - Spices/herbs → tsp or tbsp
   - Never output a quantity less than 0.25 of any unit — round up (each is always a whole number ≥ 1)
   - Unit must be one of: each, cup, tbsp, tsp, oz, lb, g, kg, ml, l

3. APPLY PANTRY — exclude or reduce items already at home:
   - Pantry item with no quantity = always stocked → exclude entirely
   - Match fuzzily (same rules as consolidation)
   - Do unit conversions to compare: pantry "500 ml olive oil" covers "2 tbsp olive oil"
   - If pantry only partially covers the need, include the deficit with a note like "need X more (have Y)"
   - "to taste" or very small spice quantities are often pantry staples — if user has them, exclude

4. CATEGORIZE each item:
   - produce: fresh fruits, vegetables, herbs
   - protein: meat, poultry, fish, eggs, tofu, legumes
   - dairy: milk, cheese, butter, yogurt, cream
   - grains: bread, pasta, rice, flour, oats, cereal
   - pantry: oils, vinegars, canned goods, dry goods, condiments
   - spices: dried spices, salt, pepper, dried herbs
   - frozen: frozen vegetables, frozen meals
   - beverages: drinks, broths, stocks
   - other: anything that doesn't fit

Return only what the user needs to buy. If pantry fully covers an ingredient, omit it entirely.`,
      messages: [
        {
          role: 'user',
          content: `Recipe ingredients:\n${JSON.stringify(ingredients, null, 2)}\n\nPantry contents:\n${JSON.stringify(pantryItems.length > 0 ? pantryItems : 'empty', null, 2)}`,
        },
      ],
      tools: [
        {
          name: 'output_grocery_list',
          description: 'Output the final consolidated grocery list',
          input_schema: {
            type: 'object' as const,
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Ingredient name' },
                    quantity: { type: 'number', description: 'Amount to buy' },
                    unit: { type: 'string', description: 'Unit (each, cup, tbsp, tsp, oz, lb, g, kg, ml, l)' },
                    category: {
                      type: 'string',
                      enum: [...CATEGORIES],
                      description: 'Grocery store category',
                    },
                    deficitNote: {
                      type: 'string',
                      description: 'Note when pantry only partially covers the item',
                    },
                  },
                  required: ['name', 'quantity', 'unit', 'category'],
                },
              },
            },
            required: ['items'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'output_grocery_list' },
    })

    const toolBlock = response.content.find((b) => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      throw new Error('Unexpected response format')
    }

    return json({ items: (toolBlock.input as { items: unknown[] }).items })
  } catch (err) {
    console.error('[generate-grocery-list]', err)
    return json({ error: (err as Error).message }, 500)
  }
})

import { createClient } from 'jsr:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

interface Item {
  name: string
  quantity: number | null
  unit: string | null
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

  let groceryItems: Item[], pantryItems: Item[]
  try {
    const body = await req.json()
    groceryItems = Array.isArray(body.groceryItems) ? body.groceryItems : []
    pantryItems = Array.isArray(body.pantryItems) ? body.pantryItems : []
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (groceryItems.length === 0) return json({ results: [] })

  // If pantry is empty, everything needs to be bought
  if (pantryItems.length === 0) {
    return json({
      results: groceryItems.map((_, i) => ({ groceryIndex: i, covered: false })),
    })
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      system: `You are a pantry matching assistant for a grocery app. Determine which grocery items are already covered by the user's pantry.

Rules:
- Match by ingredient name with fuzzy logic: "garlic" covers "garlic cloves", "olive oil" covers "extra virgin olive oil"
- Perform unit conversions when necessary:
  - Volume: 1 cup = 16 tbsp = 48 tsp = 8 fl oz = 240 ml
  - Weight: 1 lb = 16 oz ≈ 453 g, 1 kg = 1000 g
  - 1 l = 1000 ml ≈ 4.2 cups
- If pantry quantity is null: treat as "always have enough" (covered=true, no deficit)
- If pantry quantity >= needed quantity (after unit conversion): covered=true
- If pantry quantity < needed quantity: covered=false, provide the deficit amount
- If units are incompatible and cannot be converted: covered=false, note the unit mismatch
- Return one result per grocery item, preserving the original 0-based index`,
      messages: [
        {
          role: 'user',
          content: `Grocery list (0-indexed):\n${JSON.stringify(groceryItems, null, 2)}\n\nPantry contents:\n${JSON.stringify(pantryItems, null, 2)}`,
        },
      ],
      tools: [
        {
          name: 'output_pantry_check',
          description: 'Output which grocery items are covered by the pantry',
          input_schema: {
            type: 'object' as const,
            properties: {
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    groceryIndex: { type: 'number', description: '0-based index into the grocery items array' },
                    covered: { type: 'boolean', description: 'True if pantry fully covers this item' },
                    deficit: { type: 'number', description: 'Amount still needed after pantry deduction' },
                    deficitUnit: { type: 'string', description: 'Unit for the deficit (uses grocery item unit after conversion)' },
                    note: { type: 'string', description: 'Brief explanation of the match decision' },
                  },
                  required: ['groceryIndex', 'covered'],
                },
              },
            },
            required: ['results'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'output_pantry_check' },
    })

    const toolBlock = response.content.find((b) => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      throw new Error('Unexpected response format')
    }

    return json({ results: (toolBlock.input as { results: unknown[] }).results })
  } catch (err) {
    console.error('[pantry-check]', err)
    return json({ error: (err as Error).message }, 500)
  }
})

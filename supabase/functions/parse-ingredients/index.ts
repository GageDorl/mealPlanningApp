import { createClient } from 'jsr:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

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

  let ingredients: string[]
  try {
    const body = await req.json()
    ingredients = Array.isArray(body.ingredients) ? (body.ingredients as unknown[]).map(String).filter(Boolean) : []
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (ingredients.length === 0) return json({ parsed: [] })

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      system: `You are an ingredient parser for a recipe app. Parse ingredient strings into structured data.

For each ingredient:
- name: canonical lowercase ingredient name without prep adjectives ("garlic" not "minced garlic", "flour" not "all-purpose flour sifted")
- quantity: ALWAYS include a number. Estimate if not given (see rules below).
- unit: MUST be one of: cup, tbsp, tsp, oz, lb, g, kg, ml, l — never use piece, whole, head, clove, slice, can, bunch, etc.
- notes: preparation method or size qualifiers (minced, large, sifted, room temperature, divided), omit if absent

Unit conversion rules (counts/pieces → measurable units):
- Proteins: "4 chicken breasts" → 1.5 lb | "2 salmon fillets" → 12 oz | "1 lb ground beef" → 1 lb
- Eggs: "2 eggs" → 4 oz | "1 egg" → 2 oz
- Vegetables by count: "1 onion" → 8 oz | "2 carrots" → 6 oz | "1 head garlic" → 2 oz | "1 head broccoli" → 12 oz
- Canned goods: "1 can tomatoes" → 14 oz | "1 can beans" → 15 oz | "1 can coconut milk" → 13.5 oz
- Bunches/stalks: "1 bunch parsley" → 2 oz | "2 stalks celery" → 4 oz | "1 bunch kale" → 6 oz

Spice/seasoning estimation (when no quantity given):
- Fine salt, black pepper → 1 tsp
- Garlic powder, onion powder, paprika, cumin, coriander → 1 tsp
- Cayenne, chili flakes, cloves, allspice → 0.25 tsp
- Dried herbs (basil, oregano, thyme, rosemary) → 1 tsp
- Fresh herbs (parsley, cilantro, basil) → 2 tbsp
- "to taste" ingredients → use the estimates above

Preserve the original order. Output exactly one entry per input string.`,
      messages: [
        {
          role: 'user',
          content: `Parse these ${ingredients.length} ingredient string${ingredients.length !== 1 ? 's' : ''}:\n${ingredients.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
        },
      ],
      tools: [
        {
          name: 'output_parsed_ingredients',
          description: 'Output structured ingredient data parsed from the raw strings',
          input_schema: {
            type: 'object' as const,
            properties: {
              ingredients: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    rawText: { type: 'string', description: 'The original ingredient string' },
                    name: { type: 'string', description: 'Canonical ingredient name' },
                    quantity: { type: 'number', description: 'Numeric quantity' },
                    unit: { type: 'string', description: 'Measurement unit' },
                    notes: { type: 'string', description: 'Preparation notes or qualifiers' },
                  },
                  required: ['rawText', 'name'],
                },
              },
            },
            required: ['ingredients'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'output_parsed_ingredients' },
    })

    const toolBlock = response.content.find((b) => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      throw new Error('Unexpected response format')
    }

    return json({ parsed: (toolBlock.input as { ingredients: unknown[] }).ingredients })
  } catch (err) {
    console.error('[parse-ingredients]', err)
    return json({ error: (err as Error).message }, 500)
  }
})

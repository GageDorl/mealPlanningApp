import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  // Verify the requesting user via their JWT
  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user } } = await anonClient.auth.getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    // Delete public user row — cascades to macro_goals, dietary_preferences,
    // calendar_connections, recipes, meal_slots, food_logs, personal_foods, etc.
    const { error: publicError } = await adminClient
      .from('users')
      .delete()
      .eq('id', user.id)

    if (publicError) throw new Error(publicError.message)

    // Delete the auth user so they cannot sign back in
    const { error: authError } = await adminClient.auth.admin.deleteUser(user.id)
    if (authError) throw new Error(authError.message)

    return json({ success: true })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})

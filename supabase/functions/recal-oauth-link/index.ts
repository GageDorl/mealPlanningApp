import { createClient } from 'jsr:@supabase/supabase-js@2'

const RECAL_API = 'https://api.recal.dev/v1'
const RECAL_KEY = Deno.env.get('RECAL_API_KEY')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function recal(path: string, options: RequestInit = {}) {
  const res = await fetch(`${RECAL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${RECAL_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok && res.status !== 404 && res.status !== 409) throw new Error(`Recal error: ${res.status}`)
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })
    }
    const userId = user.id

    const { provider = 'google', redirectUrl } = await req.json()

    // Create Recal user — idempotent, safe to call if already exists
    await recal('/users', { method: 'POST', body: JSON.stringify({ id: userId }) })

    // accessType and scope are required; redirectUrl overrides dashboard default for dev
    const params = new URLSearchParams({ accessType: 'offline', scope: 'write' })
    if (redirectUrl) params.set('redirectUrl', redirectUrl)
    const result = await recal(`/users/${userId}/oauth/${provider}/link?${params}`)

    const url = result.data?.link ?? null

    return new Response(JSON.stringify({ url }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

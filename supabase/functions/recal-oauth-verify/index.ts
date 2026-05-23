const RECAL_API = 'https://api.recal.dev/v1'
const RECAL_KEY = Deno.env.get('RECAL_API_KEY')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const { provider, code, state, scope } = await req.json()

    // Google returns scope as a space-separated string; Recal requires an array
    const scopeArray = typeof scope === 'string' ? scope.split(' ') : (scope ?? [])

    const res = await fetch(`${RECAL_API}/users/oauth/${provider}/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RECAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, state, scope: scopeArray }),
    })

    const data = await res.json()
    const success = res.ok && !data.error

    return new Response(JSON.stringify({ success }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

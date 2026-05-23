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
  if (!res.ok && res.status !== 404) throw new Error(`Recal error: ${res.status}`)
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })
  }

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

  const body = await req.json()

  try {
    if (body.action === 'getEvents') {
      const { start, end } = body
      const result = await recal(
        `/users/${userId}/calendar/events?start=${start}&end=${end}`
      )
      return new Response(JSON.stringify(result.data ?? []), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'createEvent') {
      const { title, start, end, slotId } = body
      const result = await recal(`/users/${userId}/calendar/events/meta`, {
        method: 'POST',
        body: JSON.stringify({ subject: title, start, end, description: `Meal slot: ${slotId}` }),
      })
      return new Response(JSON.stringify({ id: result.data?.id ?? null }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'deleteEvent') {
      await recal(`/users/${userId}/calendar/events/meta/${body.eventId}`, { method: 'DELETE' })
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'isConnected') {
      const result = await recal(`/users/${userId}/oauth`)
      const connections: unknown[] = result.data ?? []
      return new Response(JSON.stringify({ connected: connections.length > 0 }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'revokeConnection') {
      const { provider = 'google' } = body
      await recal(`/users/${userId}/oauth/${provider}`, { method: 'DELETE' })
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: cors,
    })
  }
})

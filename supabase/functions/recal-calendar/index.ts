import { createClient } from 'jsr:@supabase/supabase-js@2'

const GCAL = 'https://www.googleapis.com/calendar/v3'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAccessToken(userId: string, adminSupabase: ReturnType<typeof createClient>): Promise<string> {
  const { data, error } = await adminSupabase
    .from('calendar_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (error || !data) throw new Error('Calendar not connected')

  // Refresh if within 5 minutes of expiry
  if (new Date(data.expires_at).getTime() - Date.now() < 5 * 60 * 1000) {
    if (!data.refresh_token) throw new Error('No refresh token — user must reconnect calendar')
    return await refreshAccessToken(userId, data.refresh_token, adminSupabase)
  }

  return data.access_token
}

async function refreshAccessToken(
  userId: string,
  refreshToken: string,
  adminSupabase: ReturnType<typeof createClient>
): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      grant_type: 'refresh_token',
    }),
  })

  const tokens = await res.json()
  if (!res.ok || tokens.error) {
    throw new Error(tokens.error_description ?? tokens.error ?? 'Token refresh failed')
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await adminSupabase
    .from('calendar_tokens')
    .update({ access_token: tokens.access_token, expires_at: expiresAt, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  return tokens.access_token
}

async function gcal(accessToken: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`${GCAL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  if (res.status === 204) return null
  const data = await res.json()
  if (!res.ok) throw new Error(`Google Calendar API ${res.status}: ${JSON.stringify(data)}`)
  return data
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

  const adminSupabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })
  }
  const userId = user.id

  const body = await req.json()

  try {
    if (body.action === 'isConnected') {
      const { data } = await adminSupabase
        .from('calendar_tokens')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()
      return new Response(JSON.stringify({ connected: !!data }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const accessToken = await getAccessToken(userId, adminSupabase)

    if (body.action === 'getOrCreatePrepdCalendar') {
      const listRes = await gcal(accessToken, '/users/me/calendarList')
      const existing = (listRes?.items ?? []).find((c: { summary: string; id: string }) => c.summary === 'Prepd')
      if (existing) {
        return new Response(JSON.stringify({ calendarId: existing.id }), {
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      const created = await gcal(accessToken, '/calendars', {
        method: 'POST',
        body: JSON.stringify({ summary: 'Prepd' }),
      })
      // Best-effort: set a color on the calendar list entry
      await gcal(accessToken, `/users/me/calendarList/${encodeURIComponent(created.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ backgroundColor: '#FF6B35', foregroundColor: '#ffffff' }),
      }).catch(() => {})
      return new Response(JSON.stringify({ calendarId: created.id }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'getEvents') {
      const { start, end, calendarId } = body

      const parseDate = (raw: { dateTime?: string; date?: string }) => {
        if (raw?.dateTime) return new Date(raw.dateTime)
        if (raw?.date) {
          // Pin all-day events to noon UTC so local timezone offsets don't shift the date
          const [y, m, d] = raw.date.split('-').map(Number)
          return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
        }
        return new Date()
      }

      const fetchCalendarEvents = async (id: string) => {
        const params = new URLSearchParams({
          timeMin: start,
          timeMax: end,
          singleEvents: 'true',
          orderBy: 'startTime',
        })
        try {
          const result = await gcal(accessToken, `/calendars/${encodeURIComponent(id)}/events?${params}`)
          return (result?.items ?? []).map((e: any) => ({
            id: e.id,
            title: e.summary ?? '(No title)',
            startDate: parseDate(e.start),
            endDate: parseDate(e.end),
            calendarId: id,
            isAllDay: !!e.start?.date && !e.start?.dateTime,
          }))
        } catch {
          return [] // skip calendars we can't read
        }
      }

      let calendarIds: string[]
      if (calendarId) {
        calendarIds = [calendarId]
      } else {
        const listRes = await gcal(accessToken, '/users/me/calendarList')
        calendarIds = (listRes?.items ?? [])
          .filter((c: any) => c.accessRole !== 'freeBusyReader')
          .map((c: any) => c.id)
      }

      const results = await Promise.all(calendarIds.map(fetchCalendarEvents))
      const events = results.flat()
      return new Response(JSON.stringify(events), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'createEvent') {
      const { title, start, end, slotId, calendarId = 'primary' } = body
      const result = await gcal(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events`, {
        method: 'POST',
        body: JSON.stringify({
          summary: title,
          start: { dateTime: start },
          end: { dateTime: end },
          description: `Meal slot: ${slotId}`,
        }),
      })
      return new Response(JSON.stringify({ id: result?.id ?? null }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'deleteEvent') {
      const { eventId, calendarId = 'primary' } = body
      await gcal(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
        method: 'DELETE',
      })
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'revokeConnection') {
      const { data: tokenData } = await adminSupabase
        .from('calendar_tokens')
        .select('access_token')
        .eq('user_id', userId)
        .maybeSingle()

      await adminSupabase.from('calendar_tokens').delete().eq('user_id', userId)

      // Best-effort revoke with Google so the token can't be reused
      if (tokenData?.access_token) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenData.access_token)}`, {
          method: 'POST',
        }).catch(() => {})
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: cors })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

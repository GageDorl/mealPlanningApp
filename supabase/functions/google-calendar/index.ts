import { createClient } from 'jsr:@supabase/supabase-js@2'

const GCAL = 'https://www.googleapis.com/calendar/v3'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Token helpers ---

async function getAccessToken(
  userId: string,
  adminSupabase: ReturnType<typeof createClient>,
): Promise<string> {
  const { data, error } = await adminSupabase
    .from('calendar_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (error || !data) throw new Error('Calendar not connected')

  if (new Date(data.expires_at).getTime() - Date.now() < 60 * 1000) {
    if (!data.refresh_token) throw new Error('No refresh token — reconnect your calendar')
    return refreshAccessToken(userId, data.refresh_token, adminSupabase)
  }

  return data.access_token
}

async function refreshAccessToken(
  userId: string,
  refreshToken: string,
  adminSupabase: ReturnType<typeof createClient>,
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
    .update({
      access_token: tokens.access_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  return tokens.access_token
}

// --- Google Calendar API helper ---

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

// --- Date parsing ---

function parseEventDate(raw: { dateTime?: string; date?: string }): string {
  if (raw?.dateTime) return raw.dateTime
  if (raw?.date) {
    // Pin all-day events to noon UTC so timezone offsets don't shift the date
    const [y, m, d] = raw.date.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toISOString()
  }
  return new Date().toISOString()
}

// --- Main handler ---

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const adminSupabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  try {
    if (body.action === 'isConnected') {
      const { data } = await adminSupabase
        .from('calendar_tokens')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
      return json({ connected: !!data })
    }

    const accessToken = await getAccessToken(user.id, adminSupabase)

    if (body.action === 'listCalendars') {
      const res = await gcal(accessToken, '/users/me/calendarList')
      const calendars = (res?.items ?? []).map((c: any) => ({
        id: c.id,
        title: c.summary ?? c.id,
        color: c.backgroundColor ?? undefined,
      }))
      return json(calendars)
    }

    if (body.action === 'getEvents') {
      const { calendarIds, start, end } = body as {
        calendarIds?: string[]
        start: string
        end: string
      }
      if (!start || !end) return json({ error: 'start and end are required' }, 400)

      let ids: string[]
      if (Array.isArray(calendarIds) && calendarIds.length > 0) {
        ids = calendarIds
      } else {
        // Empty selection means "all calendars" — match client-side UX semantics
        const calList = await gcal(accessToken, '/users/me/calendarList')
        ids = (calList?.items ?? []).map((c: any) => c.id as string)
        if (ids.length === 0) ids = ['primary']
      }

      const fetchCalendar = async (id: string) => {
        const params = new URLSearchParams({
          timeMin: start,
          timeMax: end,
          singleEvents: 'true',
          orderBy: 'startTime',
        })
        try {
          const res = await gcal(
            accessToken,
            `/calendars/${encodeURIComponent(id)}/events?${params}`,
          )
          return (res?.items ?? []).map((e: any) => ({
            id: e.id,
            title: e.summary ?? '(No title)',
            startDate: parseEventDate(e.start),
            endDate: parseEventDate(e.end),
            calendarId: id,
            isAllDay: !!e.start?.date && !e.start?.dateTime,
            isBento: !!e.extendedProperties?.private?.bento_slot_id,
          }))
        } catch {
          return []
        }
      }

      const results = await Promise.all(ids.map(fetchCalendar))
      return json(results.flat())
    }

    if (body.action === 'ensurePrepCalendar') {
      const calList = await gcal(accessToken, '/users/me/calendarList')
      const existing = (calList?.items ?? []).find((c: any) => c.summary === 'Bento')
      if (existing) return json({ calendarId: existing.id })
      const created = await gcal(accessToken, '/calendars', {
        method: 'POST',
        body: JSON.stringify({ summary: 'Bento' }),
      })
      return json({ calendarId: created.id })
    }

    if (body.action === 'createEvent') {
      const { calendarId = 'primary', title, start, end, slotId } = body as {
        calendarId?: string
        title: string
        start: string
        end: string
        slotId: string
      }
      const res = await gcal(
        accessToken,
        `/calendars/${encodeURIComponent(calendarId as string)}/events`,
        {
          method: 'POST',
          body: JSON.stringify({
            summary: title,
            start: { dateTime: start },
            end: { dateTime: end },
            extendedProperties: {
              private: { bento_slot_id: slotId },
            },
          }),
        },
      )
      return json({ id: res?.id ?? null })
    }

    if (body.action === 'deleteEvent') {
      const { calendarId = 'primary', eventId } = body as {
        calendarId?: string
        eventId: string
      }
      await gcal(
        accessToken,
        `/calendars/${encodeURIComponent(calendarId as string)}/events/${encodeURIComponent(eventId as string)}`,
        { method: 'DELETE' },
      )
      return json({ success: true })
    }

    if (body.action === 'revokeConnection') {
      const { data: tokenData } = await adminSupabase
        .from('calendar_tokens')
        .select('access_token')
        .eq('user_id', user.id)
        .maybeSingle()

      await adminSupabase.from('calendar_tokens').delete().eq('user_id', user.id)

      if (tokenData?.access_token) {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenData.access_token)}`,
          { method: 'POST' },
        ).catch(() => {})
      }

      return json({ success: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})

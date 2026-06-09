import { createClient } from 'jsr:@supabase/supabase-js@2'
import { verifyState } from '../_shared/oauth-state.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  try {
    const { code, state, redirectUrl } = await req.json()
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!

    // Verify CSRF state and ensure it belongs to the authenticated user
    const payload = await verifyState(state, clientSecret)
    if (!payload || payload.userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Invalid or expired state' }), {
        status: 400,
        headers: cors,
      })
    }

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUrl,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()
    if (!tokenRes.ok || tokens.error) {
      throw new Error(tokens.error_description ?? tokens.error ?? 'Token exchange failed')
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Use service role to write tokens — bypasses RLS
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const upsertData: Record<string, unknown> = {
      user_id: user.id,
      access_token: tokens.access_token,
      expires_at: expiresAt,
      scopes: (tokens.scope as string ?? '').split(' ').filter(Boolean),
      updated_at: new Date().toISOString(),
    }
    // Only overwrite refresh_token if Google returned one (only on first consent)
    if (tokens.refresh_token) {
      upsertData.refresh_token = tokens.refresh_token
    }

    const { error: upsertError } = await adminSupabase
      .from('calendar_tokens')
      .upsert(upsertData, { onConflict: 'user_id' })

    if (upsertError) throw new Error(upsertError.message)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

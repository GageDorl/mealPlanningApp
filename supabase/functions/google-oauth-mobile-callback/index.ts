import { createClient } from 'jsr:@supabase/supabase-js@2'
import { verifyState } from '../_shared/oauth-state.ts'

const FUNCTION_URL = 'https://uyvsvsmspdlhbhavevuc.supabase.co/functions/v1/google-oauth-mobile-callback'
const APP_SCHEME = 'prepd://auth/calendar-callback'

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  if (oauthError || !code || !state) {
    const msg = oauthError ?? 'missing_params'
    return Response.redirect(`${APP_SCHEME}?error=${encodeURIComponent(msg)}`)
  }

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!

  try {
    const payload = await verifyState(state, clientSecret)
    if (!payload) {
      return Response.redirect(`${APP_SCHEME}?error=invalid_state`)
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: FUNCTION_URL,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()
    if (!tokenRes.ok || tokens.error) {
      throw new Error(tokens.error_description ?? tokens.error ?? 'Token exchange failed')
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const upsertData: Record<string, unknown> = {
      user_id: payload.userId,
      access_token: tokens.access_token,
      expires_at: expiresAt,
      scopes: (tokens.scope as string ?? '').split(' ').filter(Boolean),
      updated_at: new Date().toISOString(),
    }
    if (tokens.refresh_token) {
      upsertData.refresh_token = tokens.refresh_token
    }

    const { error: upsertError } = await adminSupabase
      .from('calendar_tokens')
      .upsert(upsertData, { onConflict: 'user_id' })

    if (upsertError) throw new Error(upsertError.message)

    return Response.redirect(`${APP_SCHEME}?success=true`)
  } catch (err) {
    console.error('[google-oauth-mobile-callback]', err)
    return Response.redirect(`${APP_SCHEME}?error=${encodeURIComponent((err as Error).message)}`)
  }
})

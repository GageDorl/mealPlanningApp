# Google Calendar Migration — Replace Recal with Direct API

Remove the 3 Recal Edge Functions and replace them with a direct Google OAuth + Calendar API
flow. The client-side interface in `calendar.web.ts` largely stays the same — most changes
are in the Edge Functions and a new DB table.

---

## 1. Google Cloud Console (manual, one-time)

- [x] Add `{your-domain}/auth/calendar-callback` as an authorized redirect URI in the existing OAuth client (`http://localhost:8081/auth/calendar-callback` confirmed)
- [x] Confirm `https://www.googleapis.com/auth/calendar` scope is enabled for the project
- [x] Note `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — add both as Supabase Edge Function secrets

---

## 2. Database

**New file: `supabase/migrations/20260604000000_calendar_tokens.sql`** ✓

- [x] Create table `calendar_tokens`:
  - `user_id uuid PRIMARY KEY` — FK to `auth.users`, cascade delete
  - `access_token text NOT NULL`
  - `refresh_token text` — nullable; only present after first user consent
  - `expires_at timestamptz NOT NULL`
  - `scopes text[]`
  - `created_at`, `updated_at` timestamptz
- [x] Enable RLS; policy: users can only access their own row
- [x] Note: Edge Functions use the service role key to bypass RLS when reading/writing tokens

---

## 3. New Edge Function: `google-oauth-link`

**New file: `supabase/functions/google-oauth-link/index.ts`** ✓
Replaces `recal-oauth-link`.

- [x] Require and verify Supabase auth header
- [x] Build Google OAuth authorization URL with:
  - `scope`: `openid email profile https://www.googleapis.com/auth/calendar`
  - `access_type: offline` and `prompt: consent` (forces refresh token on every connect)
  - `response_type: code`
  - `state`: JWT signed with `GOOGLE_CLIENT_SECRET` — CSRF protection with no extra DB table
  - `client_id`: from env
  - `redirect_uri`: passed in from client
- [x] Return `{ url: string }` — same response shape as `recal-oauth-link` so client change is one line
- [x] Shared HMAC state helper in `supabase/functions/_shared/oauth-state.ts`

---

## 4. New Edge Function: `google-oauth-verify`

**New file: `supabase/functions/google-oauth-verify/index.ts`** ✓
Replaces `recal-oauth-verify`.

- [x] **Require auth header** (security fix — current `recal-oauth-verify` has no auth check)
- [x] Validate `state` JWT signature to prevent CSRF
- [x] Exchange `code` for tokens via `POST https://oauth2.googleapis.com/token`:
  - Form-encoded body: `code`, `client_id`, `client_secret`, `redirect_uri`, `grant_type: authorization_code`
  - Response: `access_token`, `refresh_token`, `expires_in`, `scope`
- [x] Upsert row in `calendar_tokens` (access_token, refresh_token, expires_at = now + expires_in)
- [x] Return `{ success: boolean }`

---

## 5. Rewrite `supabase/functions/recal-calendar/index.ts`

Keep the function name — no client-side URL changes needed.

**Helper functions to write:**

- [x] `getAccessToken(userId, supabase)` — reads `calendar_tokens`, checks `expires_at` (refresh if within 5 min of expiry), returns a valid access token
- [x] `refreshAccessToken(refreshToken)` — `POST https://oauth2.googleapis.com/token` with `grant_type: refresh_token`, updates the `calendar_tokens` row, returns new access token
- [x] `googleCalendar(accessToken, path, options?)` — fetch wrapper for `https://www.googleapis.com/calendar/v3{path}` with `Authorization: Bearer` header

**Actions to rewrite (remove all Recal API calls):**

- [x] `isConnected` — query `calendar_tokens` for a row matching the user ID; return `{ connected: boolean }`
- [x] `getOrCreatePrepdCalendar`:
  - `GET /users/me/calendarList` — scan for existing calendar with summary "Prepd"
  - If not found: `POST /calendars` `{ summary: "Prepd", backgroundColor: "#FF6B35" }`
  - Return `{ calendarId: string }`
- [x] `getEvents` — `GET /calendars/{calendarId}/events?timeMin=&timeMax=&singleEvents=true&orderBy=startTime`
- [x] `createEvent` — `POST /calendars/{calendarId}/events` with title, start, end, description
- [x] `deleteEvent` — `DELETE /calendars/{calendarId}/events/{eventId}`
- [x] `revokeConnection`:
  - Delete row from `calendar_tokens`
  - `POST https://oauth2.googleapis.com/revoke?token={accessToken}` (best-effort)

---

## 6. `mealPlan/src/services/calendar.web.ts`

- [x] `connect()` — calls `google-oauth-link` with `redirectUrl`
- [x] `getOrCreatePrepdCalendar()` — calls `{ action: 'getOrCreatePrepdCalendar' }`, caches result in localStorage under `prepd_calendar_id`
- [x] `createMealEvent()` — calls `getOrCreatePrepdCalendar()` first, passes `calendarId` in `createEvent` payload
- [x] `getEvents()` — queries `primary` calendar (personal events visible in planner)
- [x] `deleteMealEvent()` — passes cached `calendarId` so deletion targets the Prepd calendar
- [x] `disconnect()` — clears both `CONNECTED_KEY` and `PREPD_CALENDAR_ID_KEY` from localStorage

---

## 7. `mealPlan/src/app/auth/calendar-callback.tsx`

- [x] Change `supabase.functions.invoke('recal-oauth-verify', ...)` → `supabase.functions.invoke('google-oauth-verify', ...)`
- [x] Update body to `{ code, state, redirectUrl }` — `scope` and `provider` params removed
- [x] Everything else (success/error handling, localStorage flag, redirect) stays the same

---

## 8. Cleanup (after everything is verified working)

- [x] Delete `supabase/functions/recal-oauth-link/index.ts`
- [x] Delete `supabase/functions/recal-oauth-verify/index.ts`
- [x] Remove `RECAL_API_KEY` from Supabase Edge Function secrets

---

## Notes & Risks

**Refresh token only on first consent**
Google only returns a `refresh_token` on the first OAuth grant, or when `prompt: consent` forces
re-consent. The `prompt: consent` param in `google-oauth-link` ensures we always get one.

**Existing connected users**
Anyone who connected via Recal has no row in `calendar_tokens` and will appear disconnected
after the migration. They'll need to reconnect once. Acceptable at current scale.

**Token storage security**
`access_token` and `refresh_token` are stored as plaintext in Supabase. For production,
consider encrypting them with `pgcrypto` using a server-side key.

**`getEvents` calendar scope**
Currently `getEvents` reads all of the user's Google calendars. After this change it can be
narrowed to just the Prepd calendar, which is cleaner but means personal events won't show
in the planner. Decide before implementing.

**`recal-oauth-verify` auth gap (existing)**
The current Recal verify function has no auth header check — anyone with a valid `code` and
`state` could call it. The new `google-oauth-verify` must require the user's Supabase token
to tie the Google tokens to the correct account.

**Edge Function secrets must be set before deploying**
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` must exist as Supabase secrets before the new
functions are deployed — they will crash at startup without them.

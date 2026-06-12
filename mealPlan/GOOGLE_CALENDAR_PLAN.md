# Google Calendar Integration Plan

## Current State

OAuth token storage is in place (`google-oauth-mobile-callback` writes to `calendar_tokens`), but all actual calendar operations call a non-existent `recal-calendar` edge function. The connect flow also calls a non-existent `google-oauth-link` function. Everything beyond token storage is currently broken.

## What Needs to Be Built

### 1. `google-oauth-link` edge function (new)
Generates the Google OAuth authorization URL to send back to the client.

- Reads `GOOGLE_CLIENT_ID` env var
- Builds the OAuth URL with scopes: `https://www.googleapis.com/auth/calendar`
- Signs a state param (reuse `_shared/oauth-state.ts` pattern from the callback function)
- Returns `{ url }` to the caller
- The mobile callback URL is already handled by `google-oauth-mobile-callback`

### 2. `google-calendar` edge function (new)
Single function with an `action` dispatch pattern (same as the old recal-calendar). Reads the user's token from `calendar_tokens`, auto-refreshes if expired, then calls Google Calendar API.

**Token helper (internal):**
- Read `calendar_tokens` row for `auth.uid()`
- If `expires_at < now + 60s` and `refresh_token` exists, POST to `https://oauth2.googleapis.com/token` with `grant_type=refresh_token`
- Update `calendar_tokens` with new `access_token` + `expires_at`
- Return the valid access token (or throw if no token / refresh fails)

**Actions:**

| Action | Google API call | Returns |
|--------|----------------|---------|
| `isConnected` | Validates token exists and is refreshable | `{ connected: boolean }` |
| `listCalendars` | `GET /calendar/v3/users/me/calendarList` | `CalendarInfo[]` |
| `getEvents` | `GET /calendar/v3/calendars/{id}/events` for each selected calendar ID | `CalendarEvent[]` merged + sorted |
| `createEvent` | `POST /calendar/v3/calendars/{id}/events` | `{ id: string }` |
| `deleteEvent` | `DELETE /calendar/v3/calendars/{id}/events/{eventId}` | void |
| `revokeConnection` | `POST https://oauth2.googleapis.com/revoke`, delete `calendar_tokens` row | void |

For `getEvents`: body should include `{ calendarIds: string[], start: string, end: string }`. If `calendarIds` is empty, use primary calendar.

### 3. `calendar.ts` + `calendar.web.ts` updates

**`getAvailableCalendars()`**
- Call `google-calendar` with `action: 'listCalendars'`
- Return `CalendarInfo[]` (id + title + color from Google)

**`getSelectedCalendarIds()`**
- Read from AsyncStorage / localStorage (key already defined: `@prepd/calendar_selected_ids`)
- Return `[]` if nothing stored (user gets all calendars)

**`setSelectedCalendarIds(ids)`**
- Save to AsyncStorage / localStorage

**`getEvents(start, end)`**
- Read selected IDs from storage
- Pass them to `google-calendar` `getEvents` action

**`connect()`**
- Call `google-oauth-link` to get auth URL (replaces the non-existent call)

Both `calendar.ts` and `calendar.web.ts` need the same implementation — consider whether to merge them into one file since both now use the same edge-function-based approach (neither uses `expo-calendar`).

### 4. `CalendarInfo` type update

Add `color?: string` to `CalendarInfo` in `calendar.types.ts` so the picker can render each calendar with its Google color.

### 5. Calendar picker UI (already exists, just needs real data)

The picker component and the `availableCalendars.length > 1` guards in `calendar-connect.tsx` and `calendar.tsx` already exist. Once `listCalendars` returns real data, the picker becomes functional with no UI changes needed.

## Key Constraints

- Use `adminClient` (service role) inside the edge function to read/write `calendar_tokens` — RLS would block the user-scoped client from reading its own token server-side
- Google Calendar API base URL: `https://www.googleapis.com/calendar/v3`
- Token refresh endpoint: `https://oauth2.googleapis.com/token`
- Revoke endpoint: `https://oauth2.googleapis.com/revoke?token={access_token}`
- Required scope for read + write: `https://www.googleapis.com/auth/calendar`
- Read-only scope if we want lighter permissions: `https://www.googleapis.com/auth/calendar.readonly` (but createEvent needs write)

## Implementation Order

1. `google-oauth-link` (unblocks the connect flow)
2. Token helper + `isConnected` action in `google-calendar` (unblocks `restoreSession`)
3. `listCalendars` + update `getAvailableCalendars()` (unblocks calendar picker)
4. `getEvents` + update `getEvents()` (unblocks in-app calendar display)
5. `createEvent` + `deleteEvent` + `revokeConnection` (completes full feature)
6. Merge `calendar.ts` and `calendar.web.ts` if appropriate

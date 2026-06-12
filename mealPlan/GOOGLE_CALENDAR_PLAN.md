# Google Calendar Integration Plan

## Current State

OAuth token storage is working (`google-oauth-link` + `google-oauth-mobile-callback` write to `calendar_tokens`). The `recal-calendar` edge function calls Google's API directly but is a leftover from the old Recal proxy era — it will be deleted and replaced with a clean `google-calendar` function. `calendar.web.ts` stubs out `getAvailableCalendars`, `getSelectedCalendarIds`, and `setSelectedCalendarIds` with empty returns. Google events load after app events are already visible, causing a jarring two-phase render.

## Goals

- Replace `recal-calendar` with a clean `google-calendar` edge function
- Merge `calendar.ts` + `calendar.web.ts` into a single file (both platforms use the edge function)
- Cache Google events per-week in AsyncStorage so they show instantly on load; refresh in background and diff-update
- Let users choose which Google Calendars to display — selector in Settings + quick toggle on the calendar screen
- Read Google events onto the grid; export Prepd meal slots to Google Calendar; no editing non-Prepd events

---

## Phase 1 — New `google-calendar` Edge Function

Delete `supabase/functions/recal-calendar/` entirely and write a fresh `supabase/functions/google-calendar/index.ts`.

- [x] Delete `supabase/functions/recal-calendar/index.ts`
- [x] Create `supabase/functions/google-calendar/index.ts`
  - [x] Token helper: read `calendar_tokens` row via admin client; if `expires_at < now + 60s` POST to `https://oauth2.googleapis.com/token` with `grant_type=refresh_token`; update row with new token + expiry; return valid access token (throw if missing or refresh fails)
  - [x] `isConnected` action — query `calendar_tokens` for the user; return `{ connected: boolean }`
  - [x] `listCalendars` action — `GET /calendar/v3/users/me/calendarList`; return `{ id, title, color }[]` (map `backgroundColor` from Google response to `color`)
  - [x] `getEvents` action — accepts `{ calendarIds: string[], start: string, end: string }`; if `calendarIds` is empty use `['primary']`; fetch each calendar in parallel; merge + return flat `CalendarEvent[]`
  - [x] `createEvent` action — accepts `{ calendarId, title, start, end, slotId }`; `POST /calendar/v3/calendars/{calendarId}/events`; include `extendedProperties.private.prepd_slot_id` so Prepd events are identifiable; return `{ id }`
  - [x] `deleteEvent` action — `DELETE /calendar/v3/calendars/{calendarId}/events/{eventId}`
  - [x] `revokeConnection` action — `POST https://oauth2.googleapis.com/revoke?token={access_token}`; delete `calendar_tokens` row
  - [x] CORS headers on all responses; 401 for missing auth; 400 for unknown action

---

## Phase 2 — Merge Calendar Service + Caching Layer

Delete `calendar.web.ts` and rewrite `calendar.ts` as the single implementation for both platforms.

- [x] Delete `mealPlan/src/services/calendar.web.ts`
- [x] Add `color?: string` to `CalendarInfo` in `calendar.types.ts`
- [x] Rewrite `mealPlan/src/services/calendar.ts`
  - [x] `callFunction(name, body)` helper — calls `supabase.functions.invoke`, throws on error with message from response body
  - [x] `isConnected()` — synchronous in-memory flag; set by `restoreSession` / `connect` / `disconnect`
  - [x] `restoreSession()` — reads AsyncStorage flag (fast path); on web checks API if not stored (handles post-OAuth redirect)
  - [x] `connect()` — calls `google-oauth-link` to get auth URL; redirects (web) or opens browser (native via `expo-web-browser`)
  - [x] `disconnect()` — calls `google-calendar` `revokeConnection`; clears all AsyncStorage cache keys
  - [x] `getAvailableCalendars()` — calls `google-calendar` `listCalendars`; returns `CalendarInfo[]`
  - [x] `getSelectedCalendarIds()` — reads `@prepd/calendar_selected_ids` from AsyncStorage; returns `string[]` (empty = show all)
  - [x] `setSelectedCalendarIds(ids)` — writes `@prepd/calendar_selected_ids` to AsyncStorage
  - [x] `getCalendarExportEnabled()` — reads from AsyncStorage
  - [x] `setCalendarExportEnabled(enabled)` — writes to AsyncStorage
  - [x] `getCachedEvents(weekStart)` — reads `prepd_gcal_{weekStart}` from AsyncStorage; deserializes Dates; returns `CachedEventData | null`
  - [x] `setCachedEvents(weekStart, events)` — writes `{ events, fetchedAt: Date.now() }` to AsyncStorage
  - [x] `getEvents(start, end)` — calls `google-calendar` `getEvents` with selected calendar IDs; maps response to `CalendarEvent[]` with proper Date objects
  - [x] `createMealEvent(input)` — calls `google-calendar` `createEvent`; returns event ID or null
  - [x] `deleteMealEvent(eventId, calendarId?)` — calls `google-calendar` `deleteEvent`

---

## Phase 3 — Update `use-calendar.ts` (Two-Phase Loading)

- [x] On mount:
  - [x] `restoreSession()` fast-paths from AsyncStorage; on success sets connected and fires `loadCalendarMeta()` without awaiting
- [x] Background refresh:
  - [x] `loadEvents` derives `weekStart` from `start`, reads cache → sets events immediately, then fires background `getEvents`
  - [x] Sequence counter (`refreshSeqRef`) discards stale responses when week changes mid-fetch
  - [x] On success: updates events state + writes new cache (fire and forget)
  - [x] On error: sets `loadError`; keeps cached events visible
- [x] On week change: served from cache immediately via `loadEvents`; background refresh follows
- [x] Expose `googleEventsRefreshing: boolean`
- [x] Removed `loading` state — `calendar.tsx` updated to use `googleEventsRefreshing` throughout
- [x] `deleteMealEvent` updated to accept optional `calendarId`

---

## Phase 4 — Calendar Picker UI

### 4a — Settings screen

- [x] Update `src/app/(tabs)/profile/index.tsx`
  - [x] Renamed section to "Google Calendar"
  - [x] When connected: export toggle + inline `CalendarPickerList` + Disconnect button
  - [x] When not connected: Connect button + error text
- [x] Create `src/components/calendar/calendar-picker-list.tsx`
  - [x] Receives `calendars`, `selectedIds`, `onToggle`, `loading` as props
  - [x] Renders each calendar with color dot, name, checkbox
  - [x] Empty `selectedIds` treated as "all selected" — toggling off stores all other IDs
  - [x] Shows spinner while `loading` is true

### 4b — Calendar screen quick toggle

- [x] Connected badge `connectedTitleRow` is always a `Pressable` that opens `CalendarPickerModal`
  - [x] Shows `connectedCalendarTitle` ("All calendars" / "N calendars" / calendar name)
  - [x] Shows `▾` chevron when not refreshing
  - [x] Removed `availableCalendars.length > 1` guard — picker always accessible when connected

---

## Phase 5 — Wiring & Cleanup

- [x] Update `src/app/(tabs)/calendar.tsx`
  - [x] `loading` state removed; `googleEventsRefreshing` wired to connected badge (done Phase 3)
  - [x] `createMealEvent` / `deleteMealEvent` calls verified — use new `google-calendar` function via the merged service
- [x] `EventDetailModal` updated — shows "Prepd meal" badge for `isPrepd` events; modal is read-only for all Google events (no edit actions)
- [x] Deploy `google-calendar` edge function — deployed to project `uyvsvsmspdlhbhavevuc`
- [x] Delete `recal-calendar` from Supabase — confirmed deleted
- [ ] Verify the OAuth connect + callback flow end-to-end (web redirect → `auth/calendar-callback` → `restoreSession`)
- [ ] Smoke test: connect calendar, select 2 calendars, navigate weeks, verify cache hit on revisit, verify export creates an event in Google Calendar

---

## Key Constraints

- Use `adminClient` (service role) inside the edge function to read/write `calendar_tokens` — user-scoped client is blocked by RLS
- Google Calendar API base: `https://www.googleapis.com/calendar/v3`
- Token refresh: `https://oauth2.googleapis.com/token`
- Revoke: `https://oauth2.googleapis.com/revoke?token={token}`
- Required OAuth scope: `https://www.googleapis.com/auth/calendar` (read + write)
- Cache keys: `prepd_gcal_{weekStart}` (events), `prepd_gcal_selected` (selected IDs), `prepd_gcal_export_enabled`
- `extendedProperties.private.prepd_slot_id` on created events — used to identify Prepd-owned events for read-only enforcement

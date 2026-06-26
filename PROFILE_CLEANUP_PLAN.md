# Profile Cleanup Plan

## Goal
Break the monolithic profile screen into focused sub-pages with a clear hub → detail flow. Remove macro planning from the profile entirely and give it a permanent home on the Macros tab.

## Current State
- `profile/index.tsx` — single long screen with everything crammed in
- `profile/notifications.tsx` — already built as a proper sub-page (auto-save, descriptions) ✓
- `profile/macro-planner.tsx` — already built as a full sub-page ✓
- `profile/food-library.tsx` — already its own screen ✓
- `profile/admin/` — already has sub-pages and layout ✓

## New Structure

### Profile Hub (`profile/index.tsx`) — redesign
A clean settings-menu style screen:
- **User card** at top: display name + email, read-only
- **Nav rows** (chevron style) linking to sub-pages:
  - Account
  - Notifications
  - Appearance
  - My Food Library
  - Admin (visible to moderator/admin only)

No editable fields, no save button — this screen is navigation only.

### Account (`profile/account.tsx`) — new
- Email (read-only field)
- Display name (text input)
- Dietary preferences (tag grid)
- Save button
- Sign Out button
- Danger zone: Delete account + confirmation modal

### Notifications (`profile/notifications.tsx`) — already done ✓
Already has descriptions, cadence info, and auto-save per toggle. No changes needed.

### Appearance (`profile/appearance.tsx`) — new
- Theme picker: Light / Dark / System
- Google Calendar section: connect/disconnect, export toggle, calendar picker

### Macro Planner (moved to Macros tab)
- Add a **goals summary bar** pinned below the date header on `macros/index.tsx`
  - Shows current calorie target + macro targets at a glance
  - Tapping it navigates to `/(tabs)/profile/macro-planner`
- Update the "Back to Profile" button in `macro-planner.tsx` to `router.back()`
  so it works correctly when navigated from either screen

### Admin (`profile/admin/`) — already done ✓
Existing sub-pages unchanged. Hub just needs a row wired to the admin index.

## File Changes Summary

| File | Change |
|------|--------|
| `profile/index.tsx` | Rewrite as nav hub |
| `profile/account.tsx` | Create new |
| `profile/appearance.tsx` | Create new |
| `profile/notifications.tsx` | No changes needed |
| `profile/macro-planner.tsx` | Replace "Back to Profile" with `router.back()` |
| `macros/index.tsx` | Add goals summary bar below date header |

## Goals Bar Design (Macros tab)
A compact horizontal bar sitting between the date navigation and the week strip:
- Left: calorie target (e.g. "2,000 kcal")
- Middle: protein / carbs / fat targets as small chips
- Right: chevron indicating it's tappable
- Background: `theme.backgroundElement`, subtle border
- Tapping opens Macro Planner

If no macro goals are set, show a "Set macro goals →" prompt instead.

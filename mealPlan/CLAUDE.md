@AGENTS.md

# Prepd — Developer Guide

## Current state

Full-featured meal planning + macro tracking app. Actively developed — not in boilerplate phase.

Completed features:
- **Recipes**: create, import (URL via Claude AI parsing), browse, save, plan to calendar
- **Calendar**: weekly meal planner; planned meals + logged food on the same grid
- **Macro tracking**: food log (manual entry, FatSecret search, barcode scan, personal library, community DB) + planned meals summed into daily totals
- **Personal food library**: save, search, inline edit, share to community
- **Community food database**: FatSecret results auto-cached; manual submissions go through moderation queue
- **Role system**: `user` / `moderator` / `admin` with guarded admin screens
- **Grocery list**: auto-generated from planned meals + pantry staples management
- **Calendar integration**: Android uses `expo-calendar` (native device calendar); Web uses Google Calendar REST API (OAuth)

Planned but not built: Phase 8 (historical macro trends chart), Phase 9 (food log → Google Calendar export). See `MACRO_TRACKING_PLAN.md`.

## Tech

- Expo SDK 56 / React Native 0.85 / TypeScript 6
- Expo Router (file-based routing, typed routes)
- Supabase — auth, database, Edge Functions (Deno)
- PowerSync — offline-first sync wrapping Supabase
- Redux Toolkit — ephemeral UI state only
- `react-native-web` for web support
- Target platforms: **Android** and **Web** (iOS not actively supported)

## Key commands

```bash
# Run from mealPlan/
npm install
npm run web          # fastest for dev iteration
npm run android
npx expo start       # interactive

# Supabase — run from repo root (mealPlanningApp/)
npx supabase migration list --linked
npx supabase db push --linked
```

## Where things live

| What | Where |
|------|-------|
| Tab screens | `src/app/(tabs)/` |
| Auth screens | `src/app/(auth)/` |
| Onboarding | `src/app/(onboarding)/` |
| Admin/moderation screens | `src/app/(tabs)/profile/admin/` |
| UI primitives | `src/components/ui/` |
| Calendar UI | `src/components/calendar/` |
| Food UI (barcode, attribution) | `src/components/food/` |
| Dashboard widgets | `src/components/dashboard/` |
| Redux store | `src/store/` + `src/store/slices/` |
| Custom hooks | `src/hooks/` |
| Service layer | `src/services/` |
| PowerSync models | `src/models/` |
| Edge Functions | `supabase/functions/` |
| DB migrations | `supabase/migrations/` |
| Design tokens | `src/constants/theme.ts` |
| Macro tracking plan & schema | `MACRO_TRACKING_PLAN.md` |
| Architecture deep-dive | `../ARCHITECTURE.md` (repo root) |

## Key conventions

### Theme
Always `useTheme()` + plain `View`/`Text`. Never `ThemedView`/`ThemedText` or `Colors.light.*` in new code.

### Service/hook/component layering
Components call hooks. Hooks call services. Services call Supabase or Edge Functions. Never skip a layer.

### PowerSync vs Supabase direct
- **Offline-first tables** (recipes, meal slots, food logs, personal foods, etc.) go through PowerSync — use the relevant hook.
- **Online-only tables** (`public_foods`, `food_flags`, `profiles`) are accessed via `supabase` directly inside service files (`public-food-service.ts`, `use-user-role.ts`).

### Admin access
Use `useUserRole()` to check role. Admin-gated screens live in `(tabs)/profile/admin/`. The `_layout.tsx` there redirects non-moderator/admin users automatically. Edge functions also verify role server-side — client guards are UX-only.

### FatSecret attribution
`<FatSecretAttribution />` (`src/components/food/fatsecret-attribution.tsx`) must appear on every screen displaying FatSecret data. This is a contractual requirement.

### Schema / field naming
All DB columns and TypeScript model fields use **snake_case**.

### Platform splits
Files ending `.web.ts` / `.web.tsx` are loaded on web instead of their `.ts` counterpart. Pattern is used for `use-color-scheme`, `use-theme`, `powersync`, and `calendar`.

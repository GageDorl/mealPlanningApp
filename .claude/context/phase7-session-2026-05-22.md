# Phase 7 Context — 2026-05-22

## Branch
`phase7` (US4: Weekly Planner with Calendar Integration)

## What Was Done This Session

### 1. Database Migration Applied
- Fixed `specs/001-prepd-mvp/migrations/001_initial_schema.sql`:
  - Reordered `ingredients` before `recipe_ingredients` (forward-reference bug)
  - Changed `meal_slots.day_of_week INTEGER` → `date DATE`
- Created `supabase/migrations/20260522000000_initial_schema.sql` and pushed to Supabase
  - All 12 tables created with permissive `dev_allow_all` RLS policies (tighten in Phase 3)
  - `meal_plans.user_id` and `recipes.user_id` are nullable (no FK to users) since auth isn't wired yet

### 2. TypeScript Models Updated (snake_case to match spec schema)
- `mealPlan/src/models/meal-plan.ts`: `userId/startDate/endDate` → `user_id/week_start` (no endDate)
- `mealPlan/src/models/meal-slot.ts`: `planId/time/assignedRecipeId` → `meal_plan_id/time_of_day/recipe_id`; added `display_order`
- `mealPlan/src/models/recipe.ts`: `calories/prepTimeMinutes/imageUrl` → `calories_per_serving/prep_minutes/image_url`, etc.

### 3. Service Code Updated
- `mealPlan/src/services/meal-plan-service.ts`: all Supabase queries use snake_case column names

### 4. Calendar Components Updated
- `day-column.tsx`: `s.time` → `s.time_of_day`
- `meal-slot-card.tsx`: `slot.time` → `slot.time_of_day`, `slot.recipe.calories` → `slot.recipe.calories_per_serving`
- `recipe-picker-modal.tsx`: `item.calories` → `item.calories_per_serving`, `item.prepTimeMinutes` → `item.prep_minutes`
- `use-meal-plan.ts`: `s.assignedRecipeId` → `s.recipe_id`
- `calendar/index.tsx`: `slot.time` → `slot.time_of_day`

### 5. Connect Calendar Button Fixed
- Added `accessibilityRole="button"` to the Pressable
- Added `connectError` state to `useCalendar` hook — errors shown inline below the button
- `connectRow` style: `flexDirection: 'column'`, `alignSelf: 'center'` (content-width only)

### 6. Calendar OAuth Flow (In Progress)
- `calendar.web.ts` now uses `supabase.functions.invoke()` instead of raw `fetch` — handles publishable key correctly
- `recal-oauth-link` Edge Function deployed with `--no-verify-jwt` (required for new `sb_publishable_...` key format with no user session)
- Edge Function has `DEV_TEST_USER_ID` bypass so OAuth can be tested without auth

## Current State
The "Connect Calendar" button should now redirect to Google OAuth. **Not yet confirmed working end-to-end** — session ended before full test.

The OAuth callback route exists at `mealPlan/src/app/auth/calendar-callback.tsx`. Check `recal-oauth-verify` Edge Function to ensure it handles the dev test user ID correctly too.

## TODOs (Phase 3 — When Auth is Wired)
Search for `TODO: revert` to find all temporary bypasses:

1. **`supabase/functions/recal-oauth-link/index.ts`**
   - Remove `DEV_TEST_USER_ID` const and `userId` fallback
   - Restore: `if (error || !user) return 401`
   - Redeploy **without** `--no-verify-jwt`

2. **`supabase/functions/recal-oauth-verify/index.ts`** (check if it also needs the bypass pattern)

3. **RLS policies** — replace `dev_allow_all` on all tables with proper `auth.uid() = user_id` policies

## Key Files
- Migration: `supabase/migrations/20260522000000_initial_schema.sql`
- Spec migration: `specs/001-prepd-mvp/migrations/001_initial_schema.sql`
- Calendar service (web): `mealPlan/src/services/calendar.web.ts`
- Calendar service (native): `mealPlan/src/services/calendar.ts`
- Meal plan service: `mealPlan/src/services/meal-plan-service.ts`
- Planner screen: `mealPlan/src/app/calendar/index.tsx`
- Calendar hook: `mealPlan/src/hooks/use-calendar.ts`
- Edge functions: `supabase/functions/recal-oauth-link/`, `supabase/functions/recal-oauth-verify/`, `supabase/functions/recal-calendar/`

## Supabase Project
- Project ref: `uyvsvsmspdlhbhavevuc`
- Supabase URL: `https://uyvsvsmspdlhbhavevuc.supabase.co`
- Anon key format: new `sb_publishable_...` format (no legacy JWT key available in dashboard)

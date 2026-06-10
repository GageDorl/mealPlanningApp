# Macro Tracking — Task List

## Architecture Notes

**Planned meals** (existing): `meal_slots` → recipes → per-serving macros scaled by `serving_override`. Represent what the user *plans* to eat.

**Food log entries** (new): `food_logs` + `food_log_items` → macros stored per serving, scaled by `servings_eaten`. Represent what the user *actually ate*.

Both sources are always summed together in `getDailyProgress` (`src/services/macro-service.ts`). FatSecret covers generic foods and branded products — brand names must be shown prominently in search results. Attribution ("Powered by FatSecret") is required on any screen displaying FatSecret data.

---

## Schema Reference

### `food_logs`
```
id            uuid PK
user_id       uuid FK → auth.users
date          date           -- YYYY-MM-DD
time_of_day   time           -- nullable, HH:MM
label         text           -- "Breakfast", "Lunch", etc., nullable
created_at    timestamptz
updated_at    timestamptz
```

### `food_log_items`
```
id                   uuid PK
food_log_id          uuid FK → food_logs
food_name            text          -- required
brand_name           text          -- nullable
serving_size_amount  numeric       -- macros are PER this amount
serving_size_unit    text          -- "g" | "oz" | "cup" | "piece" | "slice" | "tbsp" | "tsp" | "ml"
servings_eaten       numeric       -- actual consumed = field * servings_eaten
calories             numeric       -- kcal per serving, nullable
protein              numeric       -- g, nullable
carbs                numeric       -- g, nullable
fat                  numeric       -- g, nullable
saturated_fat        numeric       -- nullable
trans_fat            numeric       -- nullable
cholesterol          numeric       -- mg, nullable
sodium               numeric       -- mg, nullable
dietary_fiber        numeric       -- nullable
total_sugar          numeric       -- nullable
added_sugar          numeric       -- nullable
source               text          -- 'manual' | 'library' | 'fatsecret' | 'recipe'
source_id            text          -- nullable; fatsecret food_id, library item id, or recipe id
display_order        integer
created_at           timestamptz
updated_at           timestamptz
```

### `personal_foods` (Phase 4)
```
id                   uuid PK
user_id              uuid FK → auth.users
food_name            text
brand_name           text
serving_size_amount  numeric
serving_size_unit    text
calories / protein / carbs / fat / saturated_fat / trans_fat
cholesterol / sodium / dietary_fiber / total_sugar / added_sugar  (all numeric, nullable)
fatsecret_id         text    -- nullable
created_at / updated_at      timestamptz
```

### `public_foods` (Phase 7)
Same columns as `personal_foods` plus:
- `submitted_by uuid` FK → auth.users
- `approved bool default false`
- `approval_notes text`
- `barcode text` — populated when item was sourced from a barcode scan / FatSecret lookup
- `trusted bool default false` — true for FatSecret-sourced entries (auto-approved, no manual review needed)
- `flagged bool default false` — true when item has pending flags requiring moderator review (even if already approved)
- `flag_count int default 0` — denormalized count of open flags for sort/filter

### `food_flags` (Phase 7.1)
```
id          uuid PK
food_id     uuid FK → public_foods
flagged_by  uuid FK → auth.users
reason      text    -- user-provided note, optional
resolved    bool default false
created_at  timestamptz
```

### `profiles` (Phase 7 — role management)
```
user_id   uuid PK FK → auth.users
role      text default 'user'   -- 'user' | 'moderator' | 'admin'
created_at timestamptz
updated_at timestamptz
```

---

## Phase 1 — Database Schema & TypeScript Models

- [x] Create Supabase migration `supabase/migrations/20260609000000_food_log.sql`
  - [x] `food_logs` table with columns from schema above
  - [x] `food_log_items` table with columns from schema above
  - [x] RLS on both tables: `user_id = auth.uid()` for all operations
  - [x] Index on `food_logs(user_id, date)`
  - [x] Index on `food_log_items(food_log_id)`
- [x] Create `src/models/food-log.ts`
  - [x] `FoodLog` interface (snake_case)
  - [x] `FoodLogItem` interface (snake_case)
  - [x] `foodLogTable` PowerSync table definition
  - [x] `foodLogItemTable` PowerSync table definition
- [x] Update `src/services/powersync.tsx` — add `food_logs` and `food_log_items` to schema
- [x] Update `src/services/powersync.web.tsx` — web is a passthrough stub, no changes needed
- [x] Update `src/constants/macros.ts` — added `FoodLabelMacros` array for extended fields (`saturated_fat`, `trans_fat`, `cholesterol`, `added_sugar`) and `FoodLabelMacroKey` type

---

## Phase 2 — Manual Food Logging UI

- [x] Update `src/components/calendar/add-meal-slot-modal.tsx`
  - [x] Add mode toggle at the top: **"Plan Recipe"** | **"Log Food"**
  - [x] "Plan Recipe" mode renders existing UI unchanged
  - [x] "Log Food" mode renders `LogFoodForm`
  - [x] Add separate `onLogFood` callback prop (don't overload `onAdd`)
- [x] Create `src/components/calendar/log-food-form.tsx`
  - [x] Meal label chips (Breakfast / Lunch / Dinner / Snack / custom) — same pattern as existing modal
  - [x] Time picker — reuse existing time row component
  - [x] Food name input (required) and brand name input (optional)
  - [x] Serving size: amount input + unit picker (g / oz / cup / piece / slice / tbsp / tsp / ml)
  - [x] Servings eaten input (numeric, defaults to 1)
  - [x] Always-visible macro inputs: Calories, Protein, Carbs, Fat
  - [x] "More macros" expand toggle showing: Saturated Fat, Trans Fat, Cholesterol, Sodium, Fiber, Sugar, Added Sugar (all optional)
  - [x] "Add Another Item" button — renders a list of staged items above the form, allows multiple items per meal
  - [x] Submit creates one `food_logs` row + one `food_log_items` row per staged item
- [x] Create `src/services/food-log-service.ts`
  - [x] `createFoodLog(userId, date, label, timeOfDay, items[])` — inserts `food_logs` + `food_log_items`
  - [x] `getFoodLogsForWeek(userId, weekStart, weekEnd)` — returns logs with nested items for a week
  - [x] `deleteFoodLog(id)`
  - [x] `deleteFoodLogItem(id)`
  - [x] `updateFoodLogItem(id, patch)`
- [x] Create `src/hooks/use-food-log.ts` — wraps food-log-service, exposes `weekLogs`, `createFoodLog`, `deleteFoodLog`, `loading`, `error`
- [x] Update calendar day view (`src/components/calendar/week-events-overlay.tsx`, `day-column.tsx`, `calendar.tsx`)
  - [x] Fetch food logs for the displayed week via `useFoodLog`
  - [x] Render food log entries using `FoodLogCard` (same card style as `MealSlotCard`)
  - [x] Untimed food logs appear in the all-day row via `AllDayCell`
  - [x] Tapping a food log entry opens a read/edit view (`FoodLogDetailModal` — edit servings per item, delete item, delete log)

---

## Phase 3 — Macro Service Integration

- [x] Update `getDailyProgress` in `src/services/macro-service.ts`
  - [x] Fetch food logs for the date via `getFoodLogs`
  - [x] Compute each item's actual macros: `field * servings_eaten`
  - [x] Sum food log macros into per-macro daily totals alongside planned meal totals
  - [x] Add `entry_type: 'planned' | 'logged'` to `MealMacroEntry` (or a new `FoodLogMacroEntry` type)
- [x] Update `src/components/macros/meal-macro-breakdown.tsx`
  - [x] Render planned meals and logged food items in a unified list, ordered by `time_of_day`
  - [x] Show food name, servings eaten, and core macros (cal / protein / carbs / fat) per row
  - [x] Add delete action on planned meal rows (trash icon or swipe) — calls `deleteMealSlot` so users can remove meals they didn't eat, keeping totals accurate
- [x] Recipe serving size fix
  - [x] Create migration adding `servings_eaten numeric` column to `meal_slots`
  - [x] Update `buildMacroProgress` to use `servings_eaten` when set, falling back to `serving_override`
  - [x] Update `buildMealBreakdown` with same fallback logic
  - [x] Add "Log how much I ate" input in `src/components/calendar/event-detail-modal.tsx` (or recipe detail) that writes `servings_eaten`

---

## Phase 4 — Personal Food Library

- [x] Create Supabase migration for `personal_foods` table (see schema above) with RLS (`user_id = auth.uid()`)
  - [x] `supabase/migrations/20260609000002_personal_foods.sql`
- [x] Create `src/models/personal-food.ts` — `PersonalFood` interface + `personalFoodTable` PowerSync definition
- [x] Update `src/services/powersync.tsx` — add `personalFoodTable` to sync tables
- [x] Create `src/services/personal-food-service.ts`
  - [x] `saveToLibrary(userId, foodLogItem)` — copies a `food_log_item` into `personal_foods`
  - [x] `getPersonalFoods(userId, query?)` — search/list
  - [x] `deletePersonalFood(id)`
  - [x] `updatePersonalFood(id, patch)`
- [x] Add "Save to Library" bookmark button on food log item view — writes to `personal_foods`
  - [x] ☆/★ button per item in `FoodLogDetailModal`; `onSaveToLibrary` prop wired in `calendar.tsx`
- [x] Add library search tab to `LogFoodForm`
  - [x] Manual / My Library tab bar; `userId` prop threaded through `AddMealSlotModal`
  - [x] Search input querying `personal_foods` via `getPersonalFoods`
  - [x] Selecting an item pre-fills food name, brand, serving size, and all macros
  - [x] User can still adjust servings eaten and any macro fields before submitting
- [x] Create library management screen `src/app/(tabs)/profile/food-library.tsx`
  - [x] List all saved personal foods with search
  - [x] Tap delete with confirmation alert
  - [x] Tap edit — inline edit card (name, brand, serving, core macros)
- [x] Add "My Food Library" navigation button in `src/app/(tabs)/profile/index.tsx`

---

## Phase 5 — FatSecret Search Integration

- [x] Expand `FoodSearchResult` in `src/services/fatsecret.ts`
  - [x] Add full food-label macros: `saturated_fat`, `trans_fat`, `cholesterol`, `sodium`, `fiber`, `sugar`, `added_sugar` (per serving + per 100g variants)
  - [x] Add `servings: FatSecretServing[]` to support multiple FatSecret serving size options (via `FoodDetails` + `getFoodDetails`)
  - [x] Ensure `brand_name` is included in the type (for branded product display)
- [x] Update `supabase/functions/search-food/` edge function
  - [x] Call `food.get.v4` when `food_id` is provided to retrieve full nutrition data
  - [x] Return complete nutrition panel including all food-label macros
- [x] Add FatSecret search tab to `LogFoodForm`
  - [x] Debounced search input calling `lookupIngredient`
  - [x] Results list showing food name, brand name (prominent), and calories
  - [x] Tapping a result auto-fills the form fields
  - [x] Serving size picker pre-populates from FatSecret's serving options
  - [x] Sets `source = 'fatsecret'` and `source_id = fatsecret_food_id` on submission
- [x] Create `src/components/food/fatsecret-attribution.tsx`
  - [ ] Download FatSecret logo from their brand kit (text-only for now; logo requires manual download)
  - [x] Component renders "Powered by FatSecret"
  - [x] Place on: FatSecret search results list, food detail/pre-fill view, food log item detail when `source = 'fatsecret'`
- [x] Add "Save to Library" offer when a FatSecret food is logged — saves to `personal_foods` with `fatsecret_id` (already handled by existing `saveToLibrary` which checks `source === 'fatsecret'`)

---

## Phase 6 — Barcode Scanning

- [x] Confirm or add `expo-camera` dependency (`package.json`)
- [x] Add `lookupBarcode(barcode: string)` to `src/services/fatsecret.ts`
  - [x] Create (or extend) a `barcode-lookup` Supabase edge function
  - [x] Edge function calls FatSecret `food.find_id_for_barcode` then `food.get.v4`
  - [x] Returns a `FoodDetails` if found, `null` if not
- [x] Create `src/components/food/barcode-scanner.tsx`
  - [x] Full-screen camera view with scan target overlay
  - [x] On scan: call `lookupBarcode`, show loading state
  - [x] On match: auto-fill `LogFoodForm` and close scanner
  - [x] On no match: show "Not found — enter manually" with dismiss
- [x] Add camera icon button to `LogFoodForm` food name input — opens barcode scanner as modal

---

## Phase 7 — Public Food Table

### 7a — Schema & roles

- [x] Create Supabase migration for `profiles` table (`20260609000003_profiles.sql`)
  - [x] `user_id uuid PK FK → auth.users`, `role text default 'user'` (`'user'` | `'moderator'` | `'admin'`), `created_at`, `updated_at`
  - [x] RLS: users can read their own row; only admins can update `role`
  - [x] Trigger: auto-insert a `profiles` row with `role = 'user'` when a new auth user is created
  - [x] Backfill: existing auth users get a `profiles` row on migration apply
- [x] Create Supabase migration for `public_foods` table (`20260609000004_public_foods.sql`)
  - [x] RLS: any authenticated user can `SELECT` rows where `approved = true`; `submitted_by = auth.uid()` can also `SELECT` their own pending rows; no direct `INSERT` or `DELETE` (all writes via edge functions)
  - [x] Index on `(approved, flagged)`, `(submitted_by)`, `(fatsecret_id)`, `(barcode)`
- [x] Create Supabase migration for `food_flags` table (`20260609000005_food_flags.sql`)
  - [x] RLS: users can insert their own flags; users can read their own flags; moderators/admins can read and update all
  - [x] `UNIQUE(food_id, flagged_by)` — prevents duplicate flags from the same user

### 7b — Edge functions & caching

- [x] Create `supabase/functions/submit-public-food/` edge function
  - [x] If `source = 'fatsecret'`: sets `approved = true`, `trusted = true` — immediately community-available
  - [x] Otherwise: sets `approved = false`, `trusted = false` — pending moderator review
  - [x] Optional `save_to_library` flag also upserts caller's `personal_foods` row (used by 7c share toggle)
  - [x] Stores `barcode` if provided; upserts on `fatsecret_id` partial unique index (migration `20260609000006`)
- [x] When a user selects any FatSecret result in `LogFoodForm`:
  - [x] Call `submit-public-food` in the background via `cachePublicFood` (fire-and-forget, never blocks UI)
  - [x] Include `barcode` if item was looked up by barcode scan (`barcode-scanner.tsx` now passes barcode to `onFoodFound`)
- [x] Create `supabase/functions/flag-food/` edge function
  - [x] Inserts a `food_flags` row for the caller
  - [x] Increments `public_foods.flag_count` and sets `flagged = true`
  - [x] Prevents duplicate flags from the same user on the same food (returns 409)
- [x] Create `src/services/public-food-service.ts` — `cachePublicFood`, `sharePublicFood`, `flagPublicFood` helpers

### 7c — Share toggle UI

- [x] Add "Also share publicly" toggle to the Save to Library confirmation in `FoodLogDetailModal`
  - [x] Switch below the ☆/★ confirmation — "Share with community?"
  - [x] If on, calls `submit-public-food`; user sees pending status if manual entry
- [x] Add share toggle to library management screen `src/app/(tabs)/profile/food-library.tsx`
  - [x] Each item shows current share status: not shared / pending / shared
  - [x] Toggle to share (calls edge function)
- [x] Add "Flag this food" option on community search results and food log item detail when `source = 'community'`
  - [x] Tap opens a short reason input (optional), then calls `flag-food` edge function
  - [x] After flagging, button shows "Flagged" and is disabled (one flag per user per food)

### 7d — Unified search

- [x] Update food search in `LogFoodForm` to unified search
  - [x] Query personal library + approved `public_foods` + FatSecret in parallel
  - [x] Order: personal library first, then community, then FatSecret
  - [x] Deduplicate by `fatsecret_id`: if food exists in Community, suppress the FatSecret duplicate
  - [x] Display source badge: "My Library" / "Community" / "FatSecret"

---

## Phase 7.1 — Moderator & Admin Views

### 7.1a — Pending food review (moderator + admin)

- [x] Create `src/app/(tabs)/profile/admin/` route group — redirect or hide if `profiles.role` is `'user'`
- [x] Create `src/app/(tabs)/profile/admin/pending-foods.tsx`
  - [x] List `public_foods` where `approved = false`, ordered by `created_at asc`
  - [x] Each card: food name, brand, serving, core macros, submitter info, date
  - [x] **Approve** action → calls `moderate-food` edge function with `{ action: 'approve' }`
  - [x] **Reject** action → opens reason text input → calls `moderate-food` with `{ action: 'reject', notes }`; removes the `public_foods` row
- [x] Create `src/app/(tabs)/profile/admin/flagged-foods.tsx`
  - [x] List `public_foods` where `flagged = true`, ordered by `flag_count desc`
  - [x] Shows all `food_flags` for each food (who flagged, reason, date)
  - [x] **Clear flags** action: resolves all open `food_flags`, resets `flagged = false` and `flag_count = 0` — food stays approved
  - [x] **Re-pend** action: sets `approved = false`, moving food back into the pending-foods queue for full re-review
  - [x] **Remove** action: hard-deletes the `public_foods` row and its flags
- [x] Create `supabase/functions/moderate-food/` edge function
  - [x] Verifies caller's `profiles.role` is `'moderator'` or `'admin'`
  - [x] Handles `approve`, `reject`, `clear-flags`, `re-pend`, `remove` actions on `public_foods` / `food_flags`

### 7.1b — User role management (admin only)

- [x] Create `src/app/(tabs)/profile/admin/user-roles.tsx`
  - [x] Paginated list of all users with current role
  - [x] Search by email
  - [x] Tap a user → role picker (`user` / `moderator` / `admin`)
  - [x] Role change calls `supabase/functions/set-user-role/` edge function
- [x] Create `supabase/functions/set-user-role/` edge function — verifies caller is `admin` before updating `profiles.role`
- [x] Add "Admin" section to `src/app/(tabs)/profile/index.tsx`
  - [x] "Pending Foods" link (moderator + admin)
  - [x] "Flagged Foods" link (moderator + admin)
  - [x] "User Roles" link (admin only)
  - [x] Section hidden entirely for `role = 'user'`

---

## Phase 8 — Historical Macro Trends

- [ ] Add week summary strip to `src/app/(tabs)/macros/index.tsx`
  - [ ] 7 day-chips (Mon–Sun) for the current week
  - [ ] Color each chip by proximity to calorie goal: green (within 10%) / amber (10–25% off) / grey (no data)
  - [ ] Tapping a chip navigates to that day's detail view (reuses existing day view)
  - [ ] Calls existing `getWeeklyProgress`
- [ ] Add `getHistoricalProgress(userId, startDate, endDate)` to `src/services/macro-service.ts`
  - [ ] Single date-range query for `meal_slots` and `food_log_items` (not N parallel day calls)
  - [ ] Group results by date client-side, return `DailyMacroProgress[]`
- [ ] Decide on charting library (options: `react-native-gifted-charts`, `victory-native`) — confirm RN compatibility before installing
- [ ] Create `src/components/macros/macro-trend-chart.tsx`
  - [ ] Bar or line chart of daily totals for a selected macro over 7 or 30 days
  - [ ] Macro selector chips (Calories / Protein / Carbs / Fat) above the chart
  - [ ] 7-day / 30-day toggle
  - [ ] Render below the week summary strip on the macros screen
- [ ] Update prev/next day navigation in macros screen
  - [ ] Allow navigation to any past date (no lower bound restriction)
  - [ ] Show "Today" button when viewing a past day
  - [ ] Block navigation to future dates

---

## Phase 9 — Google Calendar "Logged Food" Export

- [ ] Add "Export food log to Google Calendar" toggle in `src/app/(tabs)/profile/index.tsx`
  - [ ] Stores `sync_food_log boolean` in user profile
  - [ ] Stores `food_log_calendar_id text` (set on first export)
- [ ] Add `syncFoodLogToCalendar(entries[])` to the calendar service
  - [ ] On first sync: create a new Google Calendar "Prepd – Logged Food" via Calendar API, save `calendarId` to user profile
  - [ ] Subsequent syncs: upsert events using food log entry ID as the external event ID
  - [ ] Event title: log label (e.g. "Breakfast"), description: item list with macros
- [ ] After `createFoodLog` resolves, trigger calendar sync if `sync_food_log = true`

---

## Notes

- **Quick log shortcut** *(user-testing dependent)*: A path that skips the meal-label step could reduce friction for snacks. Don't build until Phase 2 is live — add only if users report the meal-label step feels forced for one-off items.
- **Data retention**: Food log data stored indefinitely in Supabase. No truncation needed now; revisit if table size becomes a concern.

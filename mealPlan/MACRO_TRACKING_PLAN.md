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
Same columns as `personal_foods` plus `submitted_by uuid`, `approved bool`, `approval_notes text`.

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

- [ ] Create Supabase migration for `public_foods` table
  - [ ] Same columns as `personal_foods` plus `submitted_by uuid`, `approved bool default false`, `approval_notes text`
  - [ ] RLS: authenticated users can read approved rows; owner can update their own; no direct delete
- [ ] Create `supabase/functions/submit-public-food/` edge function — enforces approval logic server-side
  - [ ] Auto-approve submissions where `source = 'fatsecret'` (data is trusted)
  - [ ] All other submissions land with `approved = false`
- [ ] Add "Also share publicly" toggle to the save-to-library flow — calls edge function on confirm
- [ ] Update food search in `LogFoodForm` to unified search
  - [ ] Query personal library + approved public foods + FatSecret in parallel
  - [ ] Display source badge on each result: "My Library" / "Community" / "FatSecret"

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

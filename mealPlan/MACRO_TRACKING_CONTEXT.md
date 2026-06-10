# Macro Tracking — Session Context

> Hand this file to a new session along with `MACRO_TRACKING_PLAN.md` for full context.
> Last updated: 2026-06-09

---

## What This Feature Is

Users can log food they've actually eaten throughout the day. Entries appear on the same in-app calendar as planned meal slots. The macros tab sums both planned meals and logged food toward daily goals. FatSecret (premium free tier, attribution required) is the external nutrition database — it covers both generic and branded items.

Full phase plan is in `MACRO_TRACKING_PLAN.md`. Phases 1 and 2 are complete. Phase 3 is next.

---

## Completed Work

### Phase 1 — Database & Models ✅

**Migration applied to Supabase:**
`supabase/migrations/20260609000000_food_log.sql`
- `food_logs` table: `id, user_id, date, time_of_day, label, created_at, updated_at`
- `food_log_items` table: all food-label macro fields (calories, protein, carbs, fat, saturated_fat, trans_fat, cholesterol, sodium, dietary_fiber, total_sugar, added_sugar), plus serving_size_amount/unit, servings_eaten, source, source_id, display_order
- RLS: users manage only their own rows. `food_log_items` RLS uses an `EXISTS` subquery join to `food_logs`
- Indexes: `food_logs(user_id, date)`, `food_log_items(food_log_id)`
- Cascade delete: deleting a `food_log` cascades to its `food_log_items`

**New file:** `src/models/food-log.ts`
- `FoodLog` and `FoodLogItem` interfaces (snake_case, matching DB columns)
- `foodLogTable` and `foodLogItemTable` PowerSync table definitions (added to `src/services/powersync.tsx`)

**Updated:** `src/constants/macros.ts`
- `DefaultMacros` reordered to match nutrition label order: Calories → Fat → Sodium → Carbs → Fiber → Sugar → Protein
- Added `FoodLabelMacros` array for extended food-label fields not tracked as daily goals: Saturated Fat, Trans Fat, Cholesterol, Added Sugar (`defaultGoal: 0` distinguishes them from tracked macros)
- Added `FoodLabelMacroKey` type

---

### Phase 2 — Manual Food Logging UI ✅

#### New files

**`src/services/food-log-service.ts`**
- `FoodLogWithItems` interface (`FoodLog` + `items: FoodLogItem[]`)
- `FoodLogItemInput` type (omits id/food_log_id/display_order/timestamps)
- `createFoodLog(userId, date, label, timeOfDay, items[])` — inserts log + items in one call
- `getFoodLogsForWeek(userId, weekStart, weekEnd)` — uses nested select `food_logs(*, food_log_items(*))`
- `deleteFoodLog(id)`, `deleteFoodLogItem(id)`, `updateFoodLogItem(id, patch)`

**`src/hooks/use-food-log.ts`**
- Takes `weekStart: Date`, fetches `getFoodLogsForWeek` for Sun–Sat
- Returns `weekLogs: FoodLogWithItems[]`, `createFoodLog`, `deleteFoodLog`, `loading`, `error`
- Gets userId from `supabase.auth.getSession()` internally (same pattern as `use-macros.ts`)

**`src/components/calendar/log-food-form.tsx`**
- The food entry form rendered inside `AddMealSlotModal` when "Log Food" mode is active
- Props: `initialTime?, onSubmit(LogFoodSubmitParams), onCancel`
- `LogFoodSubmitParams`: `{ label: string | null, timeOfDay: string | null, items: FoodLogItemInput[] }`
- Form sections:
  - Meal label chips (Breakfast / Lunch / Dinner / Snack / Post-workout) + custom input
  - Optional time (checkbox toggle → shows time picker)
  - Staged items list (items confirmed for this meal, displayed above the draft form)
  - Draft item: food name (required), brand name, serving size (amount + scrollable unit chips), servings eaten
  - Core macros always visible (nutrition label order): Calories, Fat, Carbs, Protein
  - "More macros" toggle reveals: Saturated Fat, Trans Fat, Cholesterol, Sodium, Fiber, Sugar, Added Sugar
  - "Add Item" button stages the current draft and resets form for another item
  - "Log Food" submit button — if a valid draft is in progress when submitted, it's included automatically

**`src/components/calendar/food-log-card.tsx`**
- Calendar card for food log entries, same visual structure as `MealSlotCard`
- Green left border (`#50C878`) vs blue for meal slots — only visual distinction kept
- Shows: label (meal name), food item summary (single item name or "N items"), calorie total, time
- Props: `log: FoodLogWithItems, compact?, onPress, onDelete`

#### Modified files

**`src/components/calendar/add-meal-slot-modal.tsx`**
- New prop: `onLogFood: (date: string, params: LogFoodSubmitParams) => void`
- New segmented control at top: **"Plan Recipe"** | **"Log Food"**
- "Plan Recipe" renders existing label/time/slot UI unchanged
- "Log Food" renders `<LogFoodForm>` which handles its own submit/cancel

**`src/components/calendar/week-events-overlay.tsx`**
- `DayData` interface extended: added `timedFoodLogs: FoodLogWithItems[]` and `untimedFoodLogs: FoodLogWithItems[]`
- New props: `onDeleteFoodLog(id)`, `onFoodLogPress(log)`
- `DayEventsColumn` renders `FoodLogCard` for timed food logs using same absolute-positioning as meal slots

**`src/components/calendar/day-column.tsx`**
- `AllDayCell` extended with `untimedFoodLogs?`, `onDeleteFoodLog?`, `onFoodLogPress?` props
- Renders `FoodLogCard` for untimed food logs in the all-day row

**`src/app/(tabs)/calendar.tsx`**
- Added `useFoodLog(currentWeekStart)` alongside `useMealPlan`
- `handleLogFood` and `handleDeleteFoodLog` callbacks
- `days` array now includes `timedFoodLogs` and `untimedFoodLogs` filtered from `weekLogs`
- `hasTopItems` updated to include `untimedFoodLogs.length > 0`
- All new props wired into `AddMealSlotModal`, both `WeekEventsOverlay` instances, and both `AllDayCell` instances

#### Intentionally deferred (noted in plan)
- `onFoodLogPress` is currently a no-op (`() => {}`) — food log detail/edit modal not yet built

---

## Key Architectural Decisions

1. **Macros stored per serving, scaled on read.** Every food log item stores macros as "per serving" values. Actual consumed = `field * servings_eaten`. This mirrors how food labels work and matches FatSecret's data format.

2. **`food_logs` is the meal container; `food_log_items` are the foods.** A single breakfast with 3 foods = 1 `food_log` row + 3 `food_log_items`. A quick single-item log = 1 + 1.

3. **`FoodLogCard` uses a green left border to distinguish from `MealSlotCard`'s blue.** All other styling is identical. User confirmed they don't want heavy visual distinction.

4. **`useFoodLog` is week-scoped**, matching `useMealPlan`. The calendar renders the full week at once, so fetching by week is more efficient than per-day.

5. **`DefaultMacros` order matches nutrition label.** Order: Calories, Fat, Sodium, Carbs, Fiber, Sugar, Protein. This affects the macros tab progress bar order for new users (existing users are driven by `display_order` in the `macro_goals` DB table).

6. **`source` field on `food_log_items`.** Values: `'manual' | 'library' | 'fatsecret' | 'recipe'`. Set to `'manual'` for all Phase 2 entries. Used in Phases 4–5 to track provenance and enable "save to library" flows.

---

## Phase 3 — What's Next

Phase 3 wires food log data into the existing macros screen so logged food counts toward daily totals.

**Tasks:**

1. **`src/services/macro-service.ts` — update `getDailyProgress`**
   - Currently only sums macros from `meal_slots` → recipes
   - Add: call `getFoodLogsForWeek` (or a single-day variant) and sum `item.calories * item.servings_eaten` etc. for each `food_log_item`
   - Add `entry_type: 'planned' | 'logged'` to `MealMacroEntry` so the breakdown can label each row

2. **`src/components/macros/meal-macro-breakdown.tsx`**
   - Currently renders planned meals only
   - Update to render both planned meals and logged food items in a unified list
   - Add delete action on planned meal rows (trash icon) calling `deleteMealSlot` so users can remove meals they didn't eat

3. **Recipe serving size fix (also in Phase 3)**
   - New migration: add `servings_eaten numeric` column to `meal_slots`
   - Update `buildMacroProgress` and `buildMealBreakdown` in `macro-service.ts` to use `servings_eaten` when set, falling back to `serving_override`
   - Add "Log how much I ate" input in `event-detail-modal.tsx` that writes `servings_eaten`

**Key file:** `src/services/macro-service.ts` — this is the main file to modify. Understand the existing `getDailyProgress` function before changing it. It already has `RECIPE_MACRO_FIELD` mapping macro keys to recipe columns; food log items use the same key names directly on `food_log_items` columns.

---

## File Index (new/modified this session)

| File | Status | Notes |
|------|--------|-------|
| `supabase/migrations/20260609000000_food_log.sql` | New | Applied to remote |
| `src/models/food-log.ts` | New | FoodLog, FoodLogItem, PowerSync tables |
| `src/services/food-log-service.ts` | New | CRUD + week fetch |
| `src/hooks/use-food-log.ts` | New | Week-scoped hook |
| `src/components/calendar/log-food-form.tsx` | New | Full food entry form |
| `src/components/calendar/food-log-card.tsx` | New | Calendar card |
| `src/components/calendar/add-meal-slot-modal.tsx` | Modified | Mode toggle added |
| `src/components/calendar/week-events-overlay.tsx` | Modified | DayData extended, FoodLogCard rendered |
| `src/components/calendar/day-column.tsx` | Modified | AllDayCell extended |
| `src/app/(tabs)/calendar.tsx` | Modified | useFoodLog wired in |
| `src/services/powersync.tsx` | Modified | New tables added |
| `src/constants/macros.ts` | Modified | Order + FoodLabelMacros |

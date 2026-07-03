# Week Planner — Implementation Plan

Adds a persistent "Add" button to the tab bar (accessible on every screen) and introduces a new "Plan Week" feature on the calendar that uses Claude AI to generate a personalized weekly meal plan from user input and historical data.

## Status

| Phase | Status |
|---|---|
| Phase 1 — Persistent Add Button | ✅ COMPLETE — committed as `8fcd6ec` |
| Phase 2 — Recipe API swap | ❌ DROPPED — staying on Spoonacular (see note below) |
| Phase 3 — Plan Week Feature | 🔧 IN PROGRESS — see status note below |

### Phase 3 status note
Core flow (questionnaire → AI suggestions → add to calendar) is built. Suggestions plan actual `meal_slots` (not food log entries — see Decisions), each meal made of one or more individually-named, FatSecret-matchable items. This required a new `meal_slot_foods` table (parallel to `meal_slot_recipes`) so a slot can hold standalone food items instead of only recipes.

`supabase/migrations/20260703000000_meal_slot_foods.sql` is pushed (confirmed via `supabase migration list`), and `suggest-weekly-meals` is deployed with the grouped-items schema. `powersync/sync.yaml` was updated locally with the new `meal_slot_foods` stream query — still needs to be applied to the PowerSync instance.

### Phase 3.5 — Redesign as a planning board
The original flow only let users accept/reject AI suggestions — there was no way to plan a week without AI, and no way to pick which week you were planning for. Redesigned `/plan-week` around a persistent **board**: pick a week (reuses `WeekPickerModal`), see every meal slot for that week laid out empty, then fill each slot either by tapping **Get Suggestions** (AI fills remaining empty slots only — already-filled slots are left alone) or manually per-slot (**Plan a Recipe** → `RecipePickerModal`, or **Add a Food Item** → new `AddFoodItemModal`, a lightweight FatSecret search-and-pick). Each slot commits to the real calendar independently via its checkmark, or all at once via **Add All to Calendar**; committed slots show a muted "✓ added" state instead of disappearing.

`meals_per_day` moved out of the AI questionnaire entirely — it's now a persistent Account settings field (`users.meals_per_day`, migration `20260704000000_users_meals_per_day.sql`) since it rarely changes, rather than a question asked every time the planner opens. The board is sized from this profile value; the remaining AI-context questions (days cooking, cook time, prep style, budget, notes) still live in `PlanWeekQuestionnaire`, now shown in a bottom-sheet triggered by "Get Suggestions" instead of blocking the whole screen.

New unified `PlannedSlot`/`PlannedItem` model (`WeekBoard.tsx`) represents a slot's contents as one of three kinds — `ai` (Claude's suggestion, resolved to a real food via FatSecret matching only at commit time), `recipe` (already a real saved `Recipe`), or `food` (already a real FatSecret/library/community match) — so manually-picked items commit directly with no matching step, while AI items go through the same FatSecret auto-match as before.

### Phase 3.6 — Prompt quality + pantry/grocery integration
Real usage surfaced concrete AI failures: combining two different restaurants in one meal (Taco Bell + McDonald's for one "Lunch"), repeating the exact same restaurant order many days in a row, and labeling a home-style dish ("Baked Salmon with Quinoa and Roasted Vegetables") as a "buy" item when it isn't a real purchasable product. Fixed via prompt rules: one restaurant per meal, a new `restaurant: boolean` field per "buy" item so restaurant orders vary (capped at 2 repeats/week) while grocery/convenience staples (a daily protein bar + shake) are explicitly fine to repeat, and a hard requirement that "buy" items name a real purchasable product or menu item.

Also switched `suggest-weekly-meals` from `claude-haiku-4-5-20251001` to `claude-sonnet-5` — these are exactly the kind of soft, self-consistency-heavy constraints (tracking what it already generated, judging real-world purchasability) where Haiku was visibly dropping the ball. Reduced `DAY_CHUNKS` from 4 to 3 to cut cross-chunk fragmentation (each chunk can't see what another chunk picked, which was likely contributing to repetition), and each chunk's prompt now explicitly says which other days are being planned separately so it doesn't default to the "safe"/obvious choice.

Grocery list + pantry now integrate with the planner:
- The AI's `restaurant` flag drives a new `meal_slot_foods.is_grocery_item` column (migration `20260705000000_meal_slot_foods_grocery.sql`) — restaurant orders and "cook" items (no ingredient breakdown exists for those) are excluded; grocery-purchasable "buy" items and manually-added food items (`AddFoodItemModal`) default to included.
- `grocery-service.ts`'s `generateList()` now also pulls `meal_slot_foods` where `is_grocery_item = true` into the same AI consolidation pass used for recipe ingredients, so pantry-deduction and categorization apply uniformly.
- Pantry staples are passed into `suggest-weekly-meals` so the AI avoids suggesting to "buy" something already on hand and can lean on pantry contents for "cook" dish ideas. **Deliberately fetched client-side** (from local PowerSync state via `getPantryStaples`) and sent in the request body, not queried server-side from Postgres — the user may edit their pantry in the same session, and a server-side read could lag behind a local edit that hasn't finished syncing up yet.

**Scoped out of this pass:** no UI to review/edit pantry contents inside the "Get Suggestions" sheet before submitting (the pantry is used silently); "cook" items still have no ingredient breakdown, so they can't appear on the grocery list even though they're real food that needs to be shopped for — extending them would mean either asking Claude to also generate an ingredient list per cook item, or promoting them to real saved `Recipe`s.

### Phase 2 note
Attempted to swap Spoonacular for FatSecret. FatSecret was abandoned because:
- Search quality is poor (e.g. "chicken dumplings", "spaghetti" return no results)
- IP allowlist issue required routing through an existing proxy
- OAuth 1.0a signing was complex and fragile

Edamam was evaluated as an alternative ($9/month entry tier, 10k calls/month, 10/min throttle) but has no free tier to test search quality before committing. Spoonacular `complexSearch` with `addRecipeNutrition=true` is good enough — staying on it.

## Decisions

| Decision | Choice |
|---|---|
| Persistent Add button placement | Center tab bar slot (custom rendered, not a real tab) |
| Add modal trigger | Global Redux state (`addMealSlotSlice`) controls open/close + prefill |
| Modal rendering location | Root `_layout.tsx` so it renders above all tabs |
| Recipe API | Spoonacular — staying, Phase 2 dropped |
| Plan Week entry point | New button in calendar screen bottom-right (replaces the FAB that moved to tab bar) |
| Week planner flow | Full screen route (`/plan-week`) — not a modal |
| AI meal suggestions | New Edge Function `suggest-weekly-meals` modeled after `suggest-foods`; calls split into 4 day-chunks run concurrently to stay under Supabase's fixed 150s edge function request-idle timeout |
| AI suggestion output | Full 7-day coverage, `meals_per_day` meal slots per day, each slot has 1-3 individually-named `items` (cook or buy), so a meal can be e.g. "protein bar + protein shake" |
| Planned non-recipe items | New `meal_slot_foods` table (parallel to `meal_slot_recipes`) — meal slots can now hold standalone food items, not just recipes. Food log stays reserved for unplanned/after-the-fact entries; meal plans (this table) are for anything intentionally planned, including prebought items |
| Add-to-calendar flow | No modal — committing a slot creates a real `meal_slot` directly (`ensureMealPlan` + `createSlot` + `addFoodToSlot`/`addRecipeToSlot` per item). Old `AddMealSlotModal`-prefill approach was dropped because it logged to `food_logs`, which is wrong for *planned* meals |
| FatSecret matching for AI "buy" items | Auto-match: search FatSecret by the item's name and use the top result's real macros; unmatched items (and all "cook" items) fall back to Claude's macro estimate (`source: 'ai_estimate'`). **First pass — revisit if match quality is poor** (see Follow-ups). Manually-picked items (via `RecipePickerModal`/`AddFoodItemModal`) skip matching entirely — they're already real |
| Meals per day | Moved to a persistent Account settings field (`users.meals_per_day`, default 3) instead of a weekly questionnaire — it rarely changes, so asking every time was friction. Sizes the empty board |
| Which week to plan | `WeekPickerModal` (same component the Calendar tab uses) reused as-is, opened from a tap on the week label in the header |
| Manual planning | Board starts fully empty; each empty slot offers "Plan a Recipe" (`RecipePickerModal`) or "Add a Food Item" (new `AddFoodItemModal` — lightweight FatSecret search, no barcode/manual-entry/serving-conversion since that's not needed here) |
| AI fill scope | "Get Suggestions" always targets the whole week in one call and only fills slots that are still empty — it never overwrites a slot the user already filled (AI or manual) |
| Committed slot state | Stays visible as a muted "✓ added" row rather than disappearing, so the board still reads as "my plan for this week" after committing everything |

## Follow-ups / Open Decisions

- **FatSecret auto-match accuracy**: still silent for AI items — no confirmation step. If the top search result is often wrong (mismatched flavor/brand/size), consider always routing AI "buy" items through `AddFoodItemModal` pre-filled with a search query instead of auto-picking. Manually-added items don't have this problem since the user picks explicitly.
- **Board doesn't persist across navigation.** If the user backs out of `/plan-week` mid-plan (some slots filled but not committed), that work is lost — nothing is saved until a slot is explicitly committed. Consider local persistence (e.g. AsyncStorage draft) if this turns out to be a common complaint.
- **Untimed slot display is compact-only.** Committed slots are created without a specific time (`time_of_day: null`), so they show in the all-day row at the top of each day column on the Calendar, not the timed grid. Users can tap to open the detail view, but there's no drag-to-schedule for these yet.

---

## Phase 1 — Persistent Add Button

Move the calendar FAB into the center of the tab bar so users can add food logs and meal plans from any screen.

### 1.1 — Create global add-meal-slot Redux slice

**File:** `src/store/slices/add-meal-slot-slice.ts`

Create a new Redux slice that controls the visibility of `AddMealSlotModal` globally. State shape:

```ts
{
  isOpen: boolean
  prefillDate: string | null   // ISO date string (YYYY-MM-DD), defaults to today
  prefillTime: string | null   // 'HH:MM' or null for untimed
  prefillData: FoodSuggestion | null  // from food suggestions flow
}
```

Actions: `openAddModal(date?, time?, data?)`, `closeAddModal`.

Register the slice in `src/store/index.ts`.

### 1.2 — Move AddMealSlotModal to root layout

**File:** `src/app/(tabs)/_layout.tsx`

- Import `AddMealSlotModal` and the new Redux state.
- Render `<AddMealSlotModal>` at the bottom of the layout JSX (above all tab screens), wired to the global slice.
- Remove the local `isAddModalOpen` state and the `<AddMealSlotModal>` render from `src/app/(tabs)/calendar.tsx`.
- Update all existing `handleAddSlot()` calls in `calendar.tsx` to dispatch `openAddModal(date, time)` instead of setting local state.

### 1.3 — Update food suggestions flow

**File:** `src/store/slices/food-suggestions-slice.ts`

The food suggestions flow currently navigates to the calendar tab and then opens the modal via local state. Update it to dispatch `openAddModal(today, null, suggestionData)` directly instead of relying on the calendar screen to detect Redux state and open the modal. This decouples the modal from the calendar screen.

### 1.4 — Add center tab button

**File:** `src/app/(tabs)/_layout.tsx`

Add a 5th tab entry between Search and Calendar using the Expo Router `tabBarButton` option. The center tab does not navigate — its `onPress` dispatches `openAddModal()` with today's date and no prefill. Style it as a raised circle (same `Colors.accent` teal, 56px diameter, elevation shadow) bumped above the tab bar by ~12px.

Reference implementation pattern:
- `tabBarButton`: custom render function returning a `Pressable` with the raised circle
- `tabBarLabel`: hidden
- The tab's screen content can be an empty component since it never actually navigates

### 1.5 — Remove FAB from calendar screen

**File:** `src/app/(tabs)/calendar.tsx`

Remove the `styles.addButton` `Pressable` and its associated styles. Verify the calendar still correctly opens the modal for timed slots (tapping a time cell) — those calls now dispatch to Redux instead of setting local state.

### 1.6 — Test checklist

- [ ] Tapping center tab from Home opens modal with today's date
- [ ] Tapping center tab from Search opens modal with today's date
- [ ] Tapping center tab from Profile opens modal with today's date
- [ ] Tapping a time cell on the calendar opens modal with correct date + time prefilled
- [ ] Food suggestion "Log it" flow still works (opens modal with suggestion prefilled, no calendar navigation required)
- [ ] Modal closes cleanly on all paths (cancel, save, back gesture)

---

## Phase 2 — Recipe API Swap ❌ DROPPED

Staying on Spoonacular. See status note above.

### 2.1 — Create FatSecret proxy Edge Function

**File:** `supabase/functions/fatsecret-proxy/index.ts`

FatSecret's API uses OAuth 1.0a (HMAC-SHA1 signature), which requires the consumer secret. This must be handled server-side.

The function accepts a POST body:
```ts
{
  method: 'recipes.search' | 'recipe.get'
  params: Record<string, string>
}
```

It builds and signs the OAuth request using `FATSECRET_CONSUMER_KEY` and `FATSECRET_CONSUMER_SECRET` (set as Supabase secrets), calls the FatSecret REST API, and returns the raw JSON response.

Add secrets via:
```bash
npx supabase secrets set FATSECRET_CONSUMER_KEY=... FATSECRET_CONSUMER_SECRET=...
```

### 2.2 — Create FatSecret service

**File:** `src/services/fatsecret.ts`

Mirror the interface of `spoonacular.ts` so callers need minimal changes.

Key functions:
- `searchRecipes(query: string, filters: RecipeFilters): Promise<Recipe[]>`
  - Calls `fatsecret-proxy` with `method: 'recipes.search'`
  - FatSecret returns `recipes.recipe[]` with `recipe_id`, `recipe_name`, `recipe_description`, `recipe_nutrition` (calories, fat, carbohydrate, protein per serving)
  - Maps to the app's `Recipe` model (same shape as Spoonacular mapping)
- `getRecipeDetail(id: string): Promise<Recipe>`
  - Calls `fatsecret-proxy` with `method: 'recipe.get'`
  - Returns full recipe with `recipe_ingredients`, `directions`, `serving_sizes`, `nutrients`
  - Maps ingredients and instructions to app format
- Caching: reuse `local-cache-service.ts` with key prefix `fatsecret:`

**FatSecret → App model mapping:**

| FatSecret field | App field |
|---|---|
| `recipe_id` | `id` |
| `recipe_name` | `name` |
| `recipe_nutrition.calories` | `calories` |
| `recipe_nutrition.protein` | `protein` |
| `recipe_nutrition.carbohydrate` | `carbs` |
| `recipe_nutrition.fat` | `fat` |
| `preparation_time_min` | `prep_time` |
| Derived from `preparation_time_min` | `difficulty` (≤20 easy, ≤45 medium, >45 hard) |
| `recipe_types.recipe_type[]` | `dietary_tags` |

### 2.3 — Update search screen

**File:** `src/app/(tabs)/search.tsx`

- Replace `import { searchRecipes, getRecipeDetail } from '@/services/spoonacular'` with the FatSecret equivalents.
- The filter shape may need adjustment — FatSecret's `recipes.search` supports `search_expression` (query) and `recipe_type_id` but not the same cuisine/diet filters as Spoonacular. Audit the filter UI and hide/remap filters that FatSecret doesn't support.
- Ensure `<FatSecretAttribution />` is present on the search results screen (contractual requirement per `CLAUDE.md`).

### 2.4 — Swap FatSecret in recipe picker and add-meal-slot modal

**Files:** `src/components/calendar/recipe-picker-modal.tsx`, `src/components/calendar/add-meal-slot-modal.tsx`

Replace all remaining Spoonacular imports and calls in these two files with the FatSecret service using the same mapping from 2.2. After this, `spoonacular.ts` is fully unused — delete it.

Ensure `<FatSecretAttribution />` is visible wherever FatSecret recipe results are displayed inside these modals.

### 2.5 — Test checklist

- [ ] Search page returns results from FatSecret (not Spoonacular)
- [ ] Recipe detail modal shows correct ingredients, macros, and instructions
- [ ] Caching works — second search for same query is instant
- [ ] FatSecret attribution visible on search results and inside recipe picker modal
- [ ] Filters that don't map to FatSecret are hidden (no silent broken filters)
- [ ] Recipe picker in `AddMealSlotModal` returns FatSecret results
- [ ] Selecting a recipe from the picker in the calendar correctly saves and creates a meal slot
- [ ] `spoonacular.ts` deleted with no remaining imports

---

## Phase 3 — Plan Week Feature

Add a "Plan Week" button to the calendar, a new planning screen with a questionnaire, and an AI-powered suggestion engine that returns a day-by-day meal plan.

### 3.1 — Add "Plan Week" button to calendar

**File:** `src/app/(tabs)/calendar.tsx`

Where the FAB was (bottom-right corner), add a "Plan Week" button. Style: pill-shaped button with `Colors.accent` background, white text, same bottom/right offsets as the old FAB. Tapping navigates to `/plan-week`.

### 3.2 — Create plan-week screen and route

**File:** `src/app/(tabs)/plan-week.tsx`

New full-screen route. Has two internal steps controlled by local state: `'questionnaire'` and `'suggestions'`.

The screen header shows "Plan Your Week" with a back button. A step indicator shows which phase the user is on.

### 3.3 — Build questionnaire component

**File:** `src/components/week-planner/PlanWeekQuestionnaire.tsx`

Renders the 4 questions as a scrollable form. Uses the app's existing `useTheme()` + `View`/`Text` conventions.

**Questions (in order):**

1. **Days cooking at home** — horizontal number picker or slider (1–7). Label: "How many days will you be cooking at home this week?"
2. **Cook time per meal** — 3-option chip selector. Options: "Quick (under 30 min)", "Moderate (30–60 min)", "No preference"
3. **Prep style** — 2-option chip selector. Options: "Cook fresh each day", "Meal prep (batch cook)"
4. **Anything specific?** — optional free-text input (multiline, max 200 chars). Placeholder: "Cravings, ingredients to use up, things to avoid…"

A "Get Suggestions" button at the bottom (disabled until question 1 is answered) triggers the AI call.

State shape passed to the edge function:
```ts
{
  days_cooking: number       // 1-7
  cook_time: 'quick' | 'moderate' | 'any'
  prep_style: 'fresh' | 'batch'
  notes: string              // free text, may be empty
}
```

### 3.4 — Create suggest-weekly-meals Edge Function

**File:** `supabase/functions/suggest-weekly-meals/index.ts`

Modeled after `suggest-foods/index.ts`. Accepts a POST body:
```ts
{
  questionnaire: WeeklyQuestionnaire
  macro_goals: MacroGoals
  food_log_history: FoodLogSummary[]   // last 30 days, same format as suggest-foods uses
  top_meals: string[]                  // 10 most-used meal/recipe names
}
```

**System prompt outline:**
- You are a meal planning assistant.
- The user wants to plan `days_cooking` days of meals for the coming week.
- Their macro goals are: {calories} cal, {protein}g protein, {carbs}g carbs, {fat}g fat per day.
- Their prep style is {fresh|batch cook} and they have {cook_time} to cook.
- Their recent meals include: {top_meals}.
- Their notes: {notes}.
- Return a JSON array of meal suggestions, one per day requested. Each suggestion has: `day` (1–N), `meal_label` ('Breakfast'|'Lunch'|'Dinner'|'Snack'), `name`, `estimated_macros` (cal/protein/carbs/fat), `reason` (one sentence).
- Aim for variety. For batch cook style, repeat the same meals across multiple days. Keep macros within 15% of daily goals across the day's total.

The function fetches macro goals and food log history from Supabase (same queries as `suggest-foods`) using the authenticated user's JWT.

Returns: `{ suggestions: WeeklyMealSuggestion[] }`

### 3.5 — Build suggestions review component

**File:** `src/components/week-planner/WeekSuggestions.tsx`

Receives the array of suggestions. Renders them grouped by day in a scrollable list.

Each suggestion card shows:
- Day label ("Day 1", "Day 2", etc.) as a section header
- Meal label chip (Breakfast / Lunch / Dinner / Snack)
- Meal name (large text)
- Macro pills (calories, protein, carbs, fat)
- Reason text (small, muted)
- "Add to Calendar" button
- "Skip" button (removes card from list)

An "Add All" button at the top adds every remaining suggestion to the calendar in one tap.

### 3.6 — Wire "Add to Calendar" on suggestions

Tapping "Add to Calendar" on a suggestion card:
1. Dispatches `openAddModal(targetDate, null, suggestionAsFood)` — reuses the existing global modal.
2. The modal opens prefilled with the meal name, macros, and meal label.
3. User confirms (or edits) and saves as a food log or meal slot.

For "Add All": iterates through all non-skipped suggestions and creates food log entries directly via the food log service (no modal per item — batch insert).

### 3.7 — Test checklist

- [ ] "Plan Week" button appears on calendar screen (bottom-right)
- [ ] Questionnaire renders all 4 questions; "Get Suggestions" is disabled until day count is set
- [ ] AI call fires correctly and returns suggestions
- [ ] Loading state shows while waiting for AI response
- [ ] Suggestions display grouped by day with correct macros and labels
- [ ] "Add to Calendar" opens prefilled modal for a single suggestion
- [ ] "Add All" batch-inserts all suggestions without opening a modal per item
- [ ] Skipped suggestions are removed from the list
- [ ] FatSecret attribution visible anywhere FatSecret data is shown

---

## File Change Summary

| File | Phase | Change |
|---|---|---|
| `src/store/slices/add-meal-slot-slice.ts` | 1 | **New** — global modal state |
| `src/store/index.ts` | 1 | Register new slice |
| `src/app/(tabs)/_layout.tsx` | 1 | Add center tab button + render global modal |
| `src/app/(tabs)/calendar.tsx` | 1 | Remove FAB; dispatch to Redux instead of local state |
| `src/store/slices/food-suggestions-slice.ts` | 1 | Dispatch global modal instead of navigating to calendar |
| `supabase/functions/fatsecret-proxy/index.ts` | 2 | **New** — OAuth proxy |
| `src/services/fatsecret.ts` | 2 | **New** — FatSecret service |
| `src/app/(tabs)/search.tsx` | 2 | Swap Spoonacular → FatSecret |
| `src/components/calendar/recipe-picker-modal.tsx` | 2 | Swap Spoonacular → FatSecret |
| `src/components/calendar/add-meal-slot-modal.tsx` | 2 | Swap Spoonacular → FatSecret |
| `src/services/spoonacular.ts` | 2 | **Delete** after Phase 2.4 |
| `src/app/(tabs)/plan-week.tsx` | 3 | **New** — week planner screen |
| `src/components/week-planner/PlanWeekQuestionnaire.tsx` | 3 | **New** — questionnaire form |
| `src/components/week-planner/WeekSuggestions.tsx` | 3 | **New** — suggestions review UI |
| `supabase/functions/suggest-weekly-meals/index.ts` | 3 | **New** — AI edge function |
| `src/app/(tabs)/calendar.tsx` | 3 | Add "Plan Week" button |

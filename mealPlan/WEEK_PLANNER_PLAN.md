# Week Planner — Implementation Plan

Adds a persistent "Add" button to the tab bar (accessible on every screen), swaps the recipe API from Spoonacular to FatSecret on the search page, and introduces a new "Plan Week" feature on the calendar that uses Claude AI to generate a personalized weekly meal plan from user input and historical data.

## Decisions

| Decision | Choice |
|---|---|
| Persistent Add button placement | Center tab bar slot (custom rendered, not a real tab) |
| Add modal trigger | Global Redux state (`addMealSlotSlice`) controls open/close + prefill |
| Modal rendering location | Root `_layout.tsx` so it renders above all tabs |
| Recipe API | FatSecret (Phase 2 swaps search page + calendar recipe picker; Spoonacular fully removed after Phase 2) |
| FatSecret OAuth | Handled in a Supabase Edge Function (`fatsecret-proxy`) — consumer secret never on client |
| Plan Week entry point | New button in calendar screen bottom-right (replaces the FAB that moved to tab bar) |
| Week planner flow | Full screen route (`/plan-week`) — not a modal |
| AI meal suggestions | New Edge Function `suggest-weekly-meals` modeled after `suggest-foods` |
| AI suggestion output | Day-by-day meal suggestions (name, macros, meal label, reason) |
| Add-to-calendar flow | Reuses existing `AddMealSlotModal` prefill pattern from food suggestions |

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

## Phase 2 — FatSecret API on Search Page

Swap the recipe data source on the search screen from Spoonacular to FatSecret. The recipe picker inside the calendar's `AddMealSlotModal` is left on Spoonacular until Phase 3.

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

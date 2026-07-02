# Food Suggestions Feature Plan

Branch: `feature/food-suggestions`

## Overview

A card on the Macros page that suggests 3–5 specific foods to help the user meet their remaining daily macros. Powered by a Supabase Edge Function calling Claude Opus, personalized by food log history and dietary preferences. Suggestions cache for the day (localStorage on web, AsyncStorage on native). Users can log a suggestion directly to their food log or refresh for new suggestions.

---

## Suggestion Schema

```ts
interface FoodSuggestion {
  name: string       // "Chobani Plain Non-Fat Greek Yogurt"
  brand: string      // "Chobani" (empty string if generic)
  serving: string    // "1 container (150g)"
  calories: number
  protein: number    // grams
  carbs: number      // grams
  fat: number        // grams
  reason: string     // "High protein to close your protein gap"
}
```

---

## Visibility Rules

- **Show card**: `isToday(selectedDate)` AND macro goals exist AND remaining calories > 150
- **Show "You've met your goals!"**: macro goals exist but remaining calories ≤ 150
- **Hide entirely**: no macro goals set, or viewing a past/future date

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/suggest-foods/index.ts` | Edge function: queries history + prefs, calls Claude |
| `mealPlan/src/services/suggestion-cache.ts` | Native cache (AsyncStorage) |
| `mealPlan/src/services/suggestion-cache.web.ts` | Web cache (localStorage) |
| `mealPlan/src/services/food-suggestions-service.ts` | Client service: calls edge function, manages cache |
| `mealPlan/src/store/slices/food-suggestions-slice.ts` | Redux slice for ephemeral session state |
| `mealPlan/src/hooks/use-food-suggestions.ts` | Hook: loads/refreshes suggestions |
| `mealPlan/src/components/macros/food-suggestions-card.tsx` | UI card component |

---

## Files to Modify

| File | Change |
|------|--------|
| `mealPlan/src/store/index.ts` | Register `foodSuggestionsReducer` |
| `mealPlan/src/app/(tabs)/macros/index.tsx` | Mount `<FoodSuggestionsCard>` after MacroAdjustmentCard |

---

## Phase 1 — Edge Function `suggest-foods` ✅

**File:** `supabase/functions/suggest-foods/index.ts`

**Request body:**
```json
{
  "date": "2026-07-02",
  "refresh_prompt": "something light and cold"  // optional, only on refresh
}
```

**Implementation tasks:**

- [x] Scaffold file with CORS headers, auth check, and JSON helper (copy pattern from `parse-ingredients/index.ts`)
- [x] Parse and validate `date` and optional `refresh_prompt` from request body
- [x] Query remaining macros: fetch `macro_goals` for user, fetch today's `food_log_items` (join `food_logs`), compute `remaining = goal - consumed` for each macro
- [x] Query food log history: last 30 days of `food_log_items` joined to `food_logs`, ordered by `fl.date DESC`. Select `food_name, brand_name, calories, protein, carbs, fat` only. Group by food name and count frequency to surface favorites.
- [x] Query dietary preferences: `SELECT tag FROM dietary_preferences WHERE user_id = $1`
- [x] Build Claude prompt with:
  - Remaining macros (calories, protein, carbs, fat)
  - Top 12 most-eaten foods from history (last 7 days weighted 2×)
  - Dietary preference tags (comma-separated)
  - Optional refresh prompt if provided
  - Edge case: if history is empty, note "no history — base suggestions on macro needs and dietary preferences only"
- [x] Call `anthropic.messages.create` with `model: 'claude-opus-4-8'`, tool use for structured output
- [x] Define `suggest_foods` tool with input schema matching `FoodSuggestion[]` (3–5 items required)
- [x] Return `{ suggestions: FoodSuggestion[] }`
- [x] Return 400 for invalid body, 500 with message on Claude error

---

## Phase 2 — Platform-Split Cache Service ✅

**File:** `mealPlan/src/services/suggestion-cache.ts` (native — AsyncStorage)

- [x] Import `AsyncStorage` from `@react-native-async-storage/async-storage`
- [x] Export `getCachedSuggestions(userId: string, date: string): Promise<FoodSuggestion[] | null>`
- [x] Export `cacheSuggestions(userId: string, date: string, suggestions: FoodSuggestion[]): Promise<void>`
- [x] Export `clearSuggestionCache(userId: string, date: string): Promise<void>`

**File:** `mealPlan/src/services/suggestion-cache.web.ts` (web — localStorage)

- [x] Identical interface as native, but use `localStorage.getItem` / `localStorage.setItem` / `localStorage.removeItem`
- [x] Wrap in try/catch (localStorage can throw in private browsing)

---

## Phase 3 — Client Service ✅

**File:** `mealPlan/src/services/food-suggestions-service.ts`

- [x] Import `supabase` from `@/services/supabase` and cache helpers
- [x] Export `FoodSuggestion` interface (imported by cache files and the Redux slice)
- [x] Export `fetchSuggestions(userId: string, date: Date, refreshPrompt?: string): Promise<FoodSuggestion[]>`
  - If `refreshPrompt` is undefined: check cache first; return cached suggestions if present
  - Call `supabase.functions.invoke<{ suggestions: FoodSuggestion[] }>('suggest-foods', { body: { date, refresh_prompt: refreshPrompt } })`
  - On success: write to cache, return suggestions
  - On error: throw (hook will surface to UI)

---

## Phase 4 — Redux Slice ✅

**File:** `mealPlan/src/store/slices/food-suggestions-slice.ts`

State shape:
```ts
{
  suggestions: FoodSuggestion[]
  status: 'idle' | 'loading' | 'success' | 'error'
  error: string | null
  loadedForDate: string | null  // invalidate if date changes
}
```

- [x] Define `initialState`
- [x] Add `setSuggestions(state, action: PayloadAction<{ suggestions: FoodSuggestion[]; date: string }>)` reducer
- [x] Add `setLoading(state)` reducer
- [x] Add `setError(state, action: PayloadAction<string>)` reducer
- [x] Add `clearSuggestions(state)` reducer (called on refresh before re-fetch)
- [x] Export `selectSuggestions`, `selectSuggestionsStatus`, `selectSuggestionsError`, `selectLoadedForDate` selectors

**File:** `mealPlan/src/store/index.ts`

- [x] Import `foodSuggestionsReducer` and register it under key `foodSuggestions`

---

## Phase 4b — Network Check ✅

`src/hooks/use-offline.ts` already existed and was the right primitive:
- Web: reactive via `navigator.onLine` / `online` / `offline` events
- Native: always returns `false` (no NetInfo package; service errors handle it)

No new files needed. Integrated into the hook (Phase 5) and the card component (Phase 6).

---

## Phase 5 — Hook ✅

**File:** `mealPlan/src/hooks/use-food-suggestions.ts`

- [x] Accept `{ userId, date, remainingCalories, hasGoals }` as props
- [x] Read Redux state via selectors
- [x] Call `useOffline()` from `@/hooks/use-offline`
- [x] `loadSuggestions()`: dispatches `setLoading`, calls `fetchSuggestions`, dispatches `setSuggestions` or `setError`
  - Guard: if `isOffline`, dispatch `setError('No internet connection')` and return early
  - Only runs if `remainingCalories > 150 && hasGoals && isToday(date)`
  - Short-circuits if `loadedForDate === date && status === 'success'` (already loaded for today)
- [x] `refresh(refreshPrompt: string)`: dispatches `clearSuggestions`, calls `fetchSuggestions` with `refreshPrompt`, dispatches result
  - Guard: if `isOffline`, dispatch `setError('No internet connection')` and return early
- [x] Return `{ suggestions, status, error, isOffline, eligible, loadSuggestions, refresh }`

---

## Phase 6 — FoodSuggestionsCard Component ✅

**File:** `mealPlan/src/components/macros/food-suggestions-card.tsx`

- [x] Call `useFoodSuggestions` hook
- [x] **Offline state** (`isOffline === true`): show "No internet connection — suggestions require a connection"
- [x] **Idle state**: "Get food suggestions" button → triggers `loadSuggestions()`
- [x] **Loading state**: activity indicator + "Finding suggestions…" text
- [x] **Goals met** (`remainingCalories ≤ 150`): render "You've met your goals for today!" message, no button
- [x] **Success state**: render list of `SuggestionRow` sub-components + "Refresh" button at bottom
- [x] **Error state**: error message + retry button
- [x] **SuggestionRow** (inline sub-component):
  - Shows: name, brand (if present), serving size, macro pills (cal / P / C / F)
  - Shows reason text in smaller muted font
  - "Log" button → opens bottom-sheet modal with label picker and confirm
- [x] **Refresh flow**:
  - Tap "Refresh" → show inline text input "What are you in the mood for? (optional)" with "Get suggestions" confirm button
  - On confirm: call `refresh(inputText)` (empty string OK)
  - Cancel hides the input without refreshing
- [x] **Log flow** (modal within the card):
  - Shows food name, brand, serving, macro pills
  - Label picker (Breakfast / Lunch / Dinner / Snack / Post-workout), defaults to Snack
  - Confirm calls `createFoodLog` via PowerSync directly; shows success state
- [x] Use `useTheme()` + plain `View`/`Text`; follows `styles.card` pattern from macros/index.tsx

---

## Phase 7 — Wire Into Macros Page ✅

**File:** `mealPlan/src/app/(tabs)/macros/index.tsx`

- [x] Add `remainingMacro(name)` helper that reads from `dailyProgress`
- [x] Import and mount `<FoodSuggestionsCard>` after `<MacroAdjustmentCard>`, guarded by `userId && today`
- [x] Pass `remainingCalories`, `remainingProtein`, `remainingCarbs`, `remainingFat`, `hasGoals`

---

## Phase 8 — Deploy Edge Function ✅

- [x] Run from repo root: `npx supabase functions deploy suggest-foods`
- [x] Verify `ANTHROPIC_API_KEY` secret is set: `npx supabase secrets list`
- [ ] Test via web dev server: trigger suggestions on today's macros page
- [ ] Confirm cache works: reload page, verify no second network call
- [ ] Confirm refresh flow: tap refresh, enter a preference, verify new suggestions arrive

---

## Phase 9 — FatSecret Macro Verification ✅

After Claude returns suggestions, the edge function verifies each one against FatSecret in parallel using `Promise.all`. If a confident name match is found, Claude's estimated macros are replaced with FatSecret's verified data and the suggestion is flagged `verified: true`. The UI shows a small "✓ verified" badge on matched items.

**Files changed:**
- `supabase/functions/suggest-foods/index.ts` — added `getFatSecretToken()`, `verifyWithFatSecret()`, `parseFsDescription()`, `isConfidentMatch()` helpers; wired `Promise.all` verification after Claude response
- `mealPlan/src/services/food-suggestions-service.ts` — added `verified: boolean` to `FoodSuggestion` interface
- `mealPlan/src/components/macros/food-suggestions-card.tsx` — added `verifiedBadge` style and "✓ verified" label on `SuggestionRow`

**Match confidence rule:** ≥50% of key words from Claude's suggestion name must appear in the FatSecret result name. Up to 3 FatSecret results are checked per suggestion before falling back to unverified.

---

## Phase 10 — Tutorial Chapter (Macros: Food Suggestions)

Add a chapter to the macro tracking tutorial covering the Food Suggestions card.

- [ ] Add a new chapter entry in `src/constants/tutorial-chapters.ts` under the macros section
- [ ] Create tutorial preview component `src/components/tutorial/previews/FoodSuggestionsPreview.tsx` (static mockup of the card in success state)
- [ ] Write chapter slides: what the card does, how remaining macros drive suggestions, how to refresh with a preference, how to log a suggestion
- [ ] Wire chapter into the tutorial flow in `TUTORIAL_PLAN.md` order

---

## Notes

- **No PowerSync for caching**: suggestions are ephemeral UI state, not synced data. Platform-split cache only.
- **History query runs server-side** in the edge function (direct DB access). Client never fetches raw food log history for this feature.
- **Dietary preferences table**: rows with `user_id` and `tag` columns (15 tags from `src/constants/dietary-tags.ts`).
- **"Meaningful remaining"** threshold is 150 kcal. Below this, show "You've met your goals!" instead of suggestions.
- **No RLS migration needed**: edge function authenticates the user and queries with their UID directly via the Supabase client built with their auth header.
- **Model**: `claude-opus-4-8` for quality suggestions; tool use enforces structured JSON output.

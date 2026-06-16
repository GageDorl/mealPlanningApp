# App Improvements Plan

## Quick Wins

All 8 quick wins completed 2026-06-15.

---

### 1. Grocery List Tooltip ✓
**File:** `mealPlan/src/app/(tabs)/grocery/index.tsx`

Permanent info banner added below the screen header, always visible regardless of list state.

---

### 2. Home Screen Grocery CTA ✓
**File:** `mealPlan/src/components/dashboard/grocery-preview-card.tsx`

Empty state text changed to "Tap to generate your grocery list". The whole card is already pressable and navigates to the grocery screen.

---

### 3. Rename "Most Used" → "Your Recipes" ✓
**File:** `mealPlan/src/components/dashboard/recipe-preview-card.tsx`

Section label updated. Underlying data unchanged.

---

### 4. Prevent Accidental Food Log Modal Dismiss ✓
**File:** `mealPlan/src/components/calendar/add-meal-slot-modal.tsx`

Removed `onPress={onClose}` from the backdrop `Pressable`. Cancel button and Android back button still close the modal.

---

### 5. Search Loading State — Keep Previous Results ✓
**File:** `mealPlan/src/components/calendar/log-food-form.tsx`

Spinner now only shows when there are no previous results (`searchLoading && searchResults.length === 0`). Existing results remain visible while a new query is in flight.

---

### 6. Personal Food Library Loads on Open ✓
**File:** `mealPlan/src/app/(tabs)/profile/food-library.tsx`

Replaced broken `useState(() => { load(''); })` with `useEffect(() => { load(''); }, [load])`. Library now populates on mount as soon as profile is available.

---

### 7. Replace "Now" Button with "+" Add Button ✓
**File:** `mealPlan/src/app/(tabs)/calendar.tsx`

Removed the conditional "Now" FAB. Replaced with a permanent circular "+" FAB (bottom-right) that opens the add-slot/food-log modal with today's date and no time prefilled. Cleaned up unused `scrollY`, `scrollX`, and now-indicator variables.

---

### 8. Auto-Save Manual Food Entries to Personal Library ✓
**File:** `mealPlan/src/services/food-log-service.ts`

`createFoodLog` now fire-and-forgets a deduplication check + insert into `personal_foods` for items with `source === 'manual'`. Uses `LOWER()` comparison to avoid case-sensitive duplicates. Errors are swallowed so they never affect food log creation.

---

## Complex Items (see individual plan files)

| Item | Plan File |
|------|-----------|
| Calendar slot/log visual overhaul + icons | [CALENDAR_VISUAL_PLAN.md](CALENDAR_VISUAL_PLAN.md) |
| Popular recipes on recipe search default | [POPULAR_RECIPES_PLAN.md](POPULAR_RECIPES_PLAN.md) |
| Public food browse screen | [PUBLIC_FOOD_BROWSE_PLAN.md](PUBLIC_FOOD_BROWSE_PLAN.md) |
| Shared status accuracy | [SHARED_STATUS_PLAN.md](SHARED_STATUS_PLAN.md) |

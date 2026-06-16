# Plan: Public Food Browse Screen

## Goal
Give users a dedicated screen to scroll through all approved public foods. This enables
discovery and flagging without requiring a search query. Advanced filtering and sorting
is deferred — Phase 1 is a simple paginated list.

## Current State
- `public_foods` table in Supabase with fields: `id, food_name, brand_name,
  serving_size_amount, serving_size_unit, calories, protein, carbs, fat, approved,
  flagged, submitted_by, created_at` (plus more)
- `public-food-service.ts` has `searchPublicFoods(query)` and `sharePublicFood()` but
  no browse/list function
- `PublicFood` interface already defined in `public-food-service.ts`
- Public foods are accessed via Supabase directly (not PowerSync), which is correct since
  this is community data that doesn't belong in the user's local sync

---

## Phase 1: Service Function — Browse Public Foods
**Status: [ ] Not started**

**File:** `mealPlan/src/services/public-food-service.ts`

Add `browsePublicFoods(page: number, pageSize: number): Promise<PublicFood[]>`:

```ts
export async function browsePublicFoods(page = 0, pageSize = 30): Promise<PublicFood[]> {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabase
    .from('public_foods')
    .select('id, food_name, brand_name, serving_size_amount, serving_size_unit, calories, protein, carbs, fat, fatsecret_id, barcode, approved, flagged, submitted_by, created_at')
    .eq('approved', true)
    .order('food_name', { ascending: true })
    .range(from, to);
  if (error || !data) return [];
  return data as PublicFood[];
}
```

Pagination via `range()` avoids loading the entire table at once.

---

## Phase 2: Browse Screen
**Status: [ ] Not started**

**File to create:** `mealPlan/src/app/(tabs)/profile/food-browse.tsx`

- `FlatList` of public foods with infinite scroll (load next page on `onEndReached`)
- Each row shows: food name, brand (if any), calories per serving, a flag button
- Tapping a row opens a bottom sheet / modal with full nutrition details and a flag option
- Reuse the existing `FoodFlag` / flag modal logic from wherever it currently lives
- Show a loading spinner on initial load and a "Load more" indicator at the bottom

### Screen layout
```
┌─────────────────────────────┐
│ Browse Community Foods      │
│ [search bar — future]       │
├─────────────────────────────┤
│ Apple, Raw          52 kcal │  ⚑
│ Chicken Breast     165 kcal │  ⚑
│ ...                         │
└─────────────────────────────┘
```

---

## Phase 3: Navigation
**Status: [ ] Not started**

Add an entry point to the browse screen. Options:
- A "Browse Community Foods" button on `profile/food-library.tsx` below the personal library list
- Or a tab/link on the food search modal (barcode scanner / food search sheet)

The profile screen is probably cleaner since it's not in the flow of logging food.
Add a pressable row in the Food section of `profile/index.tsx` that navigates to
`/(tabs)/profile/food-browse`.

---

## Deferred: Filtering & Sorting
The following are explicitly deferred until Phase 1–3 are stable and the food database
has grown enough to warrant it:

- Sort by: Most popular (flag count inverse, usage count), Name A–Z, Calories
- Filter by: Calorie range, macros, flagged status
- Category grouping

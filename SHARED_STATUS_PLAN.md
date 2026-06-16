# Plan: Shared Status Accuracy

## Goal
The "already shared" indicator on personal food items is inaccurate — it sometimes shows
as unshared when the food has been shared, and vice versa. Fix it in both the personal
food library screen and wherever food items appear on the calendar.

## Current State & Root Cause Investigation Needed

The `personal_foods` table has no `is_shared` column. Shared status is presumably derived
by checking whether a matching row exists in `public_foods` with `submitted_by = userId`.
This cross-table check may be:
- Not happening at all (the UI is guessing)
- Happening via a Supabase query that isn't being refreshed correctly
- Using a stale local value set at the time of sharing but not kept in sync

**First step before planning the fix:** read `personal-food-service.ts` and
`food-library.tsx` to confirm exactly how shared status is currently determined.

---

## Phase 1: Investigate & Document the Bug
**Status: [ ] Not started**

### Tasks
1. Read `mealPlan/src/services/personal-food-service.ts` — find how `is_shared` or
   equivalent is set/read
2. Read `mealPlan/src/app/(tabs)/profile/food-library.tsx` — find how the UI decides
   whether to show a "shared" indicator
3. Find where on the calendar food items show a shared indicator
4. Document the exact gap between what is stored and what is displayed

---

## Phase 2: Add `is_shared` to `personal_foods`
**Status: [ ] Not started**

The cleanest fix is to add an `is_shared` boolean column to `personal_foods` that is
set to `true` when the user submits the food to the community and is synced locally
via PowerSync. This avoids a runtime cross-table lookup on every render.

### Migration
```sql
ALTER TABLE personal_foods ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT FALSE;
```

### PowerSync Schema
Add `is_shared: column.integer` to the `personal_foods` Table definition.

### When it gets set
In `personal-food-service.ts` / `sharePublicFood` flow: after successfully inserting
into `public_foods`, update the local `personal_foods` row:

```ts
await db.execute(
  'UPDATE personal_foods SET is_shared = 1 WHERE id = ?',
  [personalFoodId],
);
```

This means the PowerSync sync will propagate `is_shared = true` to all the user's devices.

---

## Phase 3: Fix the Library UI
**Status: [ ] Not started**

**File:** `mealPlan/src/app/(tabs)/profile/food-library.tsx`

- The `useQuery` for personal foods should select `is_shared` alongside other fields
- Replace whatever current shared-check logic exists with a simple `row.is_shared === 1`
- Show a "Shared" badge or indicator on items where `is_shared` is true

---

## Phase 4: Fix the Calendar UI
**Status: [ ] Not started**

Locate wherever on the calendar a food item's shared status is displayed (likely inside
`FoodLogDetailModal` or an item row within it) and apply the same `is_shared` field
from the `personal_foods` lookup rather than a derived or guessed value.

---

## Phase 5: Backfill Existing Shared Items
**Status: [ ] Not started**

For users who already have shared foods, `is_shared` will be `false` after the migration
since it defaults to `false`. A one-time backfill is needed:

```sql
UPDATE personal_foods pf
SET is_shared = TRUE
WHERE EXISTS (
  SELECT 1 FROM public_foods pub
  WHERE pub.submitted_by = pf.user_id
  AND pub.food_name = pf.food_name
);
```

This can be run as part of the migration or as a separate one-time script.

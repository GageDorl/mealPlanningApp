# Plan: Popular Recipes on Recipe Search Default View

## Goal
When the user opens the recipe search screen before typing anything, show the top 10
most-used recipes across all users instead of a blank state. Results are cached locally
in PowerSync so they're available offline.

## Current State
- `meal_slot_recipes` table tracks which recipes are assigned to meal slots (has `recipe_id`)
- `recipes` table holds full recipe data including ingredients
- `cached_recipes` local-only table already exists in the PowerSync schema but is used
  for URL-import caching, not popular recipes
- The recipe search screen currently shows nothing until the user types

---

## Phase 1: Supabase Query for Top 10
**Status: [ ] Not started**

### Query
Popular recipes are determined by counting appearances in `meal_slot_recipes` across all users:

```sql
SELECT r.*, COUNT(msr.id) AS use_count
FROM recipes r
JOIN meal_slot_recipes msr ON msr.recipe_id = r.id
GROUP BY r.id
ORDER BY use_count DESC
LIMIT 10;
```

This runs directly against Supabase (not PowerSync — it spans all users' data, not just
the current user's synced rows).

### Service function
**File:** `mealPlan/src/services/recipe-service.ts`

Add `getPopularRecipes(): Promise<Recipe[]>` that runs the query above via `supabase.rpc`
or a raw `.from('recipes').select(...)` with the join. Since Supabase JS doesn't support
`GROUP BY` directly, use an RPC (Postgres function):

```sql
-- supabase/migrations/YYYYMMDD_popular_recipes_fn.sql
CREATE OR REPLACE FUNCTION get_popular_recipes(limit_count int DEFAULT 10)
RETURNS SETOF recipes
LANGUAGE sql STABLE
AS $$
  SELECT r.*
  FROM recipes r
  JOIN (
    SELECT recipe_id, COUNT(*) AS use_count
    FROM meal_slot_recipes
    GROUP BY recipe_id
    ORDER BY use_count DESC
    LIMIT limit_count
  ) ranked ON ranked.recipe_id = r.id
  ORDER BY ranked.use_count DESC;
$$;
```

Then call it with `supabase.rpc('get_popular_recipes', { limit_count: 10 })`.

---

## Phase 2: Local Cache Table
**Status: [ ] Not started**

Popular recipes are fetched from Supabase once and stored locally so they're available
offline and on subsequent opens without a network round-trip.

### PowerSync Schema
**File:** `mealPlan/src/services/powersync-schema.ts`

Add a new local-only table:

```ts
const cached_popular_recipes = new Table(
  { data: column.text, cached_at: column.text },
  { localOnly: true },
);
```

`data` stores the full JSON-serialized `Recipe[]` array (same pattern as `cached_recipes`).

Add `cached_popular_recipes` to the schema export.

### Cache logic
In `getPopularRecipes()`:
1. Check `cached_popular_recipes` for a row with `cached_at` within the last 24 hours
2. If fresh — deserialize and return it
3. If stale or missing — fetch from Supabase, store result, return it

TTL: 24 hours (popular recipes don't change by the minute).

---

## Phase 3: Recipe Search Screen UI
**Status: [ ] Not started**

**File:** `mealPlan/src/app/(tabs)/recipes/saved.tsx` (or whichever screen is the recipe search entry point)

- On mount, call `getPopularRecipes()` and store result in local state as `popularRecipes`
- When `query` is empty, render a "Popular Recipes" section header + the `popularRecipes` list
  using the same recipe card component used for search results
- When `query` is non-empty, hide the popular section and show search results as normal
- The popular section should use the full recipe data (ingredients, macros) so tapping a card
  opens the full detail view without an additional fetch

---

## Phase 4: Full Recipe Data
**Status: [ ] Not started**

Confirm that the recipe data returned by `get_popular_recipes` includes all fields needed
to render the full detail view (ingredients, instructions, macros). The `recipes` table
join in the RPC returns `recipes.*` which should cover this. Verify against the
`RecipeDetailView` component's data requirements and add any missing joins to the RPC
if needed (e.g. `recipe_ingredients`).

If `recipe_ingredients` is needed, the RPC will need to return a JSON-aggregated payload
rather than raw `recipes.*` rows.

# Improvements Plan

Branch: `feature/improvements`

List of fixes to make. Each item below has the current behavior, root cause, and desired outcome based on a pass through the code — no implementation yet.

## 1. Weight graph Y-axis range

**File:** `src/components/macros/macro-trend-chart.tsx`

**Current behavior:** For the weight metric, the axis always starts at 0 and goes up to the next multiple of 100 above the max weight/goal value (lines ~288-304):
```ts
const maxValue = isWeight
  ? Math.max(100, Math.ceil(maxRaw / 100) * 100)
  : ...
```
There is no axis floor concept — min is implicitly 0 (gifted-charts' default). Gridlines are every 10 lbs, labels every 50 lbs.

**Desired behavior:** Axis should range from 10 lbs under the user's minimum weight (rounded down to the nearest 5) to 10 lbs over the user's maximum weight (rounded up to the nearest 5), instead of 0-to-next-100.

**Notes for implementation:**
- Need to compute a true `minRaw` across the same data used for `maxRaw` (weight log values + goal), explicitly excluding the `0` placeholder used for days with no logged weight (`chartPoints` defaults missing days to `value: 0` — this must be filtered out or it will drag the min to 0).
- `react-native-gifted-charts`' `LineChart` (weight is always rendered as a line, per the `useLayoutEffect` at line ~115) needs to be checked for a non-zero-floor axis prop (e.g. `minValue`/`mostNegativeValue`) — BarChart-style 0-floor assumptions may not directly transfer.
- The manually rendered `yAxisLabels` array (lines ~302-304, rendered in a separate `View` at lines ~426-432, since `hideYAxisText`/`yAxisLabelWidth: 0` disable the library's native axis text) must be updated in lockstep with whatever min/max the chart itself uses.

## 2. Meal-slot food items show as "Empty slot" on macro breakdown

**File:** `src/components/macros/meal-macro-breakdown.tsx`, line ~34

**Root cause:** Presentation-layer bug only — the underlying macro totals are correct.
```ts
const hasData = isPlanned ? !!entry.recipe_title : true;
const primaryName = isPlanned ? entry.recipe_title : entry.food_name;
```
`MealMacroEntry` (`src/services/macro-service.ts:44-56`) has two planned shapes: recipe-backed slots (`recipe_title`) and standalone food-item slots from the `meal_slot_foods` table (`food_name`/`brand_name`, added in the multi-item-slot work). `hasData` only checks `recipe_title`, so every standalone food-item slot entry evaluates `hasData = false`, which:
- Renders "Empty slot" instead of the food name (lines ~55-58).
- Renders `–` for all four macro columns instead of the real computed values (lines ~62-73), even though `macro-service.ts` (`plannedFoodEntries`, e.g. lines 211-227 / 332-346 / 530-546) already computed correct calories/protein/carbs/fat for these rows.
- The brand-name display (lines ~51-59) is also gated on `!isPlanned`, so planned food-item entries never get to show `brand_name` either.

**Fix:** Update `hasData`/`primaryName` (and the brand-name branch) in `meal-macro-breakdown.tsx` to also recognize `entry.food_name` for planned entries, not just `entry.recipe_title`.

**Note:** Top-line totals (calorie ring, macro bars) are unaffected since they sum `contributions` independent of this display bug — only the per-meal breakdown list is wrong.

## 3. Add-food-to-meal-slot flow should match add-to-food-log flow

**Meal-slot flow:** `src/components/calendar/add-meal-slot-modal.tsx` (Plan a Meal → Food Item, lines ~638-684)
**Food-log flow:** `src/components/calendar/log-food-form.tsx` (`LogFoodForm`), used via the same modal when logging (lines ~700-710)

**Current gap** — the meal-slot flow only has a single FatSecret search box (`lookupIngredient`) with no serving picker; tapping a result adds it immediately. Compared to the food-log flow, it's missing:
1. **Manual entry mode** — no way to type a custom name + macros.
2. **Barcode scanner** — `BarcodeScanner` (`src/components/food/barcode-scanner.tsx`) is never used in the meal-slot modal.
3. **Personal library / community food search** — `getPersonalFoods` and `searchPublicFoods` are only used in `log-food-form.tsx`; the meal-slot flow only hits FatSecret.
4. **Serving-size picker / weight-based conversion** — food-log flow lets the user pick among official serving descriptions or convert by weight; meal-slot flow takes FatSecret's default serving as-is.
5. **Editable macro fields** — food-log flow lets the user override calories/protein/carbs/fat before saving; meal-slot flow does not.
6. **Multi-source badges** (My Library / Community / FatSecret) — not applicable with only one source.

**Fix:** Reuse `LogFoodForm` (or its underlying search/manual/barcode logic) inside the meal-slot "Food Item" step instead of the standalone FatSecret-only search box, so both flows share the same capabilities.

## 4. Larger tap targets for chart data points on mobile

**File:** `src/components/macros/macro-trend-chart.tsx`

**Current behavior:** Data points on the macro trend charts are small, making them hard to tap accurately on mobile to see the tooltip/value.

**Fix:** Increase the touch/hit target size for data points (and/or the visible dot radius) specifically on mobile so users can reliably tap to see exact values. Needs a look at whatever gifted-charts prop controls point radius / touch area (e.g. `dataPointsRadius`, `focusEnabled`/`radius` props) when implementing.

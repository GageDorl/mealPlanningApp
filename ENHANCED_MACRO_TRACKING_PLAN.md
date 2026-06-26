# Enhanced Macro Tracking with Weight Goals

## Overview

Users can set a goal weight + target date. The app calculates daily macros to hit that goal, prompts
daily weight check-ins, and after 7+ days of data automatically calculates the user's actual TDEE
from logged calories vs. real weight change — then surfaces a macro adjustment for the user to approve.

**Design decisions:**
- `weight_logs` stored as JSONB array on the `users` row (no separate table, already synced)
- `weight_goal` stored as JSONB object on the `users` row (one goal at a time)
- Macro adjustments require user confirmation — never applied automatically
- Users can track macros without a weight goal (banner and adjustment card are conditional)
- Adaptive calc uses actual logged calories vs. actual weight change — not the user's goals

---

## Data shapes

```ts
// users.weight_logs — JSONB array
type WeightLogEntry = {
  date: string;        // 'YYYY-MM-DD'
  weight_lbs: number;
};

// users.weight_goal — JSONB object (null when no active goal)
type WeightGoal = {
  goal_weight_lbs: number;
  goal_date: string;           // 'YYYY-MM-DD'
  baseline_weight_lbs: number; // weight when goal was set
  baseline_date: string;       // date goal was set
  last_dismissed_at?: string;  // ISO timestamp — suppresses adjustment card for 7 days
};
```

---

## Adaptive TDEE math

```
actual_surplus_kcal = weight_change_lbs × 3500
actual_tdee = (total_logged_kcal − actual_surplus_kcal) / days
new_calorie_goal = actual_tdee + daily_deficit_target
```

`daily_deficit_target` comes from the weight goal:
```
lbs_to_lose = current_weight − goal_weight
weeks_remaining = days_until_goal / 7
weekly_rate = lbs_to_lose / weeks_remaining        // capped at ±2 lbs/week
daily_deficit_target = -(weekly_rate × 3500) / 7  // negative = deficit, positive = surplus
```

**Outlier detection:** A day is flagged as suspicious (likely incomplete log) if any of the following are true:
- Logged calories < 800 kcal for the day
- No food log entries at all for the day
- Weight increased from the previous day's log AND logged calories were low enough that a gain is implausible

Before running the TDEE calc, flagged days are shown to the user — "It looks like you may not have logged everything on [date]. Should we include this day?" — and they can exclude any of them from the calculation.

---

## Tasks

### Phase 1 — Schema & Sync

- [x] **Migration** `supabase/migrations/20260625000002_weight_tracking.sql`
  - `ALTER TABLE users ADD COLUMN weight_logs JSONB NOT NULL DEFAULT '[]';`
  - `ALTER TABLE users ADD COLUMN weight_goal JSONB;`

- [x] **PowerSync schema** `mealPlan/src/services/powersync-schema.ts`
  - Add `weight_logs: column.text` and `weight_goal: column.text` to the `users` table definition
  - Bump `SCHEMA_VERSION` constant in `powersync.tsx` and `powersync.web.tsx` (triggers local DB wipe + re-sync)

- [x] **Sync rules** `powersync/sync.yaml`
  - No change needed — `user_data` stream already syncs `SELECT * FROM users WHERE id = auth.user_id()`

---

### Phase 2 — Service Layer

- [x] **`mealPlan/src/services/weight-log-service.ts`** (new file)
  - `getWeightLogs(user): WeightLogEntry[]` — parse `user.weight_logs` JSON
  - `getWeightGoal(user): WeightGoal | null` — parse `user.weight_goal` JSON
  - `hasLoggedToday(user): boolean` — check if today's date exists in weight_logs
  - `upsertWeightLog(userId, entry): Promise<void>` — merge entry into array, write back via Supabase upsert on `users`
  - `setWeightGoal(userId, goal): Promise<void>` — write new goal object to `users.weight_goal`
  - `clearWeightGoal(userId): Promise<void>` — set `users.weight_goal = null`
  - `dismissAdjustment(userId): Promise<void>` — set `last_dismissed_at` on current goal

- [x] **`mealPlan/src/services/adaptive-macro-service.ts`** (new file)
  - `hasEnoughData(weightLogs, foodLogs): boolean` — need ≥ 7 days with both a weight entry and food log entries
  - `detectSuspiciousDays(weightLogs, foodLogs): string[]` — return dates that are likely incomplete logs:
    - Total logged kcal < 800, OR
    - No food log entries at all, OR
    - Weight increased from the prior logged day AND kcal logged is low enough to make that gain implausible
  - `calculateActualTdee(weightLogs, foodLogs, excludeDates): number` — core TDEE calc using the formula above
  - `buildMacroAdjustment(actualTdee, weightGoal, currentWeightLbs, existingGoals): MacroAdjustment`
    - Returns `{ calories, protein, carbs, fat }` using same protein-per-lb + carb/fat-split logic as macro-planner-service
  - `isDismissed(weightGoal): boolean` — true if `last_dismissed_at` was < 7 days ago

  ```ts
  export type MacroAdjustment = {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    actualTdee: number;
    dailyDeficit: number;
  };
  ```

- [x] **`mealPlan/src/services/macro-planner-service.ts`** (modify)
  - Extract `calculateDailyDeficit(currentWeightLbs, goalWeightLbs, goalDate): number` — usable by both the planner screen and adaptive service
  - Replace fixed `goalAdjustments` multipliers with timeline-based calorie deficit when a weight goal is provided (fall back to current multipliers when no goal is set)

---

### Phase 3 — Macro Planner: Goal Weight + Date

- [x] **`mealPlan/src/app/(tabs)/profile/macro-planner.tsx`** (modify)
  - Add "Weight Goal" collapsible section below the existing inputs
  - Inputs: goal weight (lbs, text input) + target date (calendar picker — `DateTimePickerModal` from `react-native-modal-datetime-picker` or similar)
  - Show calculated weekly rate: `(current − goal) / weeks_remaining` lbs/week
  - Show warning badge if rate > 2 lbs/week ("This is an aggressive goal — consider a longer timeline") or if rate is negative for a loss goal
  - On "Apply Recommendation": also call `setWeightGoal()` with baseline = current weight input value + today's date
  - On "Clear Goal": call `clearWeightGoal()`

---

### Phase 4 — Daily Weight Logging UI

- [x] **`mealPlan/src/components/WeightLogModal.tsx`** (new file)
  - Props: `visible`, `onClose`, `onSave(entry: WeightLogEntry)`
  - Weight input (numeric, lbs) + date selector (defaults to today, can back-fill past days)
  - "Save" calls `upsertWeightLog()` then `onClose()`

- [x] **`mealPlan/src/components/DailyWeightBanner.tsx`** (new file)
  - Props: `userId` — queries weight_goal and weight_logs internally via useQuery
  - Renders nothing if: no `weight_goal` OR `hasLoggedToday(weightLogs)` is true
  - When visible: compact card — "Log today's weight to track your progress" + "Log Weight" button
  - Button opens `WeightLogModal`

---

### Phase 5 — Home Screen Banner

- [x] **`mealPlan/src/app/(tabs)/index.tsx`** (modify)
  - Add `<DailyWeightBanner userId={profile.user.id} />` below `NudgeBanner`

---

### Phase 6 — Macro Adjustment Card (Macros Screen)

- [x] **`mealPlan/src/app/(tabs)/macros/index.tsx`** (modify)
  - After existing macro ring/summary: conditionally render `<MacroAdjustmentCard />`
  - Show card when: `hasEnoughData()` AND `!isDismissed(weightGoal)` AND user has a weight goal
  - Card flow:
    1. If `detectSuspiciousDays()` returns dates: show them first — each flagged day shows the reason (e.g. "Only 320 kcal logged" or "No food logged but weight went up"). User can tap to include or exclude each day from the calc
    2. After resolving incomplete days: show "Based on your actual intake and weight change, your estimated TDEE is X kcal/day" + new macro targets
    3. "Apply" → calls service to upsert new values into `macro_goals` rows, then closes card
    4. "Dismiss" → calls `dismissAdjustment()`, card hides for 7 days

- [x] **`mealPlan/src/components/MacroAdjustmentCard.tsx`** (new file)
  - Encapsulates the full adjustment card UI + state (incomplete day toggles, loading state for apply)
  - Props: `user`, `weightLogs`, `foodLogs`, `weightGoal`, `onApplied`, `onDismissed`

---

## Implementation order

1. Phase 1 (migration + schema) — push migration to Supabase immediately so data can accumulate
2. Phase 2 (services) — pure logic, no UI dependencies
3. Phase 3 (macro planner goal setting) — unblocks the rest (no weight goal = no banner or card)
4. Phase 4 + 5 (weight log modal + home banner) — users can start logging
5. Phase 6 (adjustment card) — last, needs real data to be meaningful

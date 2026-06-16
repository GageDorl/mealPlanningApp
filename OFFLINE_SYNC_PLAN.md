# Offline-First Sync Plan

## Overview

This app uses **PowerSync** to maintain a local SQLite copy of the user's data on-device. All reads come from local SQLite — the screen renders immediately on open without waiting for a network call. PowerSync syncs with Supabase in the background. All writes go to local SQLite first; PowerSync queues them and replays them to Supabase when connectivity is available.

**What works offline:** Everything except external API calls (FatSecret food search, Claude AI recipe URL parsing, Google Calendar event fetch, barcode lookup against unknown items).

**Tech context:**
- Package installed: `@powersync/react-native` v1.35.1 (native only; web not yet installed)
- Supabase client: `mealPlan/src/services/supabase.ts`
- Current broken PowerSync provider: `mealPlan/src/services/powersync.tsx`
- Existing (but unused) model files: `mealPlan/src/models/`
- DB schema reference: `supabase/migrations/20260522000000_initial_schema.sql`
- Env vars needed: `POWERSYNC_URL` (already in `mealPlan/src/constants/env.ts`)

---

## Phase 1 — Fix PowerSync Foundation

### Context

`mealPlan/src/services/powersync.tsx` currently does this:

```tsx
const RawPowerSyncProvider: any = (require('@powersync/react-native') as any).PowerSyncProvider;
// ...
<PowerSyncProviderImpl syncUrl={env.POWERSYNC_URL} databaseName="prepd" tables={syncTables as any}>
```

This is not the correct `@powersync/react-native` API. The SDK requires:
1. A `Schema` (built from `Table` + `Column` from the SDK) passed to `PowerSyncDatabase`
2. A `PowerSyncBackendConnector` that provides auth tokens and handles write upload
3. A `PowerSyncDatabase` singleton instantiated with the schema
4. The database connected to the connector on app start via `db.connect(connector)`
5. The database instance provided to the component tree via `PowerSyncContext.Provider`

Without a connector, PowerSync never authenticates and never syncs. The existing model files in `mealPlan/src/models/` use a custom object format (`{ name: 'text', columns: { ... } }`) — these are not SDK `Table` instances and cannot be passed to `PowerSyncDatabase`.

Also: `mealPlan/src/models/grocery.ts` defines a `groceries` table that does not exist in the database. The real tables are `grocery_lists` and `grocery_items`.

---

### 1.1 — Create the PowerSync schema

**Create** `mealPlan/src/services/powersync-schema.ts`

Define a `Schema` using the SDK's `Table` and `Column` classes. This replaces all the raw `xxxTable` objects in `mealPlan/src/models/`. Column types map as: `TEXT` → `Column.text()`, `INTEGER`/`BOOLEAN` → `Column.integer()`, `NUMERIC`/`REAL` → `Column.real()`, `JSONB`/`JSON` → `Column.text()` (store as JSON string).

Column names must exactly match the Supabase DB column names (snake_case). Reference `supabase/migrations/20260522000000_initial_schema.sql` for the ground truth.

```ts
import { Schema, Table, Column } from '@powersync/react-native';

const users = new Table({
  email: Column.text(),
  display_name: Column.text(),
  auth_method: Column.text(),
  onboarding_completed: Column.integer(),
  tutorial_completed: Column.integer(),
  tier: Column.text(),
  notification_meal_reminders: Column.integer(),
  notification_planning_nudges: Column.integer(),
  notification_macro_checkins: Column.integer(),
  selected_calendar_ids: Column.text(),   // JSON string, added in Phase 4
  calendar_export_enabled: Column.integer(), // added in Phase 4
  created_at: Column.text(),
  updated_at: Column.text(),
});

const recipes = new Table({
  user_id: Column.text(),
  title: Column.text(),
  description: Column.text(),
  image_url: Column.text(),
  prep_minutes: Column.integer(),
  cook_minutes: Column.integer(),
  servings: Column.integer(),
  difficulty: Column.text(),
  cuisine_type: Column.text(),
  source_type: Column.text(),
  source_url: Column.text(),
  source_api_id: Column.text(),
  is_favorited: Column.integer(),
  is_offline_available: Column.integer(),
  calories_per_serving: Column.real(),
  protein_per_serving: Column.real(),
  carbs_per_serving: Column.real(),
  fat_per_serving: Column.real(),
  fiber_per_serving: Column.real(),
  sugar_per_serving: Column.real(),
  sodium_per_serving: Column.real(),
  instructions: Column.text(),   // JSON string
  dietary_tags: Column.text(),   // JSON string
  created_at: Column.text(),
  updated_at: Column.text(),
});

const recipe_ingredients = new Table({
  recipe_id: Column.text(),
  ingredient_id: Column.text(),
  raw_text: Column.text(),
  name: Column.text(),
  quantity: Column.real(),
  unit: Column.text(),
  display_order: Column.integer(),
  calories: Column.real(),
  protein: Column.real(),
  carbs: Column.real(),
  fat: Column.real(),
});

const ingredients = new Table({
  usda_fdc_id: Column.text(),
  name: Column.text(),
  category: Column.text(),
  calories_per_100g: Column.real(),
  protein_per_100g: Column.real(),
  carbs_per_100g: Column.real(),
  fat_per_100g: Column.real(),
  fiber_per_100g: Column.real(),
  sugar_per_100g: Column.real(),
  sodium_per_100g: Column.real(),
  price: Column.real(),
  created_at: Column.text(),
});

const meal_plans = new Table({
  user_id: Column.text(),
  week_start: Column.text(),
  created_at: Column.text(),
  updated_at: Column.text(),
});

const meal_slots = new Table({
  meal_plan_id: Column.text(),
  recipe_id: Column.text(),
  label: Column.text(),
  date: Column.text(),
  time_of_day: Column.text(),
  serving_override: Column.integer(),
  external_event_id: Column.text(),
  display_order: Column.integer(),
  created_at: Column.text(),
  updated_at: Column.text(),
});

const macro_goals = new Table({
  user_id: Column.text(),
  macro_name: Column.text(),
  daily_target: Column.real(),
  unit: Column.text(),
  display_order: Column.integer(),
  is_active: Column.integer(),
  created_at: Column.text(),
});

const dietary_preferences = new Table({
  user_id: Column.text(),
  tag: Column.text(),
  created_at: Column.text(),
});

const food_logs = new Table({
  user_id: Column.text(),
  date: Column.text(),
  created_at: Column.text(),
  updated_at: Column.text(),
});

const food_log_items = new Table({
  food_log_id: Column.text(),
  name: Column.text(),
  calories: Column.real(),
  protein: Column.real(),
  carbs: Column.real(),
  fat: Column.real(),
  quantity: Column.real(),
  unit: Column.text(),
  fatsecret_id: Column.text(),
  personal_food_id: Column.text(),
  created_at: Column.text(),
  updated_at: Column.text(),
});

const personal_food = new Table({
  user_id: Column.text(),
  food_name: Column.text(),
  brand_name: Column.text(),
  barcode: Column.text(),   // added in Phase 9; nullable
  serving_size_amount: Column.real(),
  serving_size_unit: Column.text(),
  calories: Column.real(),
  protein: Column.real(),
  carbs: Column.real(),
  fat: Column.real(),
  saturated_fat: Column.real(),
  trans_fat: Column.real(),
  cholesterol: Column.real(),
  sodium: Column.real(),
  dietary_fiber: Column.real(),
  total_sugar: Column.real(),
  added_sugar: Column.real(),
  fatsecret_id: Column.text(),
  created_at: Column.text(),
  updated_at: Column.text(),
});

const pantry_staples = new Table({
  user_id: Column.text(),
  ingredient_name: Column.text(),
  created_at: Column.text(),
});

const grocery_lists = new Table({
  user_id: Column.text(),
  meal_plan_id: Column.text(),
  generated_at: Column.text(),
  created_at: Column.text(),
  updated_at: Column.text(),
});

const grocery_items = new Table({
  grocery_list_id: Column.text(),
  ingredient_id: Column.text(),
  name: Column.text(),
  quantity: Column.real(),
  unit: Column.text(),
  category: Column.text(),
  is_checked: Column.integer(),
  created_at: Column.text(),
  updated_at: Column.text(),
});

export const AppSchema = new Schema({
  users,
  recipes,
  recipe_ingredients,
  ingredients,
  meal_plans,
  meal_slots,
  macro_goals,
  dietary_preferences,
  food_logs,
  food_log_items,
  personal_food,
  pantry_staples,
  grocery_lists,
  grocery_items,
});

export type Database = (typeof AppSchema)['types'];
```

- [x] Create `mealPlan/src/services/powersync-schema.ts` with the full schema above (add any missing columns by cross-referencing `supabase/migrations/20260522000000_initial_schema.sql`)

---

### 1.2 — Create the PowerSync database singleton

**Create** `mealPlan/src/services/powersync-database.ts`

This creates the single `db` instance used everywhere. Import it directly in services/hooks that need to run queries or writes.

```ts
import { PowerSyncDatabase } from '@powersync/react-native';
import { AppSchema } from './powersync-schema';

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: 'prepd.db' },
});
```

- [x] Create `mealPlan/src/services/powersync-database.ts` with the above content

---

### 1.3 — Create the PowerSync connector

**Create** `mealPlan/src/services/powersync-connector.ts`

The connector does two things:
- `fetchCredentials()`: provides the Supabase JWT so PowerSync can authenticate to download data
- `uploadData()`: called by PowerSync when there are local writes queued — this replays them to Supabase

```ts
import {
  AbstractPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/react-native';
import { supabase } from './supabase';
import env from '@/constants/env';

export class SupabasePowerSyncConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return {
      endpoint: env.POWERSYNC_URL,
      token: session.access_token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const batch = await database.getCrudBatch(200);
    if (!batch) return;

    try {
      for (const op of batch.crud) {
        await this.applyOperation(op);
      }
      await batch.complete();
    } catch (e) {
      // Do NOT call batch.complete() on error — PowerSync will retry
      throw e;
    }
  }

  private async applyOperation(op: CrudEntry): Promise<void> {
    const { table, op: type, id, opData } = op;
    if (type === UpdateType.PUT) {
      const { error } = await supabase.from(table).upsert({ id, ...opData });
      if (error) throw error;
    } else if (type === UpdateType.PATCH) {
      const { error } = await supabase.from(table).update(opData ?? {}).eq('id', id);
      if (error) throw error;
    } else if (type === UpdateType.DELETE) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    }
  }
}
```

- [x] Create `mealPlan/src/services/powersync-connector.ts` with the above content

---

### 1.4 — Rewrite the PowerSync provider

**Rewrite** `mealPlan/src/services/powersync.tsx`

Replace the entire file. The provider connects the database to the connector on mount and exposes `db` via React context so hooks can call `usePowerSync()` to get the instance.

```tsx
import { useEffect, type ReactNode } from 'react';
import { PowerSyncContext } from '@powersync/react-native';
import { db } from './powersync-database';
import { SupabasePowerSyncConnector } from './powersync-connector';

export function PowerSyncProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const connector = new SupabasePowerSyncConnector();
    db.connect(connector);
    return () => { db.disconnect(); };
  }, []);

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
}
```

- [x] Rewrite `mealPlan/src/services/powersync.tsx` with the above content

---

### 1.5 — Fix the grocery model

**Rewrite** `mealPlan/src/models/grocery.ts`

The current file exports a `groceryTable` that maps to a `groceries` table which does not exist in the database. Replace with TypeScript interfaces for `grocery_lists` and `grocery_items` (the actual DB tables). The PowerSync table definitions are now in `powersync-schema.ts` — these interfaces are just for TypeScript typing in the rest of the app.

```ts
export interface GroceryList {
  id: string;
  user_id: string;
  meal_plan_id: string;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export interface GroceryItem {
  id: string;
  grocery_list_id: string;
  ingredient_id?: string | null;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  category?: string | null;
  is_checked: number; // 0 or 1 — SQLite stores booleans as integers
  created_at: string;
  updated_at: string;
}
```

- [x] Rewrite `mealPlan/src/models/grocery.ts` with the above interfaces; remove all `xxxTable` exports

---

### 1.6 — Audit existing model files

The files in `mealPlan/src/models/` export both TypeScript interfaces (keep these) and `xxxTable` constant objects in a custom format (these can be removed now that `powersync-schema.ts` is the source of truth). Update each file:

- [x] **Modify** `mealPlan/src/models/user.ts` — keep `User` interface; remove `userTable` export
- [x] **Modify** `mealPlan/src/models/recipe.ts` — keep `Recipe` interface; remove `recipeTable` export
- [x] **Modify** `mealPlan/src/models/meal-plan.ts` — keep interfaces; remove table exports
- [x] **Modify** `mealPlan/src/models/meal-slot.ts` — keep interfaces; remove table exports
- [x] **Modify** `mealPlan/src/models/food-log.ts` — keep interfaces; remove table exports
- [x] **Modify** `mealPlan/src/models/personal-food.ts` — keep `PersonalFood` interface; remove `personalFoodTable` export
- [x] **Modify** `mealPlan/src/models/ingredient.ts` — keep interfaces; remove table exports
- [x] Fix any import errors caused by removing the `xxxTable` exports (grep for usages with `grep -r "groceryTable\|userTable\|recipeTable\|mealPlanTable\|mealSlotTable\|foodLogTable\|personalFoodTable\|ingredientTable" mealPlan/src`)

---

## Phase 2 — PowerSync Sync Rules

### Context

PowerSync needs a YAML file that defines which database rows to sync down to each user's device. Without this, PowerSync downloads nothing. The rules live in a file you upload to the PowerSync Cloud dashboard — they are not part of the app code.

The rules use a "bucket" model: a bucket is a logical group of rows. Each user gets their own bucket containing only their data.

---

### 2.1 — Create sync.yaml

**Create** `powersync/sync.yaml` with the following content:

```yaml
bucket_definitions:
  user_data:
    # One bucket per user, parameterized by the JWT's user_id claim
    parameters: SELECT id FROM users WHERE id = token_parameters.user_id
    data:
      - SELECT * FROM users WHERE id = bucket.id
      - SELECT * FROM recipes WHERE user_id = bucket.id
      - SELECT * FROM macro_goals WHERE user_id = bucket.id
      - SELECT * FROM dietary_preferences WHERE user_id = bucket.id
      - SELECT ri.* FROM recipe_ingredients ri
          JOIN recipes r ON r.id = ri.recipe_id
          WHERE r.user_id = bucket.id
      - SELECT * FROM meal_plans WHERE user_id = bucket.id
      - SELECT ms.* FROM meal_slots ms
          JOIN meal_plans mp ON mp.id = ms.meal_plan_id
          WHERE mp.user_id = bucket.id
      - SELECT * FROM food_logs WHERE user_id = bucket.id
      - SELECT fli.* FROM food_log_items fli
          JOIN food_logs fl ON fl.id = fli.food_log_id
          WHERE fl.user_id = bucket.id
      - SELECT * FROM personal_food WHERE user_id = bucket.id
      - SELECT * FROM pantry_staples WHERE user_id = bucket.id
      - SELECT * FROM grocery_lists WHERE user_id = bucket.id
      - SELECT gi.* FROM grocery_items gi
          JOIN grocery_lists gl ON gl.id = gi.grocery_list_id
          WHERE gl.user_id = bucket.id

  global_ingredients:
    # Shared lookup table — all users get all rows
    data:
      - SELECT * FROM ingredients
```

- [x] Create `powersync/sync.yaml` with the above content

---

### 2.2 — Upload sync rules (manual step)

- [x] Log into the PowerSync Cloud dashboard
- [x] Navigate to the project → **Sync Rules** tab
- [x] Paste or upload `powersync/sync.yaml` and click **Deploy**

---

## Phase 3 — PowerSync Web Implementation

### Context

`mealPlan/src/services/powersync.web.tsx` currently exports a no-op provider that just renders children — no sync happens on web. The `@powersync/web` package provides a web-compatible PowerSync implementation using WASM SQLite. It requires a SharedWorker to run sync in a background thread.

Files ending in `.web.tsx` / `.web.ts` are automatically loaded instead of their `.tsx` / `.ts` counterparts on web (Metro platform splits). So `powersync.web.tsx` is what runs in the browser.

`@powersync/web` provides a webpack plugin that copies the necessary worker and WASM files into the build output. Expo web uses webpack under the hood (configurable via `webpack.config.js`).

---

### 3.1 — Install the web package

- [x] Run `npm install @powersync/web` inside `mealPlan/`
- [x] Confirm `@journeyapps/wa-sqlite` appears in `node_modules` (it ships as a dependency of `@powersync/web`)

---

### 3.2 — Configure Metro for WASM assets

This app uses Expo SDK 56 with the Metro bundler for web (not webpack). The webpack step in the original plan does not apply.

- [x] **Modify** `mealPlan/metro.config.js` — add `.wasm` to `assetExts` and remove it from `sourceExts` so Metro passes WASM files through as binary assets instead of trying to parse them as JavaScript.
- [ ] **Deploy headers** — the production server (EAS / CDN) must set `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` on all responses. Without them, SharedArrayBuffer is unavailable and the WASM SQLite worker will not start in deployed builds.

---

### 3.3 — Create the web connector

**Create** `mealPlan/src/services/powersync-connector.web.ts`

Identical logic to the native connector but typed for `@powersync/web`. The web and native packages share a compatible `PowerSyncBackendConnector` interface.

```ts
import type { AbstractPowerSyncDatabase, CrudEntry, PowerSyncBackendConnector, UpdateType } from '@powersync/web';
import { supabase } from './supabase';
import env from '@/constants/env';

export class SupabasePowerSyncConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return { endpoint: env.POWERSYNC_URL, token: session.access_token };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const batch = await database.getCrudBatch(200);
    if (!batch) return;
    try {
      for (const op of batch.crud) {
        const { table, op: type, id, opData } = op;
        if (type === 'PUT' as UpdateType) {
          const { error } = await supabase.from(table).upsert({ id, ...opData });
          if (error) throw error;
        } else if (type === 'PATCH' as UpdateType) {
          const { error } = await supabase.from(table).update(opData ?? {}).eq('id', id);
          if (error) throw error;
        } else if (type === 'DELETE' as UpdateType) {
          const { error } = await supabase.from(table).delete().eq('id', id);
          if (error) throw error;
        }
      }
      await batch.complete();
    } catch (e) {
      throw e;
    }
  }
}
```

- [x] Create `mealPlan/src/services/powersync-connector.web.ts` with the above content

---

### 3.4 — Create the web database singleton

**Create** `mealPlan/src/services/powersync-database.web.ts`

```ts
import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from './powersync-schema';

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'prepd.db',
    // Uses a SharedWorker for background sync; falls back to a regular Worker
    // if SharedWorker is unavailable (e.g. non-HTTPS in dev without the headers)
  },
});
```

- [x] Create `mealPlan/src/services/powersync-database.web.ts` with the above content

---

### 3.5 — Rewrite the web PowerSync provider

**Rewrite** `mealPlan/src/services/powersync.web.tsx`

Same structure as the native provider in Phase 1.4, but uses the web-specific imports:

```tsx
import { useEffect, type ReactNode } from 'react';
import { PowerSyncContext } from '@powersync/web';
import { db } from './powersync-database.web';
import { SupabasePowerSyncConnector } from './powersync-connector.web';

export function PowerSyncProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const connector = new SupabasePowerSyncConnector();
    db.connect(connector);
    return () => { db.disconnect(); };
  }, []);

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
}
```

- [x] Rewrite `mealPlan/src/services/powersync.web.tsx` with the above content

---

## Phase 4 — Calendar: DB-Backed Connection + Cross-Device

### Context

`mealPlan/src/services/calendar.ts` tracks whether the user has connected Google Calendar using a module-level `_connected` flag and the AsyncStorage key `@prepd/calendar_connected`. Selected calendar IDs are also stored only in AsyncStorage (`@prepd/calendar_selected_ids`).

This means if a user connects Google Calendar on device A, signing in on device B shows the calendar as disconnected — AsyncStorage is device-local.

The fix: on login, check the `calendar_tokens` table in Supabase (this table already exists — see `supabase/migrations/20260604000000_calendar_tokens.sql`). If a row exists for the user, they are connected. Store selected calendar IDs and export preferences in new columns on the `users` table so PowerSync syncs them across devices.

---

### 4.1 — Add calendar pref columns to users table

**Create** `supabase/migrations/20260614000000_user_calendar_prefs.sql`:

```sql
ALTER TABLE users
  ADD COLUMN selected_calendar_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN calendar_export_enabled BOOLEAN NOT NULL DEFAULT FALSE;
```

- [x] Create `supabase/migrations/20260614000000_user_calendar_prefs.sql`
- [x] Run `npx supabase db push` from `mealPlanningApp/` to apply

Note: `selected_calendar_ids` is already included in the `users` table definition in `powersync-schema.ts` from Phase 1.1 — no schema update needed there.

---

### 4.2 — Add calendar pref helpers to user service

**Modify** `mealPlan/src/services/user-service.ts` — add two functions:

```ts
// Read selected_calendar_ids + calendar_export_enabled from Supabase
// (used on first login before local PowerSync DB is populated)
export async function getCalendarPrefs(userId: string): Promise<{
  selected_calendar_ids: string[];
  calendar_export_enabled: boolean;
}> {
  const { data, error } = await supabase
    .from('users')
    .select('selected_calendar_ids, calendar_export_enabled')
    .eq('id', userId)
    .single();
  if (error || !data) return { selected_calendar_ids: [], calendar_export_enabled: false };
  return {
    selected_calendar_ids: data.selected_calendar_ids ?? [],
    calendar_export_enabled: data.calendar_export_enabled ?? false,
  };
}

// Write calendar prefs to local PowerSync DB so they sync to Supabase via uploadData()
export async function setCalendarPrefs(
  db: PowerSyncDatabase,
  userId: string,
  prefs: { selected_calendar_ids?: string[]; calendar_export_enabled?: boolean },
): Promise<void> {
  const updates: string[] = [];
  const values: unknown[] = [];
  if (prefs.selected_calendar_ids !== undefined) {
    updates.push('selected_calendar_ids = ?');
    values.push(JSON.stringify(prefs.selected_calendar_ids));
  }
  if (prefs.calendar_export_enabled !== undefined) {
    updates.push('calendar_export_enabled = ?');
    values.push(prefs.calendar_export_enabled ? 1 : 0);
  }
  if (updates.length === 0) return;
  values.push(userId);
  await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
}
```

- [x] Add `getCalendarPrefs` and `setCalendarPrefs` to `mealPlan/src/services/user-service.ts`
- [x] Used a local `PsDb` duck-type interface (works with both native and web PowerSync instances)

---

### 4.3 — Update calendar service for DB-backed connection

**Modify** `mealPlan/src/services/calendar.ts` — update these four functions:

**`restoreSession()`** — currently only checks AsyncStorage, then calls the `isConnected` edge function on web. Change to:
1. Check `AsyncStorage.getItem(CONNECTED_KEY)` → if `'true'`, return true immediately (fast path for repeat opens)
2. If not in AsyncStorage: query `supabase.from('calendar_tokens').select('user_id').eq('user_id', getCachedUserId()).single()` — if a row is found, the user is connected on another device
3. If connected: set `_connected = true`, write `CONNECTED_KEY = 'true'` to AsyncStorage, return true
4. Remove the existing web-only `callFunction('google-calendar', { action: 'isConnected' })` call — the `calendar_tokens` DB query replaces it on all platforms

**`getSelectedCalendarIds()`** — change to:
1. Try `AsyncStorage.getItem(SELECTED_CALENDARS_KEY)` → if found, return parsed value
2. On miss: call `getCalendarPrefs(userId)` from user-service, cache the result in AsyncStorage, return it

**`setSelectedCalendarIds(ids)`** — change signature to `setSelectedCalendarIds(db, ids)` and:
1. Write to AsyncStorage immediately
2. Call `setCalendarPrefs(db, userId, { selected_calendar_ids: ids })`

**`getCalendarExportEnabled()`** — change to:
1. Try AsyncStorage; on miss, call `getCalendarPrefs(userId)`, cache, and return

**`setCalendarExportEnabled(enabled)`** — change signature to `setCalendarExportEnabled(db, enabled)` and:
1. Write to AsyncStorage
2. Call `setCalendarPrefs(db, userId, { calendar_export_enabled: enabled })`

- [x] Apply the above changes to `mealPlan/src/services/calendar.ts`
- [x] Updated call sites in `mealPlan/src/hooks/use-calendar.ts` to pass `db` (from `usePowerSync()`) as the first argument

---

## Phase 5 — Migrate Writes to PowerSync Local DB

### Context

Every service function that mutates data currently calls Supabase directly (e.g. `supabase.from('recipes').insert(...)`). This means writes fail when offline.

The fix: replace Supabase mutation calls with `db.execute(sql, params)` — this writes to local SQLite and PowerSync queues the operation. When connectivity is available, `uploadData()` (from Phase 1.3) replays it to Supabase.

**Pattern — before and after:**
```ts
// Before (fails offline):
const { error } = await supabase.from('recipes').insert({ id, title, user_id, ... });

// After (works offline):
await db.execute(
  'INSERT INTO recipes (id, title, user_id, ...) VALUES (?, ?, ?, ...)',
  [id, title, userId, ...]
);
// PowerSync's uploadData() will later call supabase.from('recipes').upsert({ id, title, ... })
```

**How hooks get `db`:** Each hook calls `const db = usePowerSync()` from `@powersync/react-native` and passes it to service functions that need it. Service functions now accept `db` as their first parameter.

**ID generation:** Since writes now happen locally before going to Supabase, UUIDs must be generated client-side. Use `crypto.randomUUID()` (available in React Native 0.73+ and all modern browsers) or import a UUID library if not available.

---

### 5.1 — Recipe service writes

**Modify** `mealPlan/src/services/recipe-service.ts`

- [x] `createRecipe(db, data)` → `db.execute('INSERT INTO recipes (id, user_id, title, ...) VALUES (?, ?, ?, ...)', [...])`
- [x] `updateRecipe(db, id, data)` → `db.execute('UPDATE recipes SET title = ?, ... WHERE id = ?', [...])`
- [x] `deleteRecipe(db, id)` → `db.execute('DELETE FROM recipes WHERE id = ?', [id])` followed by `db.execute('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [id])`
- [x] `saveRecipeIngredients(db, recipeId, ingredients)` → loop calling `db.execute('INSERT INTO recipe_ingredients (...) VALUES (...)', [...])`
- [x] All functions must accept `db: PowerSyncDatabase` as their first argument; remove direct `supabase` mutation calls from these functions

---

### 5.2 — Meal plan service writes

**Modify** `mealPlan/src/services/meal-plan-service.ts`

Note: `meal_slots` now uses `meal_slot_recipes` as a junction table (added in migration `20260611000000_meal_slot_recipes.sql`). Each slot can have multiple recipes. `meal_slots.recipe_id` is legacy — new writes go to `meal_slot_recipes`.

- [x] `createMealPlan(db, userId, weekStart)` → `db.execute('INSERT INTO meal_plans (id, user_id, week_start, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [...])`
- [x] `addMealSlot(db, data)` → insert into `meal_slots` first, then insert the recipe into `meal_slot_recipes`:
  ```ts
  const slotId = crypto.randomUUID();
  await db.execute(
    'INSERT INTO meal_slots (id, meal_plan_id, label, date, time_of_day, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [slotId, data.meal_plan_id, data.label, data.date, data.time_of_day, data.display_order, now, now]
  );
  await db.execute(
    'INSERT INTO meal_slot_recipes (id, meal_slot_id, recipe_id, servings_eaten, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [crypto.randomUUID(), slotId, data.recipe_id, data.servings ?? null, 0, now, now]
  );
  ```
- [x] `updateMealSlot(db, id, data)` → update `meal_slots` for slot-level fields (label, date, time_of_day); update `meal_slot_recipes` for recipe/servings changes: `db.execute('UPDATE meal_slot_recipes SET servings_eaten = ? WHERE meal_slot_id = ? AND recipe_id = ?', [...])`
- [x] `deleteMealSlot(db, id)` → `db.execute('DELETE FROM meal_slots WHERE id = ?', [id])` (cascade deletes `meal_slot_recipes` rows via DB constraint)
- [x] All functions accept `db` as first argument

---

### 5.3 — Food log service writes

**Modify** `mealPlan/src/services/food-log-service.ts`

- [x] `createFoodLog(db, data)` → `db.execute('INSERT INTO food_logs (...) VALUES (...)', [...])`
- [x] `addFoodLogItem(db, data)` → `db.execute('INSERT INTO food_log_items (...) VALUES (...)', [...])`
- [x] `updateFoodLogItem(db, id, data)` → `db.execute('UPDATE food_log_items SET ... WHERE id = ?', [...])`
- [x] `deleteFoodLogItem(db, id)` → `db.execute('DELETE FROM food_log_items WHERE id = ?', [id])`
- [x] `deleteFoodLog(db, id)` → `db.execute('DELETE FROM food_logs WHERE id = ?', [id])`
- [x] All functions accept `db` as first argument

---

### 5.4 — Grocery service writes

**Modify** `mealPlan/src/services/grocery-service.ts`

- [x] `createGroceryList(db, data)` → `db.execute('INSERT INTO grocery_lists (...) VALUES (...)', [...])`
- [x] `upsertGroceryItems(db, items)` → loop calling `db.execute('INSERT OR REPLACE INTO grocery_items (...) VALUES (...)', [...])`
- [x] `setItemChecked(db, id, checked)` → `db.execute('UPDATE grocery_items SET is_checked = ? WHERE id = ?', [checked ? 1 : 0, id])`
- [x] `deleteGroceryList(db, id)` → `db.execute('DELETE FROM grocery_lists WHERE id = ?', [id])`
- [x] `addPantryStaple(db, data)` → `db.execute('INSERT INTO pantry_staples (...) VALUES (...)', [...])`
- [x] `deletePantryStaple(db, id)` → `db.execute('DELETE FROM pantry_staples WHERE id = ?', [id])`
- [x] All functions accept `db` as first argument

---

### 5.5 — User / profile service writes

**Modify** `mealPlan/src/services/user-service.ts`

- [x] `createUserProfile(db, data)` → `db.execute('INSERT INTO users (...) VALUES (...)', [...])`
- [x] `updateProfile(db, userId, data)` → `db.execute('UPDATE users SET ... WHERE id = ?', [...])`
- [x] `upsertMacroGoal(db, data)` → `db.execute('INSERT OR REPLACE INTO macro_goals (...) VALUES (...)', [...])`
- [x] `deleteMacroGoal(db, id)` → `db.execute('DELETE FROM macro_goals WHERE id = ?', [id])`
- [x] `upsertDietaryPreference(db, userId, tag)` → `db.execute('INSERT OR IGNORE INTO dietary_preferences (id, user_id, tag, created_at) VALUES (?, ?, ?, ?)', [...])`
- [x] `deleteDietaryPreference(db, id)` → `db.execute('DELETE FROM dietary_preferences WHERE id = ?', [id])`
- [x] All functions accept `db` as first argument

---

### 5.6 — Personal food service writes

**Modify** `mealPlan/src/services/personal-food-service.ts`

Note: the DB table is `personal_foods` (plural), not `personal_food`.

- [x] `createPersonalFood(db, data)` → `db.execute('INSERT INTO personal_foods (...) VALUES (...)', [...])`
- [x] `updatePersonalFood(db, id, data)` → `db.execute('UPDATE personal_foods SET ... WHERE id = ?', [...])`
- [x] `deletePersonalFood(db, id)` → `db.execute('DELETE FROM personal_foods WHERE id = ?', [id])`
- [x] All functions accept `db` as first argument

---

## Phase 6 — Migrate Data Hooks to PowerSync Reactive Reads

### Context

Every data hook currently calls Supabase to fetch data (e.g. `await supabase.from('recipes').select(...)`). This blocks rendering until the network responds.

Replace these with `usePowerSyncQuery` from `@powersync/react-native`. This hook runs a SQL query against local SQLite and **automatically re-renders** whenever the local DB changes (including when PowerSync syncs new data from Supabase in the background).

```ts
import { usePowerSyncQuery, usePowerSync } from '@powersync/react-native';

function useRecipes() {
  const db = usePowerSync();  // for writes
  const userId = getCachedUserId();

  // This re-runs automatically whenever the local recipes table changes
  const rows = usePowerSyncQuery<RecipeRow>(
    'SELECT * FROM recipes WHERE user_id = ? ORDER BY created_at DESC',
    [userId ?? ''],
  );

  // rows is an array of plain objects; empty array [] until data loads or if no records
  return { recipes: rows, db };
}
```

Also remove all `waitForNetwork()` calls and `foregroundAtRef` checks from hooks — these were workarounds for the fact that data previously required a network call. They are no longer needed.

`waitForNetwork` is imported from `mealPlan/src/utils/wait-for-network.ts`. `foregroundAtRef` is imported from `mealPlan/src/contexts/session-context.tsx`. Remove both imports and all call sites within hooks.

---

### 6.1 — `useUserProfile`

**Modify** `mealPlan/src/hooks/use-user-profile.ts`

Current behavior: calls `getProfile(userId)` which queries `users`, `macro_goals`, and `dietary_preferences` via Supabase REST. Has `waitForNetwork()` and `foregroundAtRef` probes. Shows `loading = true` until the network responds.

New behavior:
- [x] Replace with three `useQuery` calls (non-deprecated replacement for `usePowerSyncQuery`):
  ```ts
  const { data: userRows } = useQuery<UserRow>('SELECT * FROM users WHERE id = ?', [userId ?? '']);
  const { data: macroGoalRows } = useQuery<MacroGoalRow>('SELECT * FROM macro_goals WHERE user_id = ? AND is_active = 1 ORDER BY display_order', [userId ?? '']);
  const { data: dietRows } = useQuery<{ tag: string }>('SELECT tag FROM dietary_preferences WHERE user_id = ?', [userId ?? '']);
  ```
- [x] Remove `waitForNetwork()` import and call
- [x] Remove `foregroundAtRef` import and check
- [x] Remove `withTimeout()` wrappers
- [x] Keep `supabase.auth.onAuthStateChange` listener — it handles sign-in/sign-out events
- [x] For auto-create profile: call `createUserProfile(db, ...)` only if `userRow` is undefined AND `db.currentStatus.lastSyncedAt` is non-null (meaning at least one sync has completed and confirmed no row exists)
- [x] `loading: false` — local SQLite queries return synchronously

---

### 6.2 — `useRecipes`

**Modify** `mealPlan/src/hooks/use-recipes.ts`

- [x] Replace Supabase call with `useQuery`:
  ```sql
  SELECT * FROM recipes WHERE user_id = ? ORDER BY created_at DESC
  ```
  (Ingredients loaded separately per-recipe in the recipe detail screen)
- [x] Parse JSON fields (`instructions`, `dietary_tags`) from string → array in `parseRecipeRow`
- [x] Get `db = usePowerSync()` and pass it to write calls (`saveRecipe`, `deleteRecipe`, etc.)

---

### 6.3 — `useMealPlan`

**Modify** `mealPlan/src/hooks/use-meal-plan.ts`

- [x] Replace `getWeek()` Supabase call with two `useQuery` calls:
  ```sql
  -- Query 1: get meal plan for the week
  SELECT * FROM meal_plans WHERE user_id = ? AND week_start = ? ORDER BY created_at ASC LIMIT 1

  -- Query 2: full JOIN of slots + slot_recipes + recipes (all fields aliased)
  SELECT ms.id AS slot_id, ..., r.id AS r_id, r.title AS r_title, ...
  FROM meal_slots ms
  LEFT JOIN meal_slot_recipes msr ON msr.meal_slot_id = ms.id
  LEFT JOIN recipes r ON r.id = msr.recipe_id
  WHERE ms.meal_plan_id = ?
  ORDER BY ms.date, ms.display_order, msr.display_order
  ```
- [x] Remove `waitForNetwork()` and `foregroundAtRef` probe
- [x] Get `db = usePowerSync()` and pass to write calls
- [x] Auto-create meal plan via `ensureMealPlan` if none found in local SQLite

---

### 6.4 — `useFoodLog`

**Modify** `mealPlan/src/hooks/use-food-log.ts`

- [x] Replace Supabase call with `useQuery` (full JOIN with all nutrition fields):
  ```sql
  SELECT fl.id AS log_id, fl.user_id AS log_user_id, fl.date AS log_date,
    fl.label AS log_label, fl.time_of_day AS log_time_of_day, ...
    fli.id AS item_id, fli.food_name, fli.calories, fli.protein, ...
  FROM food_logs fl
  LEFT JOIN food_log_items fli ON fli.food_log_id = fl.id
  WHERE fl.user_id = ? AND fl.date >= ? AND fl.date < ?
  ORDER BY fl.time_of_day NULLS LAST, fli.display_order
  ```
- [x] Get `db = usePowerSync()` and pass to write calls

---

### 6.5 — `useMacros`

**Modify** `mealPlan/src/hooks/use-macros.ts` and `mealPlan/src/services/macro-service.ts`

The macro service currently receives Supabase query results as input. Change it to accept raw SQL result rows instead:

- [x] In `macro-service.ts`: added `computeDailyProgress(date, goals, logRows, slotRows)` that accepts pre-fetched `FlatLogRow[]` and `FlatSlotRow[]` arrays; `getDailyProgress` (Supabase) kept for `getHistoricalProgress`
- [x] In `use-macros.ts`: replaced Supabase calls with three `useQuery` hooks:
  ```sql
  -- Goals
  SELECT * FROM macro_goals WHERE user_id = ? AND is_active = 1 ORDER BY display_order

  -- Food logged today (joins food_log_items + food_logs)
  SELECT fl.id AS log_id, fl.label, fl.time_of_day,
    fli.id AS item_id, fli.food_name, fli.calories, ...
  FROM food_log_items fli JOIN food_logs fl ON fl.id = fli.food_log_id
  WHERE fl.user_id = ? AND fl.date = ?

  -- Planned meals today (via meal_slot_recipes junction table)
  SELECT ms.id AS slot_id, ms.label, ms.time_of_day,
    msr.id AS msr_id, msr.servings_eaten, r.title AS recipe_title, ...
  FROM meal_slot_recipes msr JOIN meal_slots ms ON ms.id = msr.meal_slot_id
  JOIN recipes r ON r.id = msr.recipe_id JOIN meal_plans mp ON mp.id = ms.meal_plan_id
  WHERE mp.user_id = ? AND ms.date = ?
  ```
- [x] Pass the query results into `computeDailyProgress()` via `useMemo`

---

### 6.6 — `useGrocery`

**Modify** `mealPlan/src/hooks/use-grocery.ts`

- [x] Replace Supabase calls with `useQuery` (JOIN grocery_lists + meal_plans + grocery_items):
  ```sql
  SELECT gl.id AS list_id, gl.user_id AS list_user_id, gl.meal_plan_id, gl.generated_at,
    gi.id AS item_id, gi.ingredient_id, gi.name, gi.quantity, gi.unit,
    gi.category, gi.is_checked, gi.deficit_note
  FROM grocery_lists gl
  JOIN meal_plans mp ON mp.id = gl.meal_plan_id
  LEFT JOIN grocery_items gi ON gi.grocery_list_id = gl.id
  WHERE mp.user_id = ? AND mp.week_start = ?
  ORDER BY gi.category, gi.name
  ```
- [x] Grocery list generation (calling `generateList`) still requires network; `generating` state maintained for UX spinner
- [x] Removed optimistic toggle update — reactive query re-renders automatically after `toggleItemChecked` writes to SQLite
- [x] Get `db = usePowerSync()` and pass to write calls; exported `groupItemsByCategory` from grocery-service

---

### 6.7 — `useTopRecipes`

**Modify** `mealPlan/src/hooks/use-top-recipes.ts`

- [x] Replace Supabase chain with a single `useQuery`:
  ```sql
  SELECT r.*, COUNT(msr.id) AS usage_count
  FROM recipes r
  JOIN meal_slot_recipes msr ON msr.recipe_id = r.id
  JOIN meal_slots ms ON ms.id = msr.meal_slot_id
  JOIN meal_plans mp ON mp.id = ms.meal_plan_id
  WHERE mp.user_id = ?
  GROUP BY r.id
  ORDER BY usage_count DESC
  LIMIT ?
  ```

---

### 6.8 — `useCalendar`

**Modify** `mealPlan/src/hooks/use-calendar.ts`

- [ ] `connected` state: call `calendar.restoreSession()` on mount (which now checks the `calendar_tokens` DB table as updated in Phase 4) — no changes to the hook structure, just the underlying service call now works cross-device
- [ ] Google Calendar events (fetched from the Google Calendar edge function) are NOT synced via PowerSync — keep the existing AsyncStorage event cache as-is
- [ ] On pull-to-refresh: check `isOnline()` from Phase 10 before calling the edge function; if offline, serve the existing cached events silently with no error

---

## Phase 7 — Instant-On UI (Remove Initial Loading Modals)

### Context

Several screens block rendering with a full-screen `LoadingModal` until data arrives from Supabase. After Phase 6, data comes from local SQLite immediately — loading modals on initial render are no longer needed.

The `SessionProvider`'s `LoadingModal` (for token refresh, in `mealPlan/src/contexts/session-context.tsx`) is a separate concern — leave it as-is.

**Pattern — before:**
```tsx
if (profileLoading) {
  return <View style={styles.loadingContainer}><LoadingModal visible message="Loading…" /></View>;
}
if (!profile) return null;
```

**Pattern — after:**
```tsx
// Render immediately. Data may be null/empty on first frame; that's fine.
// Show placeholder text or nothing for fields that haven't loaded yet.
const displayName = profile?.user?.display_name ?? '';
```

---

### 7.1 — Home screen

**Modify** `mealPlan/src/app/(tabs)/index.tsx`

- [x] Remove lines 68–74 (the `if (profileLoading) { return <View>...<LoadingModal /></View> }` block)
- [x] Remove lines 76–78 (the `if (!profile) { return null }` early return)
- [x] Keep lines 46–56 (the `useEffect` that redirects to `/sign-in` when there is no session and no profile) — this is still needed for unauthenticated users
- [x] Change `const displayName = profile.user.display_name ?? 'there'` to `const displayName = profile?.user?.display_name ?? ''` so it renders without crashing when profile is null
- [x] Wrap other `profile.*` accesses with optional chaining or null guards (`NudgeBanner` wrapped in `{profile && ...}`)

---

### 7.2 — Profile screen

**Modify** `mealPlan/src/app/(tabs)/profile/index.tsx`

- [x] Search the file for `LoadingModal`, `if (loading)`, or `if (!profile) return null` patterns and remove them
- [x] Replace any `profile.fieldName` accesses with `profile?.fieldName ?? fallback` to handle the brief null window

---

### 7.3 — Macros screen

**Modify** `mealPlan/src/app/(tabs)/macros/index.tsx`

- [x] Search for `LoadingModal` usage and remove it
- [x] Macro rings should render empty (0/0 values) while macro data loads from local DB

---

### 7.4 — Calendar screen

**Modify** `mealPlan/src/app/(tabs)/calendar.tsx`

- [x] Search for `LoadingModal` usage and remove it (`useSessionContext` import also removed)
- [x] The week grid should render with empty slots while meal plan data loads

---

### 7.5 — Grocery screen

**Modify** `mealPlan/src/app/(tabs)/grocery/index.tsx`

- [x] Search for `LoadingModal` usage and remove it (both initial load text and generating modal removed)

---

### 7.6 — Recipes screen

**Modify** `mealPlan/src/app/(tabs)/recipes/index.tsx`

- [x] Search for `LoadingModal` usage and remove it (file is a redirect; no LoadingModal present)
- [x] An empty recipes list is a valid state while local DB loads (or if user has no saved recipes)

---

### 7.7 — Pantry staples screen

**Modify** `mealPlan/src/app/(tabs)/grocery/pantry-staples.tsx`

- [x] Search for `LoadingModal` usage and remove it (no LoadingModal present; already uses `useQuery` with plain text loading state)

---

## Phase 8 — Pull-to-Refresh on All Screens

### Context

Pull-to-refresh should request a PowerSync sync cycle (upload any queued local writes, download any new data from Supabase) and then re-render with the updated local data. The `usePowerSyncQuery` hooks from Phase 6 update automatically when local data changes, so no manual re-query is needed — just trigger the sync.

PowerSync exposes `db.triggerCrudUpload()` to flush the local write queue to Supabase immediately, and `db.waitForFirstSync()` to wait for the initial download to complete. For pull-to-refresh, calling `triggerCrudUpload()` is the right primitive — it uploads pending writes and PowerSync's background process handles downloading new data.

The home screen already has a `RefreshControl` wired through `useRefresh()` / `triggerRefresh` from `mealPlan/src/contexts/refresh-context.tsx`. Update this to call `triggerSync` and add the same pattern to all other screens.

---

### 8.1 — Create sync trigger utility

**Create** `mealPlan/src/utils/trigger-sync.ts`

```ts
import { db } from '@/services/powersync-database';

export async function triggerSync(): Promise<void> {
  try {
    await Promise.race([
      db.triggerCrudUpload(),
      new Promise<void>((resolve) => setTimeout(resolve, 10_000)),
    ]);
  } catch {
    // Sync failure is non-fatal — the UI shows whatever is in local DB
  }
}
```

- [x] Create `mealPlan/src/utils/trigger-sync.ts` with the above content
- [x] Note: the web version imports from `powersync-database.web.ts` automatically via Metro's platform splitting since the file path resolves to the correct platform module

---

### 8.2 — Home screen (update existing RefreshControl)

**Modify** `mealPlan/src/app/(tabs)/index.tsx`

The home screen already has a `RefreshControl` via `useRefresh()`. The `triggerRefresh` function currently calls `refreshMacros()` and `refreshGrocery()`.

- [x] Import `triggerSync` from `@/utils/trigger-sync`
- [x] Update `useSetPageRefresh` callback to call `triggerSync()` first:
  ```ts
  useSetPageRefresh(useCallback(async () => {
    await triggerSync();
    await Promise.all([refreshMacros(), refreshGrocery()]);
  }, [refreshMacros, refreshGrocery]));
  ```
- [x] The `refreshMacros()` and `refreshGrocery()` calls are now no-ops if those hooks use `usePowerSyncQuery` (they update reactively), but keep them for now in case hooks are migrated incrementally

---

### 8.3 — Calendar screen

**Modify** `mealPlan/src/app/(tabs)/calendar.tsx`

- [x] Add `RefreshControl` to the main `ScrollView`:
  ```tsx
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await triggerSync();
    // Re-fetch Google Calendar events if online (use isOnline() from Phase 10)
    if (isOnline()) await refetchCalendarEvents();
    setRefreshing(false);
  }, []);

  <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} colors={[Colors.accent]} />}>
  ```

---

### 8.4 — Macros screen

**Modify** `mealPlan/src/app/(tabs)/macros/index.tsx`

- [x] Add `RefreshControl` with the same pattern as 8.3 — `triggerSync()` then `setRefreshing(false)`

---

### 8.5 — Grocery screen

**Modify** `mealPlan/src/app/(tabs)/grocery/index.tsx`

- [x] Add `RefreshControl` — `triggerSync()` then `setRefreshing(false)`

---

### 8.6 — Pantry staples screen

**Modify** `mealPlan/src/app/(tabs)/grocery/pantry-staples.tsx`

- [x] Add `RefreshControl` — `triggerSync()` then `setRefreshing(false)`

---

### 8.7 — Recipes screen

**Modify** `mealPlan/src/app/(tabs)/recipes/index.tsx`

- [x] Add `RefreshControl` — `triggerSync()` then `setRefreshing(false)`

---

### 8.8 — Recipe detail screen

**Modify** `mealPlan/src/app/(tabs)/recipes/[id].tsx`

- [x] Add `RefreshControl` to the scroll view — `triggerSync()` only (no additional re-query needed)

---

### 8.9 — Profile screen

**Modify** `mealPlan/src/app/(tabs)/profile/index.tsx`

- [x] Add `RefreshControl` — `triggerSync()` then `setRefreshing(false)`

---

## Phase 9 — Offline Search Caching

### Context

Three services handle food/recipe search:
- `mealPlan/src/services/fatsecret.ts` — FatSecret food search + barcode lookup. Already has AsyncStorage caching with a 7-day TTL. Pattern: `getFromCache(key)` → call API → `setCache(key, result)`. Throws on network error even when stale cache exists.
- `mealPlan/src/services/spoonacular.ts` — Recipe search. Same AsyncStorage caching pattern. Also throws on network error.
- `mealPlan/src/services/public-food-service.ts` — Community food DB (`public_foods` Supabase table). No caching at all. Has a `barcode` column.

The `personal_food` table (synced via PowerSync to local SQLite) has no `barcode` column, so offline barcode resolution against the user's personal library is not currently possible.

**Goal:** When offline, return whatever cached data is available rather than throwing. Check local sources first before hitting the network for barcodes and food search.

---

### 9.1 — Add optional barcode field to personal_food

**Create** `supabase/migrations/20260614000001_personal_food_barcode.sql`:

```sql
ALTER TABLE personal_food ADD COLUMN barcode TEXT;
CREATE INDEX idx_personal_food_barcode ON personal_food(barcode) WHERE barcode IS NOT NULL;
```

- [x] Create the migration file above
- [x] Run `npx supabase db push` from `mealPlanningApp/` to apply

**Modify** `mealPlan/src/models/personal-food.ts`:
- [x] Add `barcode?: string | null` to the `PersonalFood` interface
- [x] Note: `powersync-schema.ts` from Phase 1.1 already includes `barcode: Column.text()` in the `personal_food` table definition — no schema update needed

**Modify** `mealPlan/src/services/personal-food-service.ts`:
- [x] Include `barcode` in the INSERT/UPDATE SQL in `createPersonalFood()` and `updatePersonalFood()` — pass it through if provided in `data`, write `NULL` if not provided
- [x] When a food originates from a barcode scan (the barcode scan flow passes the barcode value when saving), include the barcode in the `data` object

**Modify** the personal food create/edit form — this is in `mealPlan/src/app/(tabs)/profile/food-library.tsx` (the screen that handles creating and editing personal food items):
- [x] Add an optional "Barcode" text input field below the existing food fields
- [x] Use placeholder text: `"Optional — scan or enter manually"`
- [ ] When the form is opened after a barcode scan, pre-fill this field with the scanned barcode value (future — requires navigation param changes)

---

### 9.2 — Add AsyncStorage caching to community food search

`mealPlan/src/services/public-food-service.ts` currently queries Supabase directly on every call with no caching. Add the same caching pattern used in `fatsecret.ts`.

**Modify** `mealPlan/src/services/public-food-service.ts`:

- [x] Add these constants and helpers at the top of the file (implemented in `public-food-service.ts`)

- [x] Update `searchPublicFoods(query)` to use caching with stale fallback on offline

- [x] Add new `lookupPublicFoodByBarcode(barcode: string): Promise<PublicFood | null>`:
  ```ts
  export async function lookupPublicFoodByBarcode(barcode: string): Promise<PublicFood | null> {
    const key = `public_foods:barcode:${barcode}`;
    const cached = await getFromCache<PublicFood>(key, BARCODE_TTL_MS);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('public_foods')
        .select('id, food_name, brand_name, serving_size_amount, serving_size_unit, calories, protein, carbs, fat, fatsecret_id, barcode, approved, trusted, flagged, submitted_by, created_at')
        .eq('barcode', barcode)
        .eq('approved', true)
        .single();
      if (error || !data) return null;
      await setCache(key, data);
      return data as PublicFood;
    } catch {
      // Offline: return stale cache if available
      return getStaleFromCache<PublicFood>(key);
    }
  }
  ```

---

### 9.3 — Offline-resilient barcode lookup with full source cascade

**Modify** `mealPlan/src/services/fatsecret.ts` — update `lookupBarcode(barcode)` to accept an optional `db` parameter and check all local sources before going to the network.

Current signature: `lookupBarcode(barcode: string): Promise<FoodDetails | null>`
New signature: `lookupBarcode(barcode: string, db?: PowerSyncDatabase): Promise<FoodDetails | null>`

The full lookup order:

```
Step 1: personal_food local DB (requires db param, no network)
Step 2: public_foods barcode cache (AsyncStorage, no network if cached)
Step 3: FatSecret barcode AsyncStorage cache (existing, no network)
Step 4: FatSecret edge function via Supabase (network required)
   → on success: cache to AsyncStorage + call cachePublicFood()
Step 5: Stale FatSecret cache (offline fallback — returns even if expired)
Return null only if all 5 steps return nothing
```

- [x] Update `lookupBarcode` implementation:
  ```ts
  export async function lookupBarcode(barcode: string, db?: PowerSyncDatabase): Promise<FoodDetails | null> {
    // Step 1: personal food local DB
    if (db) {
      const rows = await db.getAll<PersonalFoodRow>(
        'SELECT * FROM personal_food WHERE barcode = ? LIMIT 1',
        [barcode],
      );
      if (rows.length > 0) return mapPersonalFoodToFoodDetails(rows[0]);
    }

    // Step 2: community food barcode cache
    const communityFood = await lookupPublicFoodByBarcode(barcode);
    if (communityFood) return mapPublicFoodToFoodDetails(communityFood);

    // Step 3: FatSecret AsyncStorage cache (existing)
    const cacheKey = `fatsecret:barcode:${barcode}`;
    const cached = await getFromCache<FoodDetails>(cacheKey);
    if (cached) return cached;

    // Step 4: FatSecret network call (existing)
    try {
      // ... existing invoke logic ...
      if (data) {
        await setCache(cacheKey, data);
        cachePublicFood({ ...mapToPublicFoodPayload(data), barcode, source: 'fatsecret' });
        return data;
      }
      return null;
    } catch {
      // Step 5: stale FatSecret cache
      return getStaleFromCache<FoodDetails>(cacheKey);
    }
  }
  ```
- [x] Add helper `mapPersonalFoodToFoodDetails(row)` that converts a `personal_food` SQLite row to the `FoodDetails` shape
- [x] Add helper `mapPublicFoodToFoodDetails(food)` that converts a `PublicFood` to the `FoodDetails` shape
- [x] Add `stale?: boolean` to the `FoodDetails` interface to optionally indicate cached results (set it when returning from stale cache)
- [x] Update all call sites of `lookupBarcode` to pass `db` — `barcode-scanner.tsx` updated

---

### 9.4 — Offline-resilient food text search with full source cascade

**Modify** `mealPlan/src/services/fatsecret.ts` — update `lookupIngredient(query, page)` to accept an optional `db` param and search local sources first.

New signature: `lookupIngredient(query: string, page?: number, db?: PowerSyncDatabase): Promise<FoodSearchResponse>`

- [x] Update `lookupIngredient` to cascade: personal food (local) → community food (cached) → FatSecret cache → FatSecret network → stale FatSecret fallback. Merge results with personal food first.
- [x] Add `offline?: boolean` to `FoodSearchResponse`
- [x] Update all call sites of `lookupIngredient` to pass `db` — `ingredient-input.tsx`, `log-food-form.tsx`, `create.tsx` all updated

---

### 9.5 — Offline-resilient FatSecret food detail

**Modify** `mealPlan/src/services/fatsecret.ts` — `getFoodDetails(foodId)`

Currently returns `null` on any failure, including offline. The cached entry exists but is not returned when the network call fails.

- [x] In the `catch` block, add: `return getStaleFromCache<FoodDetails>(cacheKey)` (implemented in fatsecret.ts)
- [x] `getStaleFromCache` helper added to fatsecret.ts

---

### 9.6 — Offline-resilient Spoonacular recipe search

**Modify** `mealPlan/src/services/spoonacular.ts`

Both functions have caching but throw on network failure without checking for stale cache.

- [x] In `searchRecipes(params)`: wrap the `fetch()` call in try/catch; stale cache returned with `cached: true` on network failure.
- [x] In `getRecipeDetail(spoonacularId)`: same pattern — stale cache returned before rethrowing.

---

## Phase 10 — Offline Feature Gates

### Context

Some features require a live network call with no meaningful offline fallback: importing a recipe from a URL (calls Claude AI edge function), generating a grocery list (calls a Supabase function to compute from meal data), and barcode lookup when the item is not in any local source.

When these features are triggered offline, the app should show a clear message rather than a spinner that eventually fails or a cryptic network error.

**Standard offline message:** `"This feature is only available online. Please connect to a network and try again."`

---

### 10.1 — Create offline gate utility

**Create** `mealPlan/src/utils/offline-gate.ts`

```ts
import { Platform } from 'react-native';

export const OFFLINE_MESSAGE =
  'This feature is only available online. Please connect to a network and try again.';

// Typed error class so callers can catch specifically
export class OfflineError extends Error {
  constructor() { super(OFFLINE_MESSAGE); this.name = 'OfflineError'; }
}

// Synchronous online check
// On web: uses navigator.onLine (reliable in modern browsers)
// On native: currently no reliable synchronous check without NetInfo;
//   returns true (optimistic) and lets the actual network call fail naturally.
//   If NetInfo is added as a dependency later, update this.
export function isOnline(): boolean {
  if (Platform.OS === 'web') {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }
  return true; // native: optimistic; gate triggers on actual failure
}

// Throws OfflineError if offline — call at the start of any network-gated action
export function requireOnline(): void {
  if (!isOnline()) throw new OfflineError();
}
```

- [x] Create `mealPlan/src/utils/offline-gate.ts` with the above content

---

### 10.2 — Gate recipe URL import

**Modify** `mealPlan/src/app/(tabs)/recipes/import.tsx`

This screen lets users paste a URL and imports the recipe via a Claude AI edge function call. It cannot work offline.

- [x] Find the submit/import handler function in the file (the function called when the user taps the import button)
- [x] Add at the top of that handler: `requireOnline()` check — sets inline error state instead of Alert (error box already exists in the screen)

---

### 10.3 — Gate grocery list generation

**Modify** `mealPlan/src/hooks/use-grocery.ts`

Grocery list generation calls a service function that queries the meal plan and writes a new list to Supabase. This cannot work offline.

- [x] Find the generate function call in the hook (the part that calls `grocery-service.ts` to generate a new list when none exists)
- [x] Added `isOnline()` check at start of `generate()`; `generateError` state replaces the hardcoded `error: null` return; grocery screen can read `error` to show the offline message inline

---

### 10.4 — Gate barcode scan with no local or cached result

The barcode scan flow is in `mealPlan/src/components/food/` — look for the component that calls `lookupBarcode()` and handles its result. After Phase 9.3, `lookupBarcode()` returns `null` only if the barcode is genuinely unknown AND there is no cache anywhere.

**Modify** that component:

- [x] After `const result = await lookupBarcode(barcode, db)`: replaced `notFound: boolean` state with `notFoundMessage: string | null`; offline shows `OFFLINE_MESSAGE`, online shows "Product not found. You can add it manually to your personal food library."

---

### 10.5 — Silence calendar event re-fetch errors when offline

**Modify** `mealPlan/src/hooks/use-calendar.ts`

The calendar hook fetches Google Calendar events via a Supabase edge function. On pull-to-refresh while offline, this call fails. Instead of propagating the error, silently return cached events.

- [x] In `loadEvents()` in `use-calendar.ts`: added `isOnline()` check after Phase 1 cache serve; if offline, clears the refreshing spinner and returns without calling the edge function — no error is shown, cached events remain displayed

---

## File Summary

### New files
| File | Purpose |
|------|---------|
| `mealPlan/src/services/powersync-schema.ts` | Full `Schema` using SDK `Table`/`Column` — replaces custom model table objects |
| `mealPlan/src/services/powersync-database.ts` | Native `PowerSyncDatabase` singleton |
| `mealPlan/src/services/powersync-database.web.ts` | Web `PowerSyncDatabase` singleton |
| `mealPlan/src/services/powersync-connector.ts` | Native auth connector + `uploadData()` write-sync to Supabase |
| `mealPlan/src/services/powersync-connector.web.ts` | Web auth connector + `uploadData()` |
| `mealPlan/src/utils/trigger-sync.ts` | Requests an immediate PowerSync sync cycle; used by all pull-to-refresh handlers |
| `mealPlan/src/utils/offline-gate.ts` | `isOnline()`, `requireOnline()`, `OfflineError`, `OFFLINE_MESSAGE` |
| `mealPlan/webpack.config.js` | Expo web webpack config adding PowerSync WASM worker support |
| `powersync/sync.yaml` | User-scoped sync rules uploaded to PowerSync Cloud dashboard |
| `supabase/migrations/20260614000000_user_calendar_prefs.sql` | Adds `selected_calendar_ids` + `calendar_export_enabled` to `users` |
| `supabase/migrations/20260614000001_personal_food_barcode.sql` | Adds nullable `barcode` column + index to `personal_food` |

### Modified files
| File | Change |
|------|--------|
| `mealPlan/src/services/powersync.tsx` | Rewrite — use DB singleton + connector pattern; fix broken initialization |
| `mealPlan/src/services/powersync.web.tsx` | Replace no-op stub with real `@powersync/web` implementation |
| `mealPlan/src/models/grocery.ts` | Replace fake `groceries` model with `GroceryList` + `GroceryItem` TypeScript interfaces |
| `mealPlan/src/models/user.ts` | Remove `userTable` export; keep `User` interface |
| `mealPlan/src/models/recipe.ts` | Remove `recipeTable` export; keep `Recipe` interface |
| `mealPlan/src/models/meal-plan.ts` | Remove table exports; keep interfaces |
| `mealPlan/src/models/meal-slot.ts` | Remove table exports; keep interfaces |
| `mealPlan/src/models/food-log.ts` | Remove table exports; keep interfaces |
| `mealPlan/src/models/personal-food.ts` | Add `barcode?: string \| null`; remove `personalFoodTable` export |
| `mealPlan/src/models/ingredient.ts` | Remove table exports; keep interfaces |
| `mealPlan/src/services/calendar.ts` | DB-backed connection detection via `calendar_tokens`; cross-device calendar prefs via `users` table |
| `mealPlan/src/services/user-service.ts` | Add `getCalendarPrefs()`/`setCalendarPrefs()`; rewrite mutations to `db.execute()` |
| `mealPlan/src/services/recipe-service.ts` | Rewrite mutations to `db.execute()` |
| `mealPlan/src/services/meal-plan-service.ts` | Rewrite mutations to `db.execute()` |
| `mealPlan/src/services/food-log-service.ts` | Rewrite mutations to `db.execute()` |
| `mealPlan/src/services/grocery-service.ts` | Rewrite mutations to `db.execute()`; offline gate on list generation |
| `mealPlan/src/services/personal-food-service.ts` | Rewrite mutations to `db.execute()`; include `barcode` field |
| `mealPlan/src/services/macro-service.ts` | Accept pre-fetched row arrays instead of querying Supabase internally |
| `mealPlan/src/services/fatsecret.ts` | 5-step barcode cascade; personal food + community food prepended to text search; stale cache fallback on offline |
| `mealPlan/src/services/spoonacular.ts` | Stale cache fallback for `searchRecipes` + `getRecipeDetail` when offline |
| `mealPlan/src/services/public-food-service.ts` | Add AsyncStorage caching to `searchPublicFoods()`; add `lookupPublicFoodByBarcode()` |
| `mealPlan/src/hooks/use-user-profile.ts` | `usePowerSyncQuery` reads; remove `waitForNetwork`/`foregroundAtRef`/`withTimeout` |
| `mealPlan/src/hooks/use-recipes.ts` | `usePowerSyncQuery` reads |
| `mealPlan/src/hooks/use-meal-plan.ts` | `usePowerSyncQuery` reads; remove network guards |
| `mealPlan/src/hooks/use-food-log.ts` | `usePowerSyncQuery` reads |
| `mealPlan/src/hooks/use-macros.ts` | `usePowerSyncQuery` reads; delegate computation to updated `macro-service` |
| `mealPlan/src/hooks/use-grocery.ts` | `usePowerSyncQuery` reads; offline gate on generation |
| `mealPlan/src/hooks/use-top-recipes.ts` | `usePowerSyncQuery` with aggregation SQL |
| `mealPlan/src/hooks/use-calendar.ts` | DB-backed `restoreSession()`; skip event re-fetch when offline |
| `mealPlan/src/app/(tabs)/index.tsx` | Remove `LoadingModal` gate; update `triggerRefresh` to call `triggerSync` |
| `mealPlan/src/app/(tabs)/profile/index.tsx` | Remove `LoadingModal` gate; add `RefreshControl` |
| `mealPlan/src/app/(tabs)/macros/index.tsx` | Remove `LoadingModal` gate; add `RefreshControl` |
| `mealPlan/src/app/(tabs)/calendar.tsx` | Remove `LoadingModal` gate; add `RefreshControl` |
| `mealPlan/src/app/(tabs)/grocery/index.tsx` | Remove `LoadingModal` gate; add `RefreshControl` |
| `mealPlan/src/app/(tabs)/recipes/index.tsx` | Remove `LoadingModal` gate; add `RefreshControl` |
| `mealPlan/src/app/(tabs)/recipes/[id].tsx` | Add `RefreshControl` |
| `mealPlan/src/app/(tabs)/grocery/pantry-staples.tsx` | Remove `LoadingModal` gate; add `RefreshControl` |
| `mealPlan/src/app/(tabs)/recipes/import.tsx` | Online gate before URL import |
| `mealPlan/src/app/(tabs)/profile/food-library.tsx` | Add optional barcode input to personal food create/edit form |
| `mealPlan/src/components/food/` (barcode result handler) | Distinguish "offline + not found" from "product genuinely not found" |

### Deleted files
_(none)_

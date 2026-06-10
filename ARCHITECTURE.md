# Prepd — Architecture Reference

## Project layout

```
mealPlan/
  src/
    app/          # Expo Router file-based routes (screens)
    components/   # Shared UI components (feature sub-folders + ui/ primitives)
    hooks/        # Custom React hooks
    store/        # Redux Toolkit store + slices
    services/     # External integrations (Supabase, FatSecret, Calendar)
    models/       # PowerSync table schemas + TypeScript interfaces
    constants/    # Theme, env, dietary tags, macro constants
    utils/        # Pure utility functions (no side effects)
    contexts/     # React contexts
```

---

## Routing (`src/app/`)

Expo Router with file-based routing. Every file in `src/app/` becomes a route.

```
app/
  _layout.tsx                       # Root layout: Redux Provider + PowerSyncProvider + ThemeProvider
  +html.tsx                         # Web-only HTML shell
  (auth)/
    _layout.tsx
    sign-in.tsx
    sign-up.tsx
  (onboarding)/
    _layout.tsx
    dietary-preferences.tsx
    macro-goals.tsx
    calendar-connect.tsx
  (tabs)/
    _layout.tsx                     # Bottom tab bar config
    index.tsx                       # Dashboard / home
    calendar.tsx                    # Weekly meal planner + food log calendar
    search.tsx                      # Recipe / food search
    macros/
      index.tsx                     # Daily macro tracking (planned + logged combined)
    grocery/
      index.tsx                     # Grocery list with categories
      pantry-staples.tsx
    recipes/
      [id].tsx                      # Recipe detail
      create.tsx                    # Recipe creation
      import.tsx                    # URL-based recipe import (Claude AI parsing)
      saved.tsx                     # Saved recipes list
    profile/
      index.tsx                     # Profile + settings + admin section entry
      food-library.tsx              # Personal food library (CRUD + share toggle)
      notifications.tsx             # Notification settings
      admin/
        _layout.tsx                 # Access guard: redirects role=user to profile
        pending-foods.tsx           # Review unapproved community food submissions
        flagged-foods.tsx           # Review + resolve flagged community foods
        user-roles.tsx              # Assign user/moderator/admin roles (admin only)
  auth/
    callback.tsx                    # Supabase OAuth redirect handler
    calendar-callback.tsx           # Calendar OAuth callback (legacy)
  oauth/consent/index.tsx           # OAuth consent screen
```

Route groups `(auth)`, `(onboarding)`, and `(tabs)` share layouts but don't affect the URL path.

The `admin/` group is protected by its `_layout.tsx`, which redirects any `role = 'user'` to the profile screen. Moderation edge functions also verify role server-side.

**Where to add new screens:** `src/app/(tabs)/<feature>/index.tsx` for a tab root, or `src/app/(tabs)/<feature>/<sub>.tsx` for sub-pages.

---

## State management (`src/store/`)

Redux Toolkit. Four slices:

| Slice | File | Manages |
|---|---|---|
| `ui` | `slices/ui-slice.ts` | `selectedDate`, dashboard module visibility, active filters |
| `search` | `slices/search-slice.ts` | Search query / results state |
| `recipeForm` | `slices/recipe-form-slice.ts` | In-progress recipe creation form |
| `onboarding` | `slices/onboarding-slice.ts` | Onboarding step state |

**When to use Redux vs hooks:** Redux is for cross-screen ephemeral UI state (selected date, search). Server/DB data goes through PowerSync hooks (`use-meal-plan`, `use-macros`, `use-food-log`, etc.), not Redux.

**Where to add new state:** add a slice in `src/store/slices/`, register it in `src/store/index.ts`.

---

## Data layer

### Supabase (`src/services/supabase.ts`)
Auth client. Handles email/password auth, Google and Apple OAuth, and session management. Use `supabase` directly for auth operations only and for tables not in PowerSync. Data reads/writes for offline-first tables go through PowerSync hooks.

### PowerSync (`src/services/powersync.tsx` / `powersync.web.tsx`)
Offline-first sync layer wrapping Supabase. The `PowerSyncProvider` (in root `_layout.tsx`) provides the sync context. Tables registered with PowerSync:

| Table | Model file |
|---|---|
| `users` | `models/user.ts` |
| `recipes` | `models/recipe.ts` |
| `ingredients` | `models/ingredient.ts` |
| `meal_plans` | `models/meal-plan.ts` |
| `meal_slots` | `models/meal-slot.ts` |
| `grocery` | `models/grocery.ts` |
| `food_logs` | `models/food-log.ts` |
| `food_log_items` | `models/food-log.ts` |
| `personal_foods` | `models/personal-food.ts` |

**Not in PowerSync** (online-only via `supabase` directly):
- `public_foods` — community food database (via `public-food-service.ts`)
- `food_flags` — user reports against community foods
- `profiles` — user roles (`use-user-role.ts` queries this directly)

**Where to add new offline-first tables:** define the schema in `src/models/<name>.ts`, import and add to `syncTables` in `src/services/powersync.tsx`.

### Services (`src/services/`)
Thin wrappers over Supabase queries and Edge Function calls. Never called directly from components — always through hooks.

| File | Responsibility |
|---|---|
| `supabase.ts` | Auth client + auth helpers |
| `user-service.ts` | User profile CRUD |
| `meal-plan-service.ts` | Meal plan read/write |
| `macro-service.ts` | `getDailyProgress` / `getWeeklyProgress` — sums planned meal macros + food log macros |
| `grocery-service.ts` | Grocery list operations |
| `food-log-service.ts` | `createFoodLog`, `getFoodLogsForWeek/Day`, `deleteFoodLog`, `updateFoodLogItem`, `addItemsToFoodLog` |
| `personal-food-service.ts` | Personal food library CRUD: `saveToLibrary`, `getPersonalFoods`, `deletePersonalFood`, `updatePersonalFood` |
| `public-food-service.ts` | Community DB: `cachePublicFood` (fire-and-forget), `sharePublicFood`, `searchPublicFoods`, `flagPublicFood`; moderation helpers: `getPendingFoods`, `getFlaggedFoods`, `moderateFood` |
| `fatsecret.ts` | `lookupIngredient`, `lookupBarcode`, `getFoodDetails` — all proxy through `search-food` Edge Function; 7-day `AsyncStorage` cache |
| `recipe-service.ts` | Recipe CRUD |
| `calendar.ts` / `calendar.web.ts` | Calendar integration (platform-split): Android uses `expo-calendar` (native device calendar); Web uses the Google Calendar REST API (OAuth) |
| `calendar.types.ts` | Shared calendar types |
| `claude-ingredients.ts` | Claude API calls for ingredient parsing (URL import flow) |
| `schema-import.ts` | Recipe schema import helpers |
| `notification-service.ts` | Push notification helpers |

### Edge Functions (`supabase/functions/`)

All Edge Functions are Deno/TypeScript deployed to Supabase. FatSecret API credentials live server-side only.

| Function | What it does |
|---|---|
| `search-food/` | FatSecret proxy — routes by request body: `{ query }` → text search, `{ barcode }` → barcode lookup, `{ food_id }` → full food detail |
| `submit-public-food/` | Upsert to `public_foods`; FatSecret items auto-approved (`trusted=true`); manual entries queue for moderation |
| `flag-food/` | Insert `food_flags`; increments `flag_count`, sets `flagged=true` on the parent `public_foods` row |
| `moderate-food/` | Approve / reject / clear-flags / re-pend / remove — verifies caller has `moderator` or `admin` role |
| `set-user-role/` | Update `profiles.role` — verifies caller is `admin` |
| `fetch-recipe-html/` | Fetches raw HTML for URL-based recipe import (used by Claude ingredient parsing) |

---

## Hooks (`src/hooks/`)

Hooks are the bridge between services/store and components.

| Hook | Data source | Purpose |
|---|---|---|
| `use-user-profile` | Supabase / PowerSync users | Current user's profile data |
| `use-user-role` | `profiles` table (direct Supabase) | Current user's role (`user` / `moderator` / `admin`) |
| `use-meal-plan` | PowerSync meal_plans + meal_slots | Weekly meal plan data |
| `use-macros` | PowerSync + macro-service | Daily / weekly macro progress |
| `use-food-log` | food-log-service | `weekLogs`, `createFoodLog`, `deleteFoodLog`, `loading`, `error` |
| `use-grocery` | PowerSync grocery | Grocery list |
| `use-calendar` | calendar service | Device calendar events + meal export |
| `use-recipes` | PowerSync recipes | Recipe list + search |
| `use-top-recipes` | recipe-service | Top/recommended recipes |
| `use-offline` | PowerSync | Offline state indicator |
| `use-theme` | `constants/theme.ts` + system | Current scheme's design tokens |
| `use-color-scheme` / `.web` | System | Color scheme (platform-split) |
| `use-keyboard-slide` | Keyboard events | Animated keyboard avoidance |

**Where to add new hooks:** `src/hooks/use-<feature>.ts`. Platform variants use `.web.ts` suffix.

---

## Theme system (`src/constants/theme.ts`)

All visual tokens live here. Never hard-code colors, spacing, or font sizes.

```ts
Colors.light / Colors.dark     // ThemeColor keys: text, background, backgroundElement,
                               // backgroundSelected, textSecondary, border, success, warning, error
Colors.accent / accentLight / accentDark  // brand orange, scheme-independent

Spacing.xs / sm / md / lg / xl / xxl / xxxl   // 4 / 8 / 12 / 16 / 24 / 32 / 48
FontSizes.xs / sm / md / lg / xl / xxl / hero  // 12 / 14 / 16 / 18 / 22 / 28 / 34
BorderRadius.sm / md / lg / xl / full
Fonts.sans / sansBody / serif / rounded / mono  // platform-aware font stacks
MaxContentWidth = 800           // max container width for web
BottomTabInset                  // Android/web bottom nav clearance
```

**How to consume:** call `useTheme()` in any component — returns the current scheme's color set.

```ts
const theme = useTheme();
<View style={{ backgroundColor: theme.background }} />
```

Never use `ThemedView` / `ThemedText` or `Colors.light.*` directly in new code.

---

## Components (`src/components/`)

### Primitives (`src/components/ui/`)

| Component | Use for |
|---|---|
| `button.tsx` | All tap targets / CTAs |
| `input.tsx` | Text inputs |
| `screen.tsx` | Page containers (`ScreenContainer`, `ScreenCard`, `ScreenTitle`) |
| `loading-modal.tsx` | Full-screen loading overlay (driven by `LoadingContext`) |

### Feature component folders

```
components/
  calendar/
    day-column.tsx              # Single day's column in the weekly grid
    week-events-overlay.tsx     # Overlay layer rendering meal slot + food log cards
    meal-slot-card.tsx          # Planned meal card
    food-log-card.tsx           # Logged food card (opens FoodLogDetailModal on tap)
    add-meal-slot-modal.tsx     # Modal with "Plan Recipe" | "Log Food" mode toggle
    log-food-form.tsx           # Food log form: Manual / My Library / FatSecret / Barcode tabs
    food-log-detail-modal.tsx   # View/edit a food log; Save to Library; Flag food
    meal-slot-detail-modal.tsx  # View/edit a planned meal slot; log servings eaten
    event-detail-modal.tsx      # Device calendar event detail
    recipe-picker-modal.tsx     # Pick a recipe to plan on a slot
    calendar-picker-modal.tsx   # Date picker popup
    week-picker-modal.tsx       # Week navigator
    external-event-block.tsx    # Device calendar event block on the grid
  food/
    barcode-scanner.tsx         # Full-screen camera scanner; fires onFoodFound on match
    fatsecret-attribution.tsx   # "Powered by FatSecret" badge — required on all FatSecret data
  macros/
    macro-progress-bar.tsx      # Horizontal progress bar for a single macro
    meal-macro-breakdown.tsx    # Per-meal macro list (planned + logged, unified, ordered by time)
    progress-ring.tsx           # Circular progress ring
  grocery/
    grocery-item-row.tsx        # Single grocery item with check/delete
    grocery-category-group.tsx  # Grouped grocery items by category
  dashboard/
    calendar-preview-card.tsx   # Calendar snapshot on the dashboard
    grocery-preview-card.tsx    # Grocery list snapshot on the dashboard
    macros-preview-card.tsx     # Today's macro summary on the dashboard
    nudge-banner.tsx            # Contextual nudge / onboarding prompt
    recipe-preview-card.tsx     # Featured recipe on the dashboard
  recipes/
    recipe-card.tsx             # Recipe card (grid or list)
    recipe-detail-view.tsx      # Full recipe detail (ingredients + instructions)
    ingredient-input.tsx        # Autocomplete ingredient input for recipe creation
  auth-screen.tsx               # Shared auth screen shell
  onboarding-screen.tsx         # Shared onboarding screen shell
  themed-text.tsx / themed-view.tsx  # Legacy wrappers — avoid in new code
```

**Where to add new components:**
- Reusable primitive → `src/components/ui/`
- Feature-specific → `src/components/<feature>/`
- Full-screen shared shell → `src/components/`

---

## Models (`src/models/`)

Each file exports a TypeScript interface (app-side shape) and a `*Table` const (PowerSync schema). Keep them in sync.

| File | Table(s) | Notes |
|---|---|---|
| `user.ts` | `users` | Auth user + profile data |
| `recipe.ts` | `recipes` | Recipe metadata + macros |
| `ingredient.ts` | `ingredients` | Recipe ingredients |
| `meal-plan.ts` | `meal_plans` | A user's meal plan for a week |
| `meal-slot.ts` | `meal_slots` | Single planned meal on the calendar; has `servings_eaten` for actual consumed amount |
| `grocery.ts` | `grocery` | Grocery list item |
| `food-log.ts` | `food_logs`, `food_log_items` | What the user actually ate — log header + per-food-item rows |
| `personal-food.ts` | `personal_foods` | User's saved food library |

---

## Constants (`src/constants/`)

| File | Contains |
|---|---|
| `theme.ts` | All design tokens (see Theme system above) |
| `env.ts` | Typed env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `POWERSYNC_URL`, `SPOONACULAR_API_KEY`, `USDA_API_KEY` |
| `macros.ts` | `MacroKey`, `MACRO_LABELS`, `FoodLabelMacros` array, `FoodLabelMacroKey` type |
| `dietary-tags.ts` | Dietary preference tag definitions |

---

## Utilities (`src/utils/`)

Pure functions with no side effects or imports from services/hooks.

| File | Does |
|---|---|
| `grocery-aggregator.ts` | Aggregates meal plan ingredients into categorized grocery list |
| `ingredient-parser.ts` | Parses raw ingredient strings into amount, unit, and name |
| `serving-scaler.ts` | Scales recipe macros by serving count |
| `macro-calculator.ts` | Pure macro math helpers |

---

## Contexts (`src/contexts/`)

| File | Provides |
|---|---|
| `loading-context.tsx` | Global loading overlay — `useLoading()` returns `{ showLoading, hideLoading }` |

---

## Platform-specific files

Files ending in `.web.ts` / `.web.tsx` are loaded instead of their `.ts` / `.tsx` counterpart on web:

```
use-color-scheme.ts       ← Android
use-color-scheme.web.ts   ← Web
use-theme.ts / .web.ts
powersync.tsx             ← Android (full PowerSync)
powersync.web.tsx         ← Web (passthrough stub)
calendar.ts               ← Android (expo-calendar, native device calendar)
calendar.web.ts           ← Web (Google Calendar REST API, OAuth)
```

Target platforms are **Android** and **Web**. iOS is not actively supported (no dev account).

---

## Role-based access

`profiles.role` values: `user` | `moderator` | `admin`.

| Hook / file | Role purpose |
|---|---|
| `src/hooks/use-user-role.ts` | Fetches current user's role from `profiles` table |
| `src/app/(tabs)/profile/admin/_layout.tsx` | Redirects non-moderator/admin to profile |
| `src/app/(tabs)/profile/index.tsx` | Shows admin section only for `moderator` / `admin` |
| `moderate-food/`, `set-user-role/` edge functions | Verify role server-side on every write |

New admin-gated screens go in `src/app/(tabs)/profile/admin/`.

---

## FatSecret integration

All FatSecret API calls go through the `search-food` Edge Function — credentials are never exposed to the client. The Edge Function routes by request body key:

- `{ query }` → text search
- `{ barcode }` → barcode lookup
- `{ food_id }` → full food detail with all serving options

`src/services/fatsecret.ts` wraps these with 7-day `AsyncStorage` caching.

**"Powered by FatSecret" attribution is required** on every screen showing FatSecret data. Use `<FatSecretAttribution />` from `src/components/food/fatsecret-attribution.tsx`.

FatSecret search results are automatically cached to `public_foods` (background, fire-and-forget via `cachePublicFood`). Manual submissions queue for moderator review.

---

## Calendar integration

Calendar is platform-split:

| Platform | Implementation | Mechanism |
|---|---|---|
| **Android** | `src/services/calendar.ts` | `expo-calendar` — native device calendar; requests OS permission at runtime, reads all device calendars, writes to a "Prepd" calendar it creates |
| **Web** | `src/services/calendar.web.ts` | Google Calendar REST API — OAuth-based; no Recal or third-party proxy |

`src/hooks/use-calendar.ts` wraps both implementations for components — import only the hook, never the service directly.

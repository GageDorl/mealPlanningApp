# Prepd — Architecture Reference

## Project layout

```
mealPlan/
  src/
    app/          # Expo Router file-based routes (screens)
    components/   # Shared UI components (feature sub-folders + ui/ primitives)
    hooks/        # Custom React hooks
    store/        # Redux Toolkit store + slices
    services/     # External integrations (Supabase, PowerSync, Calendar)
    models/       # PowerSync table schemas + TypeScript interfaces
    constants/    # Theme, env, dietary tags, macro constants
    utils/        # Pure utility functions (no side effects)
```

---

## Routing (`src/app/`)

Expo Router with file-based routing. Every file in `src/app/` becomes a route.

```
app/
  _layout.tsx                  # Root layout: Redux Provider + PowerSyncProvider + ThemeProvider
  index.tsx                    # Home screen — redirects to sign-in if not authenticated
  +html.tsx                    # Web-only HTML shell
  (auth)/
    _layout.tsx                # Auth group layout
    sign-in.tsx
    sign-up.tsx
  (onboarding)/
    _layout.tsx                # Onboarding group layout
    dietary-preferences.tsx
    macro-goals.tsx
    calendar-connect.tsx
  auth/
    callback.tsx               # OAuth redirect handler
    calendar-callback.tsx      # Google Calendar OAuth callback
  oauth/consent/index.tsx      # OAuth consent screen
  calendar/index.tsx           # Weekly meal planner
  macros/index.tsx             # Daily macro tracking
  grocery/
    index.tsx                  # Grocery list with categories
    pantry-staples.tsx
  profile/index.tsx
```

Route groups `(auth)` and `(onboarding)` share layouts but don't affect the URL path.

**Where to add new screens:** create `src/app/<feature>/index.tsx` for feature root or `src/app/<feature>/<sub>.tsx` for sub-pages.

---

## State management (`src/store/`)

Redux Toolkit. The store has four slices:

| Slice | File | Manages |
|---|---|---|
| `ui` | `slices/ui-slice.ts` | `selectedDate`, dashboard module visibility, active filters |
| `search` | `slices/search-slice.ts` | Search query / results state |
| `recipeForm` | `slices/recipe-form-slice.ts` | In-progress recipe creation form |
| `onboarding` | `slices/onboarding-slice.ts` | Onboarding step state |

**When to use Redux vs hooks:** Redux is for cross-screen ephemeral UI state (selected date, search). Server/DB data goes through PowerSync hooks (`use-meal-plan`, `use-macros`, etc.), not Redux.

**Where to add new state:** add a slice in `src/store/slices/`, register it in `src/store/index.ts`.

---

## Data layer

### Supabase (`src/services/supabase.ts`)
Auth client. Handles email/password auth, Google and Apple OAuth, and session management. Use `supabase` directly for auth operations only — data reads/writes go through PowerSync.

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

**Where to add new tables:** define the schema in `src/models/<name>.ts`, import and add to `syncTables` in `src/services/powersync.tsx`.

### Services (`src/services/`)
Thin wrappers over Supabase queries, used by hooks. Never called directly from components.

| File | Responsibility |
|---|---|
| `supabase.ts` | Auth client + auth helpers |
| `user-service.ts` | User profile CRUD |
| `meal-plan-service.ts` | Meal plan read/write |
| `macro-service.ts` | Macro calculation helpers |
| `grocery-service.ts` | Grocery list operations |
| `calendar.ts` / `calendar.web.ts` | Google Calendar integration (platform-split) |
| `calendar.types.ts` | Shared calendar types |

---

## Hooks (`src/hooks/`)

Hooks are the bridge between services/store and components.

| Hook | Data source |
|---|---|
| `use-user-profile` | Supabase / PowerSync users table |
| `use-meal-plan` | PowerSync meal_plans + meal_slots |
| `use-macros` | PowerSync + macro-service |
| `use-grocery` | PowerSync grocery table |
| `use-calendar` | calendar service |
| `use-theme` | `constants/theme.ts` + system color scheme |
| `use-color-scheme` / `.web` | System color scheme (platform-split) |

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
BottomTabInset                  // iOS/Android bottom nav clearance
```

**How to consume:** call `useTheme()` in any component — it returns the current scheme's color set merged with scheme-independent values.

```ts
const theme = useTheme();
<View style={{ backgroundColor: theme.background }} />
```

---

## Components (`src/components/`)

### Primitives (`src/components/ui/`)

| Component | Use for |
|---|---|
| `button.tsx` | All tap targets / CTAs |
| `input.tsx` | Text inputs |
| `screen.tsx` | Page containers (`ScreenContainer`, `ScreenCard`, `ScreenTitle`) |

### Themed wrappers
`themed-text.tsx` and `themed-view.tsx` — legacy wrappers still in use throughout the app. Prefer `View`/`Text` + `useTheme()` directly for new code.

### Feature component folders

```
components/
  calendar/     # Day columns, meal slot cards, modals
  macros/       # Progress rings, macro bars, meal breakdown
  grocery/      # Grocery item rows, category groups
  auth-screen.tsx       # Shared auth screen shell
  onboarding-screen.tsx # Shared onboarding screen shell
```

**Where to add new components:**
- Reusable primitive → `src/components/ui/`
- Feature-specific → `src/components/<feature>/`
- Full-screen shared shell → `src/components/`

---

## Models (`src/models/`)

Each file exports two things: a TypeScript interface (app-side shape) and a `*Table` const (PowerSync schema). Keep them in sync.

---

## Constants (`src/constants/`)

| File | Contains |
|---|---|
| `theme.ts` | All design tokens (see above) |
| `env.ts` | Typed env vars (Supabase URL/key, PowerSync URL) |
| `macros.ts` | Macro names, RDA defaults |
| `dietary-tags.ts` | Dietary preference tag definitions |

---

## Utilities (`src/utils/`)

Pure functions with no side effects or imports from services/hooks.

| File | Does |
|---|---|
| `grocery-aggregator.ts` | Aggregates meal plan ingredients into categorized grocery list |

---

## Platform-specific files

Files ending in `.web.ts` / `.web.tsx` are loaded instead of their `.ts` / `.tsx` counterpart on web. Pattern:

```
use-color-scheme.ts       ← iOS / Android
use-color-scheme.web.ts   ← Web
```

Same applies to `powersync` and `calendar` services.

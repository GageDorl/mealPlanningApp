<div align="center">

# Prepd — Meal Planning App

**Plan meals. Shop smarter. Eat better.**

[![Expo](https://img.shields.io/badge/Expo-SDK_56-000020?logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.85-61DAFB?logo=react&logoColor=white)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Platforms](https://img.shields.io/badge/Platforms-Android%20%7C%20Web-brightgreen)](#)

</div>

---

Cross-platform meal planning app built with Expo (Android / Web), Supabase, and PowerSync for offline-first sync.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli) — `npm install -g supabase` (or use `npx supabase`)
- A [Supabase](https://supabase.com/) account
- A [PowerSync](https://www.powersync.com/) account (for offline sync)
- (Optional) [Expo Go](https://expo.dev/go) on your Android device for quick testing

---

## Quickstart

### 1. Clone and install

```bash
git clone <repo-url>
cd mealPlanningApp/mealPlan
npm install
```

### 2. Configure environment variables

Get the `.env` file from your team lead and place it at `mealPlan/.env`. It contains these variables:

| Variable | What it's for |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `EXPO_PUBLIC_POWERSYNC_URL` | PowerSync instance URL (offline sync) |
| `EXPO_PUBLIC_SPOONACULAR_API_KEY` | Spoonacular recipe API (optional) |
| `EXPO_PUBLIC_USDA_API_KEY` | USDA nutrition data API (optional) |

FatSecret and Google Calendar API credentials are **Edge Function secrets only** — never bundled into the app. Already set in the deployed Edge Functions; teammates don't need to `supabase secrets set`.

### 3. Link Supabase and apply migrations

```bash
# from the repo root (mealPlanningApp/)
npx supabase login
npx supabase link --project-ref <project-ref>   # get the ref from your team lead
npx supabase db push --linked
```

Run `db push` again whenever new migrations are added to `supabase/migrations/`.

---

### 4. Run the app

```bash
cd mealPlan

npm run web        # Web browser — fastest for development
npm run android    # Android emulator (requires Android Studio)
npx expo start     # Interactive — choose platform at runtime
```

---

## Features

### Meal Planning
- Weekly calendar view with drag-to-reschedule meal slots
- Recipe browsing with per-serving macro scaling
- Calendar export for planned meals (Android: native device calendar; Web: Google Calendar)

### Macro Tracking
- **Daily Macro Progress** — planned meals and logged food summed into a single daily total with progress rings and per-macro bars
- **Food Log** — log what you actually ate alongside planned meals
  - Manual entry with full nutrition label fields (calories, protein, carbs, fat, saturated fat, sodium, fiber, sugar, and more)
  - Meal labels (Breakfast / Lunch / Dinner / Snack), time-of-day picker
  - Untimed entries appear in the calendar's all-day row
- **FatSecret Search** — search millions of generic and branded foods
  - Serving size picker populated from FatSecret's own serving options
  - "Powered by FatSecret" attribution required on all FatSecret data
- **Barcode Scanner** — scan a product barcode to auto-fill nutrition details
- **Personal Food Library** — save frequently used foods for one-tap re-logging
  - Inline edit (name, brand, serving size, core macros)
  - Share individual foods to the community database
- **Community Food Database** — shared foods contributed by all users
  - FatSecret results are cached automatically on first search (trusted, auto-approved)
  - Manual submissions enter a moderation queue
  - Unified search order: Personal Library → Community → FatSecret, deduplicated by FatSecret ID
  - Source badges on every search result (My Library / Community / FatSecret)
- **Macro Trend Chart** — 7 / 30 / 90-day historical view of daily macro intake with pinch-to-zoom and pan
- **Flag food** — report inaccurate community entries with an optional reason

### Adaptive Macro Goals
- **Macro Planner** — personalized macro recommendations using the Mifflin-St Jeor BMR formula
  - Body stats (height, date of birth, biological sex) stored once in Account settings and reused across sessions
  - Two goal modes: *General* (lose / maintain / gain direction) or *Specific target* (goal weight + deadline — weekly rate calculated and warned if aggressive)
  - Activity level selector (sedentary / light / moderate / active)
  - Recommendations screen shows calories, protein, carbs, and fat; all values are editable before applying
  - Guidance section surfaces diet-specific tips (high-protein for loss, calorie surplus for gain, etc.)
- **Weight Goal Tracking** — set a target weight and date; the app tracks your baseline and shows progress over time; cleared automatically when goals are updated
- **Adaptive Calorie Recalibration** — once at least 7 days of overlapping weight logs and calorie data exist, the app calculates your actual TDEE from week-over-week average weight change vs. average daily intake (using the 3500 kcal/lb rule). It then applies the deficit or surplus needed to reach your goal weight by your deadline and surfaces an adjustment card on the macros screen showing your estimated daily burn, the new calorie target, and updated protein/carbs/fat splits. Suspicious days (under 800 kcal logged, or unexpected weight gain despite low intake) are flagged so you can exclude them before accepting the adjustment. Adjustments can be applied with one tap or dismissed for 7 days. A 1200 kcal floor is enforced.
- **Profile completeness check** — if height / DOB / sex aren't set, a banner redirects to Account settings before entering the planner

### Weight Logging
- Log daily weight readings with timestamps
- Running history used to pre-populate current weight in the Macro Planner
- Weight section on the macros screen shows latest entry and goal progress

### Moderation & Administration
- **Pending Foods** *(moderator + admin)* — review manually submitted community foods; approve or reject with optional moderator notes
- **Flagged Foods** *(moderator + admin)* — review flagged entries; see each flag (who flagged, reason, date); clear flags, re-pend for full re-review, or hard-remove
- **User Roles** *(admin only)* — paginated user list with email search; tap any user to assign `user`, `moderator`, or `admin` role
- Admin section is hidden entirely for standard users; role is fetched from the `profiles` table

### Role System

| Role | Access |
|------|--------|
| `user` | Log food, search, use personal library, flag community entries |
| `moderator` | All user access + approve/reject submissions + manage flags |
| `admin` | All moderator access + assign roles to any user |

---

## Project structure

```
mealPlanningApp/
├── mealPlan/                        # Expo app
│   ├── src/
│   │   ├── app/                     # File-based routes (Expo Router)
│   │   │   ├── (auth)/              # Sign-in, sign-up
│   │   │   ├── (onboarding)/        # Dietary prefs, macro goals, calendar connect
│   │   │   └── (tabs)/              # Main tab screens
│   │   │       ├── index.tsx        # Dashboard
│   │   │       ├── calendar.tsx     # Weekly meal planner + food log
│   │   │       ├── search.tsx       # Recipe / food search
│   │   │       ├── macros/          # Daily macro tracking
│   │   │       │   ├── index.tsx            # Macro dashboard (progress, food log, weight)
│   │   │       │   ├── macro-planner.tsx    # Goal input (weight, activity, direction/target)
│   │   │       │   └── macro-recommendation.tsx  # BMR recommendation + editable goals
│   │   │       ├── grocery/         # Grocery list + pantry staples
│   │   │       ├── recipes/         # Recipe detail, create, import, saved
│   │   │       └── profile/
│   │   │           ├── food-library.tsx        # Personal food library
│   │   │           └── admin/                  # Moderation screens (mod + admin only)
│   │   │               ├── pending-foods.tsx
│   │   │               ├── flagged-foods.tsx
│   │   │               └── user-roles.tsx
│   │   ├── components/              # Shared UI components
│   │   │   ├── calendar/            # Calendar grid, food log form, modals
│   │   │   ├── food/                # Barcode scanner, FatSecret attribution
│   │   │   ├── macros/              # Progress bars, rings, macro breakdown
│   │   │   ├── dashboard/           # Dashboard preview cards
│   │   │   └── ui/                  # Primitives: Button, Input, Screen, LoadingModal
│   │   ├── hooks/                   # useUserProfile, useUserRole, useFoodLog, useMacros, …
│   │   ├── services/                # Supabase queries, FatSecret, calendar, service layer
│   │   ├── models/                  # PowerSync table schemas + TypeScript interfaces
│   │   ├── utils/                   # Pure utilities
│   │   └── constants/               # Theme, macros, dietary tags, env
│   ├── .env                         # Local env vars (gitignored)
│   └── .env.example                 # Template — copy this to .env
├── supabase/
│   ├── functions/                   # Edge Functions (Deno/TypeScript)
│   │   ├── search-food/             # FatSecret proxy: text search, barcode lookup, food detail
│   │   ├── submit-public-food/      # Cache / share a food to the community DB
│   │   ├── flag-food/               # Flag a community food entry
│   │   ├── moderate-food/           # Approve / reject / manage flags (mod + admin)
│   │   ├── set-user-role/           # List users and assign roles (admin only)
│   │   └── fetch-recipe-html/       # Fetch raw HTML for URL-based recipe import
│   └── migrations/                  # SQL migrations — applied with `db push`
└── specs/                           # Feature specs, data model, and task tracking
```

---

## Common Supabase CLI commands

```bash
# Check which migrations have been applied
npx supabase migration list --linked

# Push new migrations to the remote DB
npx supabase db push --linked

# Preview what would be pushed without applying it
npx supabase db push --linked --dry-run

# Run an ad-hoc query against the remote DB
npx supabase db query --linked "SELECT * FROM public_foods LIMIT 5;"
```

## License

See [LICENSE](./mealPlan/LICENSE).

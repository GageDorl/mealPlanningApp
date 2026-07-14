<div align="center">

# Bento — Meal Planning App

**Plan meals. Shop smarter. Eat better.**

[![Expo](https://img.shields.io/badge/Expo-SDK_56-000020?logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.85-61DAFB?logo=react&logoColor=white)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Platforms](https://img.shields.io/badge/Platforms-Android%20%7C%20Web-brightgreen)](#)

</div>

---

Cross-platform meal planning app built with Expo (Android / Web), Supabase, and PowerSync for offline-first sync. AI features (weekly meal planning, food suggestions, recipe import parsing, grocery list generation) are powered by Claude via Supabase Edge Functions.

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
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

Get the `.env` file from your team lead and place it at `mealPlan/.env` (template at `mealPlan/.env.example`). It contains these variables:

| Variable | What it's for |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `EXPO_PUBLIC_POWERSYNC_URL` | PowerSync instance URL (offline sync) |
| `EXPO_PUBLIC_SPOONACULAR_API_KEY` | Spoonacular recipe API (optional) |

FatSecret, Google OAuth, and Anthropic (Claude) credentials are **Edge Function secrets only** — never bundled into the app. Already set in the deployed Edge Functions; teammates don't need to `supabase secrets set`.

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

### Onboarding & Tutorial
- Guided post-signup flow: body details (height, birthday, biological sex) → 5-chapter interactive tutorial (Welcome, Macros & Nutrition, Meal Planning, Recipes, Grocery List) with animated feature previews
- Setup steps embedded directly in the tutorial: macro goals, dietary preferences, calendar connect
- Per-chapter progress saved; the tutorial can be revisited any time from the profile

### Meal Planning
- Weekly calendar with 2D pan and drag-to-reschedule meal slots (including dragging untimed entries from the all-day row into the timed grid)
- Meal slots hold recipes and/or standalone food items, with per-serving adjustment
- **AI Week Planner** — answer a short questionnaire (cook time, fresh vs. meal-prep style, budget, meals per day, what's in your pantry) and Claude drafts a full week of meals you can edit and commit to the calendar
- **Google Calendar integration (OAuth)** — planned meals sync to a dedicated calendar; your existing Google Calendar events overlay on the week grid, with per-calendar visibility toggles

### Macro Tracking
- **Daily Macro Progress** — planned meals and logged food summed into a single daily total with progress rings and per-macro bars
- **Food Log** — log what you actually ate alongside planned meals
  - Manual entry with full nutrition label fields (calories, protein, carbs, fat, saturated fat, sodium, fiber, sugar, and more)
  - Meal labels (Breakfast / Lunch / Dinner / Snack), icons, time-of-day picker
  - Untimed entries appear in the calendar's all-day row
- **FatSecret Search** — search millions of generic and branded foods
  - Serving size picker populated from FatSecret's own serving options, plus weight-based conversion ("my amount" in g/oz)
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
- **AI Food Suggestions** — Claude suggests specific foods to fill your remaining macros for the day
- **Macro Trend Chart** — 7 / 30-day history of calories, protein, carbs, fat, and weight; bar or line view, drag-to-pan on the 30-day range, goal reference lines
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
- Log daily weight readings, with a dashboard banner prompting a daily check-in when a goal is active
- Weight trend on the macro chart with goal line overlay
- Running history pre-populates current weight in the Macro Planner

### Recipes
- **Spoonacular search** with cuisine, diet (vegetarian / vegan / gluten-free / dairy-free), and max-cook-time filters
- Manual recipe builder with per-ingredient macro lookup
- **AI URL import** — paste a recipe URL; the app fetches it, reads schema.org data, and uses Claude to parse ingredients into structured quantities (with a local-parser fallback)
- Saved / favorited recipes, most-used recipes surfaced when planning
- **Popular recipes** — admin-curated list shown to all users, with drag-to-reorder and a configurable display limit

### Grocery List
- Auto-generated shopping list from the week's planned meals, grouped by category, with check-off
- **AI generation & pantry matching** — Claude consolidates ingredients across recipes and skips things you already have
- **Pantry staples** — maintain a list of always-on-hand items that are excluded from generated lists

### Notifications (Android)
- Per-meal-slot reminders, weekly planning nudge, daily macro check-in, and adaptive-macro adjustment reminders — each individually toggleable in Profile → Notifications

### Offline-First Sync
- PowerSync wraps Supabase so recipes, meal plans, food logs, and personal foods work fully offline and sync when back online
- Platform-split connectors (native SQLite / web), offline detection, and pull-to-refresh throughout

### Account & App
- Light / dark / system theme, persisted to your profile
- Dashboard with preview cards (calendar, macros, grocery, recipes) and a contextual nudge banner for unfinished setup
- Password reset flow, display-name editing, and full account deletion
- About, privacy policy, and terms-of-service pages

### Moderation & Administration
- **Pending Foods** *(moderator + admin)* — review manually submitted community foods; approve or reject with optional moderator notes
- **Flagged Foods** *(moderator + admin)* — review flagged entries; see each flag (who flagged, reason, date); clear flags, re-pend for full re-review, or hard-remove
- **User Roles** *(admin only)* — paginated user list with email search; tap any user to assign `user`, `moderator`, or `admin` role
- **Popular Recipes** *(admin only)* — curate and reorder the recipe list shown to all users
- Admin section is hidden entirely for standard users; role is fetched from the `profiles` table

### Role System

| Role | Access |
|------|--------|
| `user` | Log food, search, use personal library, flag community entries |
| `moderator` | All user access + approve/reject submissions + manage flags |
| `admin` | All moderator access + assign roles + curate popular recipes |

---

## Project structure

```
mealPlanningApp/
├── mealPlan/                        # Expo app
│   ├── src/
│   │   ├── app/                     # File-based routes (Expo Router)
│   │   │   ├── (auth)/              # Sign-in, sign-up, forgot password
│   │   │   ├── (tutorial)/          # 5-chapter onboarding tutorial
│   │   │   ├── auth/                # OAuth/email callbacks, profile details, reset password
│   │   │   └── (tabs)/              # Main tab screens
│   │   │       ├── index.tsx        # Dashboard (preview cards + nudges)
│   │   │       ├── calendar.tsx     # Weekly meal planner + food log
│   │   │       ├── plan-week.tsx    # AI week planner
│   │   │       ├── search.tsx       # Spoonacular recipe search
│   │   │       ├── macros/          # Macro dashboard, planner, recommendations
│   │   │       ├── grocery/         # Grocery list + pantry staples
│   │   │       ├── recipes/         # Recipe detail, create, import, saved
│   │   │       └── profile/         # Account, appearance, notifications,
│   │   │           └── admin/       #   food library, admin/moderation screens
│   │   ├── components/              # Shared UI (calendar/, macros/, food/, tutorial/,
│   │   │                            #   week-planner/, dashboard/, ui/)
│   │   ├── hooks/                   # useUserProfile, useMacros, useGrocery, …
│   │   ├── services/                # Supabase, PowerSync, FatSecret, Spoonacular,
│   │   │                            #   Google Calendar, Claude AI, notifications
│   │   ├── models/                  # PowerSync table schemas + TypeScript interfaces
│   │   ├── utils/                   # Pure utilities
│   │   └── constants/               # Theme, macros, dietary tags, tutorial chapters, env
│   ├── cypress/                     # End-to-end tests (auth, calendar, food log)
│   ├── .env                         # Local env vars (gitignored)
│   └── .env.example                 # Template — copy this to .env
├── supabase/
│   ├── functions/                   # Edge Functions (Deno/TypeScript)
│   │   ├── search-food/             # FatSecret proxy: text search, barcode lookup, detail
│   │   ├── suggest-weekly-meals/    # Claude: AI week planner
│   │   ├── suggest-foods/           # Claude: macro-filling food suggestions
│   │   ├── parse-ingredients/       # Claude: ingredient parsing for recipe import
│   │   ├── generate-grocery-list/   # Claude: grocery list consolidation
│   │   ├── pantry-check/            # Claude: match list items against pantry staples
│   │   ├── fetch-recipe-html/       # Fetch raw HTML for URL-based recipe import
│   │   ├── google-oauth-*/          # Google Calendar OAuth (link, verify, mobile callback)
│   │   ├── google-calendar/         # Calendar CRUD + prep-calendar management
│   │   ├── submit-public-food/      # Cache / share a food to the community DB
│   │   ├── flag-food/               # Flag a community food entry
│   │   ├── moderate-food/           # Approve / reject / manage flags (mod + admin)
│   │   ├── set-user-role/           # List users and assign roles (admin only)
│   │   └── delete-account/          # Full account deletion
│   └── migrations/                  # SQL migrations — applied with `db push`
├── powersync/                       # PowerSync sync rules (sync.yaml)
├── specs/                           # Feature specs, data model, and task tracking
└── ARCHITECTURE.md                  # Architecture deep-dive
```

---

## Testing

```bash
cd mealPlan
npm run lint       # ESLint
npm run cy:open    # Cypress e2e — interactive (exports web build, serves it, opens Cypress)
npm run cy:run     # Cypress e2e — headless
```

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

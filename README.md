<div align="center">

# Prepd — Meal Planning App

**Plan meals. Shop smarter. Eat better.**

[![Expo](https://img.shields.io/badge/Expo-SDK_56-000020?logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.85-61DAFB?logo=react&logoColor=white)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Platforms](https://img.shields.io/badge/Platforms-iOS%20%7C%20Android%20%7C%20Web-brightgreen)](#)

</div>

---

Cross-platform meal planning app built with Expo (iOS / Android / Web), Supabase, and PowerSync for offline-first sync.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli) — `npm install -g supabase` (or use `npx supabase`)
- A [Supabase](https://supabase.com/) account
- A [PowerSync](https://www.powersync.com/) account (for offline sync)
- (Optional) [Expo Go](https://expo.dev/go) on your phone for quick device testing

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
| `RECAL_API_KEY` | Recal API key for Google Calendar integration — **Edge Function secret only**, not bundled into the app. Already set in the deployed Edge Functions — teammates don't need to run `supabase secrets set`. |

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
npm run ios        # iOS simulator (requires macOS + Xcode)
npm run android    # Android emulator (requires Android Studio)
npx expo start     # Interactive — choose platform at runtime
```

---

## Project structure

```
mealPlanningApp/
├── mealPlan/                    # Expo app
│   ├── src/
│   │   ├── app/                 # File-based routes (Expo Router)
│   │   ├── components/          # Shared UI components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── services/            # Supabase queries and service layer
│   │   ├── utils/               # Pure utilities (grocery aggregator, etc.)
│   │   └── constants/           # Theme, env config
│   ├── .env                     # Local env vars (gitignored)
│   └── .env.example             # Template — copy this to .env
├── supabase/
│   ├── functions/               # Edge Functions (Deno/TypeScript)
│   │   ├── recal-oauth-link/    # Initiates Google Calendar OAuth via Recal
│   │   ├── recal-oauth-verify/  # Handles OAuth callback, stores tokens
│   │   └── recal-calendar/      # Calendar read/write + connection management
│   └── migrations/              # SQL migrations — applied with `db push`
└── specs/                       # Feature specs, data model, and task tracking
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
npx supabase db query --linked "SELECT * FROM pantry_staples LIMIT 5;"
```

## License

See [LICENSE](./mealPlan/LICENSE).

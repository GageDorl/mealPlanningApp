# Research: Prepd MVP

**Branch**: `001-prepd-mvp` | **Date**: 2026-05-22

## R-001: PowerSync + Supabase + Expo SDK 56 Compatibility

**Decision**: PowerSync is fully compatible with Expo SDK 56 managed workflow. No dev client needed.

**Rationale**: PowerSync provides out-of-the-box local-first sync between SQLite and Supabase Postgres, which directly satisfies Constitution Principle I (Local-First). It handles conflict resolution and offline queuing without custom sync logic.

**Key packages**:
- `@powersync/react-native` — React Native SDK
- `@journeyapps/react-native-quick-sqlite` — SQLite engine (peer dependency)
- `@azure/core-asynciterator-polyfill` — async iterator support
- `@supabase/supabase-js` — Supabase client

**Setup requirements**:
- Add `@babel/plugin-transform-async-generator-functions` to Babel config for watched queries
- If using `expo-updates`, set `expo.updates.useThirdPartySQLitePod: true` in `ios/Podfile.properties.json`

**Architecture**: PowerSync is source of truth for all local data. Supabase is the cloud persistence layer. Sync is bidirectional and automatic.

**Alternatives considered**:
- WatermelonDB — solid but requires writing custom sync adapters
- Firebase/Firestore offline mode — locks into Google ecosystem, NoSQL not ideal for relational recipe data
- Manual sync with SQLite + Supabase — high engineering cost for conflict resolution

---

## R-002: Spoonacular API — Integration & Rate Limit Strategy

**Decision**: Use Spoonacular for recipe search and detail with aggressive local caching. Cache recipe details for 30 days, search results for 7 days.

**Rationale**: Spoonacular provides the richest recipe data (ingredients, instructions, nutrition, cuisine, diets, difficulty) of any available API. The free tier's 150 requests/day constraint is manageable with caching since users save recipes locally.

**Key endpoints**:
- `/recipes/complexSearch` — search with filters (1 point + extras per result)
- `/recipes/{id}/information` — full recipe detail with ingredients, instructions
- `/recipes/{id}/nutritionWidget.json` — detailed nutrition breakdown

**Rate limit strategy**:
- Cache all recipe details in PowerSync/SQLite on first fetch — never re-fetch a seen recipe
- Cache search results in SQLite for 7 days keyed by query + filters
- Use `addRecipeNutrition=true` on search to avoid a separate nutrition call (costs extra points but saves a request)
- Display cached results while offline; show "search requires internet" banner when disconnected

**Cost per request**: Basic search = 1 point. With nutrition: ~1.025 points/result. With instructions: ~1.05 points/result. Budget: ~100 full recipe fetches/day on free tier.

**Alternatives considered**:
- Edamam — strong nutrition but fewer recipes, less developer-friendly
- TheMealDB — free but limited data (no macros, small database)
- Building a proprietary recipe DB — massive content creation effort, no MVP value

---

## R-003: USDA FoodData Central — Ingredient Macro Lookup

**Decision**: Use USDA FDC for per-ingredient macro lookup when users create custom recipes.

**Rationale**: USDA provides the most accurate, government-sourced nutrition data per raw ingredient. Free, high rate limits (1,000 req/hour), and comprehensive nutrient profiles. Complements Spoonacular which provides recipe-level macros.

**Key endpoint**: `/foods/search` with `query` param and `dataType=["Foundation","SR Legacy"]`

**Response structure**: Returns `foodNutrients[]` array where each entry has `nutrient.name` and `value` (per 100g). App must convert to the user's specified quantity/unit.

**API key**: Required (free signup at fdc.nal.usda.gov). No billing.

**Rate limits**: 1,000 requests/hour (~24,000/day). More than sufficient for custom recipe creation.

**Gotchas**:
- Nutrient values are per 100g — app must handle unit conversion
- Response includes 50+ nutrients (vitamins, minerals) — filter to tracked macros only
- Food names are USDA-style descriptions (e.g., "Chicken, broilers or fryers, breast") — need fuzzy search UI

**Alternatives considered**:
- Nutritionix — good data but paid API
- OpenFoodFacts — community-sourced, inconsistent quality
- Manual entry only — poor UX, users won't calculate macros themselves

---

## R-004: Calendar Integration — Platform Strategy

**Decision**: Use `expo-calendar` for native (iOS/Android) read/write. Use Google Calendar REST API directly for web. Abstract behind a platform-agnostic service layer.

**Rationale**: `expo-calendar` provides native calendar access with full read/write support on iOS and Android but does NOT work on web. For web, the Google Calendar API v3 with OAuth 2.0 is the standard approach. A service abstraction layer (`services/calendar.ts`) hides the platform difference.

**Native (expo-calendar)**:
- Read: `Calendar.getEventsAsync()` — returns events from synced calendars (Google, Apple, etc.)
- Write: `Calendar.createEventAsync()` — creates events in any writable calendar
- Permissions: `Calendar.requestCalendarPermissionsAsync()`
- Works with any calendar synced to the device (Google, Apple, Exchange, etc.)

**Web (Google Calendar API)**:
- Uses OAuth 2.0 with PKCE flow
- Read: `events.list()` endpoint
- Write: `events.insert()` endpoint
- Requires separate OAuth client ID for web

**OAuth setup**:
- Google Cloud Console: create 3 OAuth client IDs (iOS, Android, Web)
- Scopes: `https://www.googleapis.com/auth/calendar` (read/write)
- Supabase Auth handles Google sign-in; calendar OAuth piggybacked on same token where possible

**Apple Calendar on web**: Not supported. Apple Calendar is native-only via EventKit. Web users with Apple Calendar must use iCloud Calendar or a different provider.

**Gotchas**:
- iOS 17+ supports write-only access (no read) — must request full access
- Google OAuth refresh tokens expire after 6 months of disuse
- Platform-specific file: `services/calendar.ts` (native) + `services/calendar.web.ts` (web)

**Alternatives considered**:
- Nylas — unified calendar API, but paid and adds backend dependency
- CalDAV direct — too low-level, no SDK support
- Skip web calendar entirely — rejected because web is the demo platform

---

## R-005: schema.org JSON-LD Recipe Parsing

**Decision**: Build a lightweight custom parser that extracts `<script type="application/ld+json">` from HTML and maps to the app's recipe model. Use `schema-dts` npm package for TypeScript type definitions.

**Rationale**: JSON-LD extraction is straightforward (find script tag, parse JSON, validate `@type: "Recipe"`). No heavyweight library needed. Most major recipe sites (AllRecipes, Food Network, Serious Eats, NYT Cooking, Tasty) embed schema.org Recipe data.

**Parsing flow**:
1. Fetch URL HTML content
2. Extract all `<script type="application/ld+json">` tags
3. Parse JSON, find object with `@type: "Recipe"` (may be nested in `@graph`)
4. Map schema.org fields to app recipe model
5. Convert ISO 8601 durations (e.g., `PT15M` → 15 minutes)
6. Auto-populate the recipe form; leave missing fields empty for user input

**Key schema.org → app mappings**:
| schema.org | App field |
|-----------|-----------|
| `name` | `title` |
| `description` | `description` |
| `image` | `imageUrl` |
| `prepTime` | `prepMinutes` (parse ISO 8601) |
| `cookTime` | `cookMinutes` (parse ISO 8601) |
| `recipeYield` | `servings` |
| `recipeIngredient[]` | `ingredients[]` (raw strings, need parsing) |
| `recipeInstructions[]` | `steps[]` |
| `recipeCuisine` | `cuisineType` |
| `nutrition.calories` | `calories` |
| `nutrition.proteinContent` | `protein` |
| `nutrition.carbohydrateContent` | `carbs` |
| `nutrition.fatContent` | `fat` |

**Edge cases**:
- Some sites nest Recipe inside `@graph` array
- `recipeIngredient` is raw strings ("2 cups flour") — quantity/unit parsing is complex; store as-is for MVP
- Nutrition fields are optional — many sites omit them
- Some sites use `HowToStep` objects, others use plain strings for instructions

**Packages**: `schema-dts` for TypeScript types. HTML parsing can use `DOMParser` (web) or a lightweight regex extractor (native) — no heavy dependencies like cheerio needed since we only need `<script>` tag content.

**Alternatives considered**:
- Cheerio — full HTML parser, overkill for extracting script tags
- microdata-parser — not widely maintained
- Server-side scraping — adds backend complexity, violates local-first principle

---

## R-006: Redux Toolkit + PowerSync Architecture

**Decision**: PowerSync is source of truth for all persisted data. Redux Toolkit manages transient UI state (selected day, active filters, form state, loading indicators). Redux reads from PowerSync via watched queries, writes go through PowerSync CRUD transactions.

**Rationale**: PowerSync already provides reactive queries (`.watch()`) that update when local data changes. Duplicating all data in Redux would create sync conflicts. Instead, Redux holds UI-specific state that doesn't need persistence, and reads persisted data via PowerSync hooks.

**Architecture**:
```
PowerSync SQLite (persisted data: recipes, meal plans, grocery, user profile)
    ↕ watched queries
Custom hooks (useRecipes, useMealPlan, etc.)
    ↓
React components

Redux Toolkit (transient UI state)
    - selectedDate, activeFilters, searchQuery
    - formState (recipe creation in-progress)
    - loading/error states for API calls
    - onboarding progress
    - dashboard module expand/collapse state
```

**Redux slices**:
- `uiSlice` — selected date, active tab, dashboard module states
- `searchSlice` — search query, filters, loading state
- `recipeFormSlice` — in-progress recipe creation/import form state
- `onboardingSlice` — onboarding step progress, skipped steps

**PowerSync hooks** (not Redux):
- `useRecipes()` — watched query on recipes table
- `useMealPlan(weekStart)` — watched query on meal_slots for a week
- `useGroceryList(weekStart)` — computed from meal plan ingredients
- `useMacroProgress(date)` — computed from day's planned meals
- `useUserProfile()` — watched query on user profile

**Writing data**: All writes go through PowerSync CRUD transactions. PowerSync handles local persistence + cloud sync. Redux is NOT updated directly for persisted data — it reacts to PowerSync watch callbacks.

**Key packages**: `@reduxjs/toolkit`, `react-redux`

**Alternatives considered**:
- Redux as sole state manager (with redux-persist) — conflicts with PowerSync's sync model
- Zustand — simpler but user chose Redux for resume value
- PowerSync hooks only (no Redux) — works for data but awkward for transient UI state

---

## R-007: Testing Strategy

**Decision**: Jest + React Native Testing Library for unit/component tests. Plan for Maestro E2E tests in a future phase.

**Rationale**: Jest is pre-configured in Expo projects. RNTL provides idiomatic component testing. Detox requires native builds and is heavyweight for MVP. Maestro is simpler for E2E but can be added later.

**Unit test targets**: `utils/macro-calculator.ts`, `utils/grocery-aggregator.ts`, `utils/serving-scaler.ts`, `services/schema-import.ts` (JSON-LD parsing)

**Component test targets**: Dashboard modules, recipe form, meal slot assignment

**Packages**: `jest`, `@testing-library/react-native` (already available via Expo)

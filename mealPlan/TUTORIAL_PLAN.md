# Tutorial Onboarding — Implementation Plan

Replaces the existing 3-screen onboarding flow with a 5-chapter interactive tutorial.
Accessible from Profile after completion. Entirely skippable. Progress persisted in Supabase.

## Decisions

| Decision | Choice |
|---|---|
| Format | Separate tutorial screens (not live overlay) |
| Onboarding relation | Replaces existing onboarding entirely |
| Setup steps | Embedded as action slides inside relevant chapters |
| Progress storage | Supabase (`tutorial_completed`, `tutorial_chapters_completed[]`) |
| End screen | "You're all set!" summary before navigating home |
| Illustrations | **Interactive previews with filler data** — NOT static screenshots. Each info slide has an `illustrationKey` that maps to a small preview component rendering the real UI with fake data. New slides should follow this pattern. |
| Action slides | **Demo-only** — no DB reads or writes anywhere in tutorial components. `MacroGoalsSetup` shows a fully interactive 2-step form (weight → recommendation) using `recommendMacroPlan` as a pure function with example body stats. `DietaryPreferencesSetup` and `CalendarConnectSetup` use local state only. All action slides are `skippable: true`. |
| Future enhancement | **Field-by-field guided tour** — for complex forms like the macro planner, a future phase could highlight each field individually with an explanation tooltip. Tracked here as a design intent, not yet implemented. |

## Chapter Map

| # | ID | Title | Setup step embedded |
|---|---|---|---|
| 1 | `welcome` | Welcome to Prepd | — |
| 2 | `macros` | Macros & Nutrition | Macro planner + Dietary preferences |
| 3 | `meal-planning` | Meal Planning | Calendar connect (skippable) |
| 4 | `recipes` | Recipes | — |
| 5 | `grocery` | Grocery List | — |

---

## Phase 1 — Supabase Schema & Types ✅

Add tutorial progress fields to the database and sync layer.

- [x] Write migration in `supabase/migrations/` adding columns to `public.users`:
  - `tutorial_completed` already existed in initial schema
  - Added `tutorial_chapters_completed TEXT NOT NULL DEFAULT '[]'` via `supabase/migrations/20260626000002_tutorial_chapters_completed.sql`
- [x] Push migration (`npx supabase db push` from repo root) — applied successfully
- [x] Update `src/models/user.ts` — added `tutorialCompleted: boolean` and `tutorialChaptersCompleted: string[]` to `User`
- [x] Update `src/services/user-service.ts` — added `tutorial_completed` and `tutorial_chapters_completed` to `UserProfile` interface; updated `createUserProfile` INSERT to include `tutorial_chapters_completed = '[]'`
- [x] Update `src/hooks/use-user-profile.ts` — added both fields to `UserRow`; mapped `tutorial_completed` via `Boolean()` and `tutorial_chapters_completed` via `JSON.parse()` in `useMemo`
- [x] PowerSync sync rules unchanged — `SELECT * FROM users WHERE id = auth.user_id()` in `powersync/sync.yaml` already covers all columns
- [x] No Edge Function change needed — DB defaults initialize both fields; `createUserProfile` in `user-service.ts` handles the local SQLite INSERT

---

## Phase 2 — Chapter Config & Type Definitions ✅

Define the tutorial shape in a single config so all screens pull from it.

- [x] Created `src/types/tutorial.ts` — `InfoSlide`, `ActionSlide`, `TutorialSlide` union, `TutorialChapter` (includes `estimatedMinutes` for chapter list display)
- [x] Created `src/constants/tutorial-chapters.ts` — all 5 chapters with full slide content + helper functions (`getChapterById`, `getChapterIndex`, `getNextChapterId`, `CHAPTER_COUNT`):
  - `welcome` — 3 info slides
  - `macros` — 2 info → action `macro-goals` → action `dietary-prefs` → 2 info slides
  - `meal-planning` — 4 info → action `calendar-connect` (skippable) → 1 info slide
  - `recipes` — 4 info slides
  - `grocery` — 4 info slides

---

## Phase 3 — Tutorial Infrastructure Components & Hook ✅

Build the reusable UI layer and state management that all chapters share.

- [x] Created `src/components/tutorial/TutorialSlideView.tsx` — renders `InfoSlide` with accent-tinted illustration placeholder, bold title, secondary-color body; uses `useTheme()`
- [x] Created `src/components/tutorial/TutorialChapterLayout.tsx` — manages slide state; dot pagination (active dot widens to pill); Back/Next nav (info slides only — action slides advance via `onComplete`); "Skip chapter" top-right; "Skip this step" link for skippable action slides; `renderAction` prop resolves action slides (falls back to labeled placeholder + Continue button during Phase 3)
- [x] Created `src/components/tutorial/TutorialProgressHeader.tsx` — thin accent progress bar + "Chapter X of N · Title" label
- [x] Created `src/hooks/use-tutorial.ts` — reads profile via `useUserProfile()`; `markChapterComplete`, `completeTutorial`, `skipTutorial`, `isChapterComplete`, `nextIncompleteChapter`
- [x] Added `updateTutorialChapters` and `completeTutorialProgress` to `src/services/user-service.ts` (used by the hook)

---

## Phase 4 — Tutorial Routes ✅

Create the route group and all tutorial screens.

- [x] Create `src/app/(tutorial)/_layout.tsx` — Stack layout (no tab bar); "Skip Tutorial" header button (right) wired to `useTutorial().skipTutorial()`; auth guard redirects unauthenticated users to sign-in
- [x] Create `src/app/(tutorial)/index.tsx` — Chapter list screen: intro header, chapter cards (icon, title, estimated time, ✓ if complete), "Start/Resume Tutorial" CTA to `nextIncompleteChapter()`, "Skip Tutorial" link at bottom
- [x] Create `src/app/(tutorial)/[chapter].tsx` — Chapter viewer: reads `chapter` param, renders `TutorialProgressHeader` + `TutorialChapterLayout`; on complete calls `markChapterComplete` then pushes to next chapter or replaces to `/(tutorial)/complete`
- [x] Create `src/app/(tutorial)/complete.tsx` — "You're all set!" screen: all 5 chapter icons with ✓, summary copy, "Go to Home" button calls `completeTutorial()`; overrides header to hide Skip Tutorial and back buttons

---

## Phase 5 — Replace Existing Onboarding & Extract Setup Components ✅

Wire new users into the tutorial and extract onboarding forms into embeddable components.

- [x] Created `src/components/tutorial/setup/MacroGoalsSetup.tsx` — explanatory text + "Open Macro Planner" (router.push to macro-planner) + "Skip for now" (onComplete); the planner is a separate screen so users come back naturally
- [x] Created `src/components/tutorial/setup/DietaryPreferencesSetup.tsx` — dietary tag grid with toggle buttons; calls `updateDietaryPreferences` then `onComplete` on "Save & Continue"; uses `DietaryTagLabels` for display
- [x] Created `src/components/tutorial/setup/CalendarConnectSetup.tsx` — connect/connected UI; calls `onComplete` on Continue; "Skip this step" is provided by TutorialChapterLayout (no duplicate skip button needed)
- [x] Updated `TutorialChapterLayout` — replaced Phase 3 placeholder with a `resolveAction` switch mapping `'macro-goals'`/`'dietary-prefs'`/`'calendar-connect'` to the real components; `renderAction` prop still available as override; removed dead placeholder styles
- [x] Updated `src/app/auth/callback.tsx:121` — `router.replace('/(tutorial)')` for new users (previously `'/macro-goals'`)
- [x] Deleted `src/app/(onboarding)/` folder entirely (macro-goals.tsx, dietary-preferences.tsx, calendar-connect.tsx, _layout.tsx)

---

## Phase 6 — Macros & Nutrition Chapter Content ✅

Polish the Macros chapter slides and verify action slides work end-to-end.

- [x] Finalize all slide `title` + `body` copy in `tutorial-chapters.ts` for the `macros` chapter:
  - Slide 1 (info): "What are macros?" — plain-language explanation of protein, carbs, fat
  - Slide 2 (info): "Your daily dashboard" — describes the calories ring, macro bars, and meal breakdown
  - Slide 3 (action, `macro-goals`): "Set your macro goals" — intro copy, then `MacroGoalsSetup` renders
  - Slide 4 (action, `dietary-prefs`): "Your food preferences" — intro copy, then `DietaryPreferencesSetup` renders
  - Slide 5 (info): "Logging food" — overview of FatSecret search, barcode scanner, manual entry
  - Slide 6 (info): "Adaptive recalibration" — after 7 days of data, Prepd suggests target adjustments
- [x] Test Macros chapter end-to-end: slides paginate correctly, action forms save data to PowerSync, chapter marks complete in Supabase

---

## Phase 7 — Meal Planning Chapter Content ✅

Polish the Meal Planning chapter and verify the skippable calendar connect action slide.

- [x] Finalize all slide copy for `meal-planning` chapter
- [x] Add `illustrationKey` + preview component for each info slide
- [x] Created `WeeklyCalendarPreview`, `AddMealSlotPreview`, `AssignRecipePreview`, `AdjustServingsPreview`, `CalendarSyncPreview`
- [x] Tooltip system upgraded: tooltips rendered at `TutorialSlideView` level (above title/body text), arrow centers on highlighted element via `onLayout`-measured `centerX`
- [x] Verify `skippable` slides show "Skip this step" link and advance without saving

---

## Phase 8 — Recipes Chapter Content ✅

Fill in all 4 Recipes slides (no setup steps).

- [x] Add `illustrationKey` + preview component for each slide using real app components:
  - `recipe-library` → `RecipeLibraryPreview` (real `RecipeCard` list + filter tabs)
  - `recipe-search` → `RecipeSearchPreview` (real `RecipeCard` results + cuisine chips)
  - `recipe-import` → `RecipeImportPreview` (URL input row + real `RecipeCard` for extracted result)
  - `recipe-builder` → `RecipeBuilderPreview` (real `IngredientInput` rows + macro summary)

---

## Phase 9 — Grocery List Chapter Content ✅

Fill in all 4 Grocery slides (no setup steps).

- [x] Add `illustrationKey` + preview component for each slide using real app components:
  - `grocery-generated` → `GroceryGeneratedPreview` (header + progress bar + real `GroceryCategoryGroup`)
  - `grocery-pantry` → `GroceryPantryPreview` (pantry header + staple rows mirroring pantry-staples.tsx)
  - `grocery-checklist` → `GroceryChecklistPreview` (progress at 50% + real `GroceryCategoryGroup` with mixed checked state)
  - `grocery-regenerate` → `GroceryRegeneratePreview` (100% progress + real `Button` "Regenerate List")

---

## Phase 10 — Profile Integration ✅

Make the tutorial re-accessible from the Profile screen at any time.

- [x] Added "App Tutorial" `NavRow` to `src/app/(tabs)/profile/index.tsx` — between Notifications and Appearance; navigates to `/(tutorial)`
- [x] Updated `src/app/(tutorial)/index.tsx` — revisit mode when `tutorialCompleted === true`:
  - Heading: "Review the tutorial"; subtitle: "Tap any chapter to revisit it."
  - CTA button: "Review Tutorial" (passes `revisit=1` param to chapter screen)
  - Chapter rows pass `revisit=1` when tapped in revisit mode
  - "Skip Tutorial" link hidden in revisit mode
- [x] Updated `src/app/(tutorial)/[chapter].tsx` — reads `revisit` param:
  - In revisit mode: Stack back button shown (no `headerLeft: () => null`)
  - In revisit mode: `handleChapterComplete` calls `router.back()` only (no `markChapterComplete`, no linear advance)

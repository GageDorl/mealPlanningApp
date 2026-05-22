# Tasks: Prepd MVP

**Input**: Design documents from `/specs/001-prepd-mvp/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, contracts/service-contracts.md, research.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. Designed for **3 developers working in parallel** on separate branches.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks within the phase)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Developer Assignment Strategy

Tasks are organized so 3 developers can work simultaneously after the shared setup/foundational phases:

| Developer | Branch | Primary Stories | Focus Area |
|-----------|--------|----------------|------------|
| **Dev A** | `feat/auth-onboarding-profile` | US1, US9, US10 | Auth, onboarding, dashboard, profile, tutorial |
| **Dev B** | `feat/recipes-custom-import` | US2, US3, US7 | Recipes (search, detail, custom, URL import, sharing) |
| **Dev C** | `feat/planner-macros-grocery` | US4, US5, US6, US8 | Meal planner, calendar sync, macros, grocery, notifications |

**Merge order**: Phase 1 & 2 merged to `main` first → Devs A, B, C branch from `main` → Dev A merges first (dashboard is the shell) → Dev B and C merge (features plug into dashboard).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and configuration. **One developer** completes this before parallel work begins.

- [x] T001 Install PowerSync, Supabase, Redux Toolkit, and auth dependencies per mealPlan/specs/001-prepd-mvp/quickstart.md
- [x] T002 Configure Babel with async-generator plugin in mealPlan/babel.config.js
- [x] T003 Create environment config with .env loading in mealPlan/.env.example and mealPlan/src/constants/env.ts
- [x] T004 [P] Update mealPlan/src/constants/theme.ts with Prepd design tokens (bright orange accent #FF6B2C, Futura-style font stack, updated spacing)
- [x] T005 [P] Create dietary tag constants in mealPlan/src/constants/dietary-tags.ts
- [x] T006 [P] Create default macro definitions in mealPlan/src/constants/macros.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented. **One developer** completes this (can be same as Phase 1).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T007 Initialize Supabase client with auth in mealPlan/src/services/supabase.ts
- [ ] T008 Initialize PowerSync with sync rules and table definitions in mealPlan/src/services/powersync.ts
- [ ] T009 [P] Define User TypeScript model and PowerSync table in mealPlan/src/models/user.ts
- [ ] T010 [P] Define Recipe and RecipeIngredient TypeScript models and PowerSync tables in mealPlan/src/models/recipe.ts
- [ ] T011 [P] Define Ingredient TypeScript model and PowerSync table in mealPlan/src/models/ingredient.ts
- [ ] T012 [P] Define MealPlan and MealSlot TypeScript models and PowerSync tables in mealPlan/src/models/meal-slot.ts and mealPlan/src/models/meal-plan.ts
- [ ] T013 [P] Define GroceryList, GroceryItem, and PantryStaple TypeScript models and PowerSync tables in mealPlan/src/models/grocery.ts
- [ ] T014 Configure Redux Toolkit store with slices structure in mealPlan/src/store/index.ts
- [ ] T015 [P] Create UI slice (selectedDate, dashboardModuleStates, activeFilters) in mealPlan/src/store/slices/ui-slice.ts
- [ ] T016 [P] Create search slice (searchQuery, filters, loading, results cache) in mealPlan/src/store/slices/search-slice.ts
- [ ] T017 [P] Create recipe form slice (in-progress form state for create/import) in mealPlan/src/store/slices/recipe-form-slice.ts
- [ ] T018 [P] Create onboarding slice (step progress, skipped steps tracking) in mealPlan/src/store/slices/onboarding-slice.ts
- [ ] T019 Create shared UI primitives (Button, Card, Input, ProgressRing, ProgressBar) in mealPlan/src/components/ui/
- [ ] T020 Remove existing Expo boilerplate screens and components (explore.tsx, hint-row.tsx, animated-icon.tsx, web-badge.tsx, app-tabs.tsx)
- [ ] T021 Set up root layout with auth gate and PowerSync provider in mealPlan/src/app/_layout.tsx
- [ ] T022 Create Supabase Postgres migration SQL for all 12 tables per data-model.md (output to specs/001-prepd-mvp/migrations/001_initial_schema.sql)

**Checkpoint**: Foundation ready — 3 developers can now work in parallel on separate branches.

---

## Phase 3: User Story 1 — Create Account and Set Up Profile (Priority: P1) 🎯 MVP

**Goal**: Users can sign up, complete onboarding, set macro goals, dietary preferences, and land on the dashboard.

**Independent Test**: Create account via email/Google/Apple → complete or skip onboarding → verify profile data persists across restart.

**Developer**: Dev A (`feat/auth-onboarding-profile`)

### Implementation for User Story 1

- [ ] T023 [US1] Create sign-in screen with email/password form in mealPlan/src/app/(auth)/sign-in.tsx
- [ ] T024 [US1] Create sign-up screen with email/password form in mealPlan/src/app/(auth)/sign-up.tsx
- [ ] T025 [US1] Implement Google OAuth sign-in flow using expo-auth-session in mealPlan/src/services/supabase.ts (extend auth methods)
- [ ] T026 [US1] Implement Apple sign-in flow using expo-auth-session in mealPlan/src/services/supabase.ts (extend auth methods)
- [ ] T027 [US1] Create auth layout with redirect logic in mealPlan/src/app/(auth)/_layout.tsx
- [ ] T028 [US1] Create onboarding layout with step navigation and skip buttons in mealPlan/src/app/(onboarding)/_layout.tsx
- [ ] T029 [P] [US1] Create macro goals onboarding step screen in mealPlan/src/app/(onboarding)/macro-goals.tsx
- [ ] T030 [P] [US1] Create dietary preferences onboarding step screen in mealPlan/src/app/(onboarding)/dietary-preferences.tsx
- [ ] T031 [P] [US1] Create calendar connection onboarding step screen in mealPlan/src/app/(onboarding)/calendar-connect.tsx
- [ ] T032 [US1] Implement userService.getProfile and userService.updateMacroGoals in mealPlan/src/services/user-service.ts
- [ ] T033 [US1] Implement userService.updateDietaryPreferences and userService.updateNotificationSettings in mealPlan/src/services/user-service.ts
- [ ] T034 [US1] Create useUserProfile hook with PowerSync watched query in mealPlan/src/hooks/use-user-profile.ts
- [ ] T035 [US1] Create profile/settings screen with macro goals editor, dietary preferences, and account info in mealPlan/src/app/profile/index.tsx

**Checkpoint**: User Story 1 complete — users can create accounts and configure profiles.

---

## Phase 4: User Story 9 — Dashboard as Central Hub (Priority: P1)

**Goal**: Dashboard renders the module grid with calendar, grocery, meals, and macros preview cards. Each module navigates to its detail screen.

**Independent Test**: Open app → verify 4 modules render → tap each → confirm correct screen opens. Macros module expands/collapses inline.

**Developer**: Dev A (`feat/auth-onboarding-profile`)

### Implementation for User Story 9

- [ ] T036 [US9] Create dashboard screen with module grid layout in mealPlan/src/app/index.tsx
- [ ] T037 [P] [US9] Create CalendarPreviewCard component in mealPlan/src/components/dashboard/calendar-preview-card.tsx
- [ ] T038 [P] [US9] Create GroceryPreviewCard component in mealPlan/src/components/dashboard/grocery-preview-card.tsx
- [ ] T039 [P] [US9] Create MealsPreviewCard component in mealPlan/src/components/dashboard/meals-preview-card.tsx
- [ ] T040 [P] [US9] Create MacrosPreviewCard component with compact/expanded toggle in mealPlan/src/components/dashboard/macros-preview-card.tsx
- [ ] T041 [US9] Create contextual nudge banner component for incomplete onboarding in mealPlan/src/components/dashboard/nudge-banner.tsx
- [ ] T042 [US9] Wire dashboard modules to stack navigation for calendar, grocery, macros, and recipe detail screens in mealPlan/src/app/index.tsx

**Checkpoint**: Dashboard shell is functional — feature detail screens can be developed independently.

---

## Phase 5: User Story 2 — Browse and Save Recipes (Priority: P1)

**Goal**: Users search Spoonacular, view recipe details, save recipes to their collection for offline access.

**Independent Test**: Search "chicken stir-fry" → view result → verify macros display → save → go offline → verify saved recipe accessible.

**Developer**: Dev B (`feat/recipes-custom-import`)

### Implementation for User Story 2

- [ ] T043 [US2] Implement Spoonacular API client (search, getDetail) with caching in mealPlan/src/services/spoonacular.ts
- [ ] T044 [US2] Implement recipeService.save, toggleFavorite, delete in mealPlan/src/services/recipe-service.ts
- [ ] T045 [US2] Create useRecipes hook with PowerSync watched query for saved recipes in mealPlan/src/hooks/use-recipes.ts
- [ ] T046 [US2] Create recipe search screen with keyword input and filter chips in mealPlan/src/app/recipes/search.tsx
- [ ] T047 [P] [US2] Create RecipeCard component (title, image, prep time, calories) in mealPlan/src/components/recipes/recipe-card.tsx
- [ ] T048 [US2] Create recipe detail screen (ingredients, steps, macros, difficulty, cuisine, save button) in mealPlan/src/app/recipes/[id].tsx
- [ ] T049 [P] [US2] Create RecipeDetailView component with serving size adjuster in mealPlan/src/components/recipes/recipe-detail-view.tsx
- [ ] T050 [US2] Implement serving scaler utility (recalculate ingredients + macros) in mealPlan/src/utils/serving-scaler.ts
- [ ] T051 [US2] Create saved recipes list screen (user's collection, offline indicator) in mealPlan/src/app/recipes/saved.tsx
- [ ] T052 [US2] Create useOffline hook for network status detection in mealPlan/src/hooks/use-offline.ts

**Checkpoint**: Recipe browsing and saving works end-to-end with offline support.

---

## Phase 6: User Story 3 — Create Custom Recipe and Import from URL (Priority: P2)

**Goal**: Users create custom recipes with USDA macro lookup and import recipes from URLs via schema.org JSON-LD.

**Independent Test**: Create recipe with 3 ingredients → macros auto-populate. Paste AllRecipes URL → form auto-fills → user confirms → saved.

**Developer**: Dev B (`feat/recipes-custom-import`)

### Implementation for User Story 3

- [ ] T053 [US3] Implement USDA FoodData Central API client (lookupIngredient) in mealPlan/src/services/usda.ts
- [ ] T054 [US3] Implement nutritionService.calculateForQuantity in mealPlan/src/utils/macro-calculator.ts
- [ ] T055 [US3] Implement schema.org JSON-LD parser (recipeService.importFromUrl) in mealPlan/src/services/schema-import.ts
- [ ] T056 [US3] Create recipe creation form screen with ingredient list, steps, and macro preview in mealPlan/src/app/recipes/create.tsx
- [ ] T057 [P] [US3] Create IngredientInput component with USDA autocomplete lookup in mealPlan/src/components/recipes/ingredient-input.tsx
- [ ] T058 [US3] Create URL import screen with URL input, loading state, error handling, and form pre-fill in mealPlan/src/app/recipes/import.tsx
- [ ] T059 [US3] Wire recipe form to recipeService.save with user review confirmation in mealPlan/src/app/recipes/create.tsx

**Checkpoint**: Full hybrid recipe sourcing works — API, manual, URL import all flow through the same review form.

---

## Phase 7: User Story 4 — Plan Meals on the Weekly Calendar (Priority: P1)

**Goal**: Weekly calendar view with custom meal slots, recipe assignment, external calendar overlay, and calendar write-back.

**Independent Test**: Connect Google Calendar → create meal slots for Monday → assign recipes → verify meals appear in Google Calendar.

**Developer**: Dev C (`feat/planner-macros-grocery`)

### Implementation for User Story 4

- [ ] T060 [US4] Implement calendarService.connect, getEvents, createMealEvent, deleteMealEvent for native in mealPlan/src/services/calendar.ts
- [ ] T061 [US4] Implement calendarService for web (Google Calendar REST API) in mealPlan/src/services/calendar.web.ts
- [ ] T062 [US4] Implement mealPlanService (getWeek, createSlot, assignRecipe, removeRecipe, deleteSlot, reorderSlots) in mealPlan/src/services/meal-plan-service.ts
- [ ] T063 [US4] Create useMealPlan hook with PowerSync watched query in mealPlan/src/hooks/use-meal-plan.ts
- [ ] T064 [US4] Create useCalendar hook for external events in mealPlan/src/hooks/use-calendar.ts
- [ ] T065 [US4] Create weekly planner screen with 7-day grid in mealPlan/src/app/calendar/index.tsx
- [ ] T066 [P] [US4] Create DayColumn component with meal slots and external event blocks in mealPlan/src/components/calendar/day-column.tsx
- [ ] T067 [P] [US4] Create MealSlotCard component (label, assigned recipe preview, empty state) in mealPlan/src/components/calendar/meal-slot-card.tsx
- [ ] T068 [P] [US4] Create ExternalEventBlock component for calendar busy blocks in mealPlan/src/components/calendar/external-event-block.tsx
- [ ] T069 [US4] Create AddMealSlot modal (label input, time picker) in mealPlan/src/components/calendar/add-meal-slot-modal.tsx
- [ ] T070 [US4] Create recipe picker modal for assigning recipes to meal slots in mealPlan/src/components/calendar/recipe-picker-modal.tsx
- [ ] T071 [US4] Wire meal slot assignment to calendarService.createMealEvent for calendar write-back in mealPlan/src/services/meal-plan-service.ts

**Checkpoint**: Weekly planner works with calendar integration end-to-end.

---

## Phase 8: User Story 5 — Track Daily Macros (Priority: P2)

**Goal**: Dashboard macros module shows daily progress, expandable inline. Detail screen shows per-meal breakdown.

**Independent Test**: Set macro goals → plan 3 meals → verify dashboard shows correct totals and percentages.

**Developer**: Dev C (`feat/planner-macros-grocery`)

### Implementation for User Story 5

- [ ] T072 [US5] Implement macroService.getDailyProgress and getWeeklyProgress in mealPlan/src/services/macro-service.ts
- [ ] T073 [US5] Create useMacros hook for daily progress computation in mealPlan/src/hooks/use-macros.ts
- [ ] T074 [P] [US5] Create ProgressRing component for compact macro display in mealPlan/src/components/macros/progress-ring.tsx
- [ ] T075 [P] [US5] Create MacroProgressBar component for expanded macro display in mealPlan/src/components/macros/macro-progress-bar.tsx
- [ ] T076 [US5] Create macro detail screen with per-meal breakdown in mealPlan/src/app/macros/index.tsx
- [ ] T077 [P] [US5] Create MealMacroBreakdown component (per-meal macro contributions) in mealPlan/src/components/macros/meal-macro-breakdown.tsx

**Checkpoint**: Macro tracking displays accurately on dashboard and detail screen.

---

## Phase 9: User Story 6 — Auto-Generate and Use Grocery List (Priority: P2)

**Goal**: Auto-generated grocery list from meal plan with aggregation, categories, checkboxes, and pantry staples.

**Independent Test**: Plan 3 meals → open grocery list → verify aggregation → check off items → mark pantry staple → regenerate → verify exclusion.

**Developer**: Dev C (`feat/planner-macros-grocery`)

### Implementation for User Story 6

- [ ] T078 [US6] Implement grocery-aggregator utility (combine duplicates, group by category, exclude pantry staples) in mealPlan/src/utils/grocery-aggregator.ts
- [ ] T079 [US6] Implement groceryService (generateList, toggleItemChecked, addPantryStaple, removePantryStaple) in mealPlan/src/services/grocery-service.ts
- [ ] T080 [US6] Create useGrocery hook with PowerSync watched query in mealPlan/src/hooks/use-grocery.ts
- [ ] T081 [US6] Create grocery list detail screen with category groups and progress indicator in mealPlan/src/app/grocery/index.tsx
- [ ] T082 [P] [US6] Create GroceryItemRow component (name, quantity, unit, checkbox) in mealPlan/src/components/grocery/grocery-item-row.tsx
- [ ] T083 [P] [US6] Create GroceryCategoryGroup component (collapsible category sections) in mealPlan/src/components/grocery/grocery-category-group.tsx
- [ ] T084 [US6] Create pantry staples management UI (add/remove staples) in mealPlan/src/app/grocery/pantry-staples.tsx

**Checkpoint**: Grocery list works end-to-end with aggregation, checking, and pantry staple exclusion.

---

## Phase 10: User Story 7 — Share a Recipe (Priority: P3)

**Goal**: Users share recipes via deep links. Recipients can view and import.

**Independent Test**: Share recipe → open link on another device → view recipe → tap Import → verify added to collection.

**Developer**: Dev B (`feat/recipes-custom-import`)

### Implementation for User Story 7

- [ ] T085 [US7] Implement deep link generation utility in mealPlan/src/utils/deep-link.ts
- [ ] T086 [US7] Implement recipeService.share in mealPlan/src/services/recipe-service.ts (extend)
- [ ] T087 [US7] Add share button to recipe detail screen with native share sheet in mealPlan/src/app/recipes/[id].tsx (extend)
- [ ] T088 [US7] Configure Expo deep linking for recipe URLs in mealPlan/app.json and mealPlan/src/app/_layout.tsx

**Checkpoint**: Recipe sharing via deep links works cross-platform.

---

## Phase 11: User Story 8 — Configure Notifications (Priority: P3)

**Goal**: Users toggle meal reminders, planning nudges, and macro check-ins. Notifications fire at correct times.

**Independent Test**: Enable meal reminders → plan meal at 6 PM → verify notification fires.

**Developer**: Dev C (`feat/planner-macros-grocery`)

### Implementation for User Story 8

- [ ] T089 [US8] Implement notification scheduling service (register, schedule, cancel) in mealPlan/src/services/notification-service.ts
- [ ] T090 [US8] Create notification settings screen with three independent toggles in mealPlan/src/app/profile/notifications.tsx
- [ ] T091 [US8] Wire meal slot creation/update to schedule meal reminder notifications in mealPlan/src/services/meal-plan-service.ts (extend)
- [ ] T092 [US8] Implement planning nudge scheduler (Sunday evening check) in mealPlan/src/services/notification-service.ts (extend)
- [ ] T093 [US8] Implement macro check-in scheduler (end-of-day summary) in mealPlan/src/services/notification-service.ts (extend)

**Checkpoint**: All three notification types configurable and firing correctly.

---

## Phase 12: User Story 10 — Onboarding Tutorial (Priority: P3)

**Goal**: Interactive tutorial walks users through calendar sync, meal planning, and dashboard usage. Replayable from settings.

**Independent Test**: Complete onboarding → tutorial starts → follow steps → go to settings → replay tutorial.

**Developer**: Dev A (`feat/auth-onboarding-profile`)

### Implementation for User Story 10

- [ ] T094 [US10] Create tutorial overlay/modal system with step-by-step highlights in mealPlan/src/components/onboarding/tutorial-overlay.tsx
- [ ] T095 [P] [US10] Create CalendarSyncTutorialStep component in mealPlan/src/components/onboarding/tutorial-steps/calendar-sync.tsx
- [ ] T096 [P] [US10] Create MealPlanningTutorialStep component in mealPlan/src/components/onboarding/tutorial-steps/meal-planning.tsx
- [ ] T097 [P] [US10] Create DashboardTutorialStep component in mealPlan/src/components/onboarding/tutorial-steps/dashboard.tsx
- [ ] T098 [US10] Add "Replay Tutorial" button to profile/settings screen in mealPlan/src/app/profile/index.tsx (extend)

**Checkpoint**: Tutorial system complete and replayable.

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, offline testing, cross-platform verification, and cleanup.

- [ ] T099 Verify all screens render correctly on iOS, Android, and Web — fix platform-specific issues
- [ ] T100 Test full offline workflow: create recipe → plan meals → check groceries → verify macros — all without internet
- [ ] T101 Test PowerSync bidirectional sync: make changes offline → reconnect → verify data syncs to Supabase → verify on second device
- [ ] T102 Verify calendar read/write works on iOS (expo-calendar), Android (expo-calendar), and Web (Google Calendar API)
- [ ] T103 Review all external data entry paths (Spoonacular save, URL import) to confirm user review gate per Constitution IV
- [ ] T104 Performance audit: dashboard render < 500ms, recipe search < 2s, grocery generation < 3s
- [ ] T105 Update mealPlan/app.json with Prepd branding (name, slug, scheme for deep links, icons)
- [ ] T106 Update mealPlan/README.md with Prepd project description, setup instructions, and architecture overview

---

## Dependencies & Parallel Execution

### Dependency Graph

```
Phase 1 (Setup) ─────────────────┐
                                  ▼
Phase 2 (Foundational) ──────────┤
                                  ▼
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              [Dev A]        [Dev B]        [Dev C]
              Phase 3        Phase 5        Phase 7
              (US1: Auth)    (US2: Browse)  (US4: Planner)
                    ▼             ▼             ▼
              Phase 4        Phase 6        Phase 8
              (US9: Dash)    (US3: Custom)  (US5: Macros)
                    ▼             ▼             ▼
              Phase 12       Phase 10       Phase 9
              (US10: Tut)    (US7: Share)   (US6: Grocery)
                    │             │             ▼
                    │             │         Phase 11
                    │             │         (US8: Notifs)
                    └─────────────┼─────────────┘
                                  ▼
                           Phase 13 (Polish)
```

### Parallel Execution by Developer

**Dev A** (Auth + Dashboard + Tutorial):
```
T023→T024→T025→T026→T027→T028→T029∥T030∥T031→T032→T033→T034→T035
→ T036→T037∥T038∥T039∥T040→T041→T042
→ T094→T095∥T096∥T097→T098
```

**Dev B** (Recipes + Custom + Import + Sharing):
```
T043→T044→T045→T046→T047∥→T048→T049∥→T050→T051→T052
→ T053→T054→T055→T056→T057∥→T058→T059
→ T085→T086→T087→T088
```

**Dev C** (Planner + Calendar + Macros + Grocery + Notifications):
```
T060→T061→T062→T063→T064→T065→T066∥T067∥T068→T069→T070→T071
→ T072→T073→T074∥T075→T076→T077∥
→ T078→T079→T080→T081→T082∥T083∥→T084
→ T089→T090→T091→T092→T093
```

---

## Implementation Strategy

### MVP Delivery Order

1. **Phase 1-2** (Setup + Foundation) — blocks everything, do first
2. **Phase 3** (US1: Auth) — must merge before dashboard
3. **Phase 4** (US9: Dashboard) — the app shell, must merge before features plug in
4. **Phase 5** (US2: Recipe browsing) — core content, high value
5. **Phase 7** (US4: Meal planner) — core differentiator
6. **Phase 6** (US3: Custom recipes) — extends recipe value
7. **Phase 8** (US5: Macros) — extends planner value
8. **Phase 9** (US6: Grocery) — completes the planning loop
9. **Phase 10-12** (Sharing, Notifications, Tutorial) — polish features

### Suggested MVP Scope

The absolute minimum viable product is **User Stories 1, 2, 4, and 9** (Phases 1-5 + Phase 7):
- User can sign up → see dashboard → search recipes → save recipes → plan meals on weekly calendar
- This delivers the core value proposition with ~60 tasks

### Branch Strategy

1. Complete Phase 1-2 on `001-prepd-mvp` and merge to `main`
2. Dev A creates `feat/auth-onboarding-profile` from `main`
3. Dev B creates `feat/recipes-custom-import` from `main`
4. Dev C creates `feat/planner-macros-grocery` from `main`
5. Dev A merges first (provides dashboard shell)
6. Dev B and Dev C rebase on `main` after Dev A merges, then merge
7. Phase 13 (Polish) done on `main` after all feature branches merge

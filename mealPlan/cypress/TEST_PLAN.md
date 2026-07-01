# Test Plan — Bento

## Testing strategy

Two layers:

- **E2E (Cypress)** — full user flows through the web app. Tests behaviour, not implementation. Already in place.
- **Component (React Native Testing Library + Jest)** — isolated tests for individual components and hooks. Fast, no browser required, works cross-platform. Not yet set up.

---

## What exists (E2E)

| File | Coverage |
|------|----------|
| `e2e/auth.cy.ts` | Marketing page, sign-in nav, invalid credentials, successful sign-in, sign-up nav |
| `e2e/calendar.cy.ts` | Weekly display, week navigation, home dashboard greeting |
| `e2e/food-log.cy.ts` | FAB → form open, manual tab switch, manual entry submit |

---

## E2E gaps by feature

### Auth (`e2e/auth.cy.ts` — extend)
- [ ] Sign-up with valid email creates account and lands on profile-details
- [ ] Sign-up with duplicate email shows error
- [ ] Sign-out clears session and returns to about screen
- [ ] Already-authenticated user visiting `/sign-in` is redirected to home
- [ ] Fresh sign-in shows spinner before home content appears (profileLoading fix)

### Onboarding / Tutorial (`e2e/tutorial.cy.ts` — new)
- [ ] New user after sign-up is routed to tutorial index
- [ ] Tutorial index shows all 5 chapters as incomplete
- [ ] Completing a chapter marks it with a checkmark
- [ ] Resuming tutorial starts from the first incomplete chapter
- [ ] Skip Tutorial routes to home and marks onboarding complete
- [ ] Existing user (`onboarding_completed = true`) signing in is NOT routed to tutorial
- [ ] Revisiting tutorial from profile shows "Review the tutorial" mode
- [ ] Tutorial setup steps: dietary preferences can be selected and saved
- [ ] Tutorial setup steps: macro goals form accepts input and saves
- [ ] Tutorial complete screen shows summary and routes to home

### Profile Details / Auth Setup (`e2e/auth.cy.ts` — extend)
- [ ] Profile-details screen after sign-up accepts display name
- [ ] Submitting profile-details routes to tutorial

### Home Dashboard (`e2e/home.cy.ts` — new)
- [ ] Greeting renders with correct time-of-day text
- [ ] Display name appears in header after profile loads
- [ ] Macros card shows "Set macro goals" empty state when no goals set
- [ ] Macros card shows calorie progress when goals exist
- [ ] Calendar preview card renders
- [ ] Grocery preview card shows checked/total counts
- [ ] Recipe preview card renders saved recipes
- [ ] Nudge banner appears when no macro goals are set
- [ ] DailyWeightBanner appears when user has a weight goal and hasn't logged today
- [ ] MacroAdjustmentBanner appears when recalibration is needed (seed the condition)
- [ ] Pull-to-refresh completes without error

### Calendar / Meal Planner (`e2e/calendar.cy.ts` — extend)
- [ ] FAB → Plan Meal opens recipe picker
- [ ] Selecting a recipe from picker adds a meal slot to the correct day
- [ ] Planned meal slot card shows recipe name on the grid
- [ ] Tapping a meal slot opens the detail modal
- [ ] Detail modal shows recipe name, servings, macros
- [ ] Adjusting servings in detail modal updates the displayed macros
- [ ] Removing a meal slot from detail modal removes it from the grid
- [ ] Logged food entries appear on the correct day alongside planned meals
- [ ] Tapping a food log entry opens the food log detail modal
- [ ] Week navigation preserves meal slots across back-and-forth navigation
- [ ] External calendar events appear as event blocks (when Google Calendar connected)

### Food Log (`e2e/food-log.cy.ts` — extend)
- [ ] FatSecret search returns results for a known food name
- [ ] Selecting a FatSecret result pre-fills macros
- [ ] Logged food appears on calendar grid after submission
- [ ] Personal library tab shows previously saved foods
- [ ] Selecting a library food pre-fills the form
- [ ] Community DB tab is visible and searchable
- [ ] Barcode scanner tab is visible (camera permission prompt handled)
- [ ] Editing an existing food log entry updates values
- [ ] Deleting a food log entry removes it from the calendar

### Macros (`e2e/macros.cy.ts` — new)
- [ ] Macros screen shows empty state when no goals configured
- [ ] Macro planner screen accepts activity level and body data
- [ ] Macro recommendation screen generates suggested targets
- [ ] Accepting recommendation creates macro goals
- [ ] Macro goals screen shows active goals with daily targets
- [ ] Daily totals reflect logged food entries
- [ ] Planned meals are included in daily macro totals
- [ ] Week summary strip shows per-day calorie totals
- [ ] Macro trend chart renders (may require seeded historical data)
- [ ] Weight section shows log and history
- [ ] Weight log modal accepts a new entry

### Grocery List (`e2e/grocery.cy.ts` — new)
- [ ] Grocery screen shows items generated from planned meals
- [ ] Items are grouped by category
- [ ] Checking off an item marks it complete
- [ ] Unchecking restores it
- [ ] Checked items count updates in the header
- [ ] Pantry staples screen is reachable
- [ ] Adding a pantry staple persists after navigating away and back
- [ ] Removing a pantry staple removes it from the list

### Recipes (`e2e/recipes.cy.ts` — new)
- [ ] Saved recipes list shows seeded recipe
- [ ] Empty state shown when no recipes saved
- [ ] Recipe detail view shows title, ingredients, and macros
- [ ] Plan recipe to a calendar day → meal slot appears on calendar
- [ ] Create recipe: fill title + at least one ingredient → save → appears in list
- [ ] Import recipe via URL (intercept edge function, stub response) → shows parsed result
- [ ] Deleting a recipe removes it from saved list
- [ ] Search within saved recipes filters results

### Search (`e2e/search.cy.ts` — new)
- [ ] Search tab is reachable from the tab bar
- [ ] Typing a query returns recipe results
- [ ] Tapping a result opens the recipe detail view
- [ ] Empty state shown for a query with no matches

### Personal Food Library (`e2e/food-library.cy.ts` — new)
- [ ] Food library screen reachable from profile
- [ ] Saved foods appear in the list
- [ ] Inline edit of name/macros updates the entry
- [ ] Deleting a food removes it from the library
- [ ] Sharing a food to community shows confirmation

### Profile & Settings (`e2e/profile.cy.ts` — new)
- [ ] Profile screen is reachable from the tab bar
- [ ] Display name can be updated and persists after re-navigation
- [ ] Appearance screen: light/dark toggle changes theme
- [ ] Notifications screen: toggles can be switched and persist
- [ ] Account screen is reachable
- [ ] Delete account shows confirmation prompt before proceeding
- [ ] Admin panel link is NOT visible to regular users
- [ ] Admin panel IS visible to moderator/admin users (seed a moderator account)

### Admin (`e2e/admin.cy.ts` — new, moderator seed required)
- [ ] Pending foods queue shows submitted community foods
- [ ] Approving a food moves it out of the queue
- [ ] Flagged foods queue shows reported entries
- [ ] User roles screen lists users and their roles
- [ ] Popular recipes screen renders without error

### Static / Marketing (`e2e/auth.cy.ts` — extend)
- [ ] Privacy policy page renders
- [ ] Terms of service page renders
- [ ] About page has Sign In and Get Started buttons

---

## Seed tasks needed

Extend `cypress/tasks/seed.ts` to add:

| Task | Purpose |
|------|---------|
| `cleanPlannedMeals` | Reset meal slots between calendar tests |
| `cleanMacroGoals` | Reset goals between macro tests |
| `cleanRecipes` | Reset recipes between recipe tests |
| `cleanGroceryItems` | Reset grocery state |
| `seedRecipe` | Insert a known recipe for recipe/calendar tests |
| `seedMacroGoals` | Insert goals so macros card is not in empty state |
| `seedPlannedMeal` | Insert a meal slot tied to the test recipe |
| `seedWeightLogs` | Insert historical weight data for trend tests |
| `seedModeratorUser` | Insert a second test account with `moderator` role |

---

## Component testing (React Native Testing Library + Jest)

### Setup needed
- Install: `@testing-library/react-native`, `@testing-library/jest-native`, `jest`, `jest-expo`
- Configure `jest.config.js` using `jest-expo` preset
- Mock PowerSync (`usePowerSync`, `useQuery`) and Supabase client in `__mocks__`
- Mock `expo-router` (`useRouter`, `useLocalSearchParams`) globally

### UI primitives (`src/components/ui/`)
- **`button.cy.ts`** — renders label, calls onPress, disabled state prevents press, variant styles apply
- **`input.cy.ts`** — renders value, calls onChangeText, secureTextEntry masks text
- **`toggle.cy.ts`** — renders on/off state, calls onValueChange
- **`loading-modal.cy.ts`** — visible/hidden based on `visible` prop, dismiss button calls onDismiss
- **`date-picker-modal.cy.ts`** — opens/closes, calls onConfirm with selected date

### Dashboard widgets (`src/components/dashboard/`)
- **`macros-preview-card`** — empty state when no progress, progress bar fills proportionally, onPress fires
- **`grocery-preview-card`** — shows correct checked/total counts, empty state
- **`recipe-preview-card`** — renders recipe list, empty state, calls onRecipePress and onViewAll
- **`nudge-banner`** — renders correct message for each nudge condition (no goals, no calendar, etc.)

### Calendar components (`src/components/calendar/`)
- **`meal-slot-card`** — renders recipe name and meal type, onPress fires
- **`food-log-card`** — renders food name and calories, onPress fires
- **`day-column`** — renders correct day label, renders child slot/log cards
- **`meal-slot-detail-modal`** — shows recipe name, servings input, macro breakdown, close calls onClose

### Macro components (`src/components/macros/`)
- **`macro-progress-bar`** — fills to correct percentage, clamps at 100%, correct color
- **`progress-ring`** — renders SVG ring at correct fill
- **`week-summary-strip`** — renders 7 days, highlights today, shows calorie totals

### Grocery components (`src/components/grocery/`)
- **`grocery-item-row`** — renders item name, checked state toggles on press, strike-through when checked
- **`grocery-category-group`** — renders category header and child rows

### Recipe components (`src/components/recipes/`)
- **`recipe-card`** — renders title and image, onPress fires
- **`ingredient-input`** — renders ingredient fields, calls onChange, remove button fires

### Tutorial components (`src/components/tutorial/`)
- **`TutorialProgressHeader`** — shows correct chapter count and progress
- **`TutorialChapterLayout`** — renders slide content and navigation buttons
- **`TooltipCard`** — renders title and body text, visible/hidden based on prop

### Hooks (`src/hooks/`)
- **`use-user-profile`** — returns `profileLoading = true` when userId set but no userRow; returns `null` profile when no userId; maps userRow fields correctly
- **`use-tutorial`** — `isChapterComplete` returns correct value; `nextIncompleteChapter` returns first incomplete; `tutorialCompleted` false when chapters missing
- **`use-macros`** — daily totals sum food logs + planned meals for the given date

---

## Suggested implementation order

### E2E (phase 1 — foundational)
1. Seed task extensions
2. Tutorial / Onboarding — validates the fresh-install fix
3. Home Dashboard
4. Profile & Settings

### E2E (phase 2 — core features)
5. Macros (goals + daily totals)
6. Grocery list
7. Recipes (with edge function intercept)
8. Food Log extensions (FatSecret, library, edit/delete)

### E2E (phase 3 — advanced)
9. Search
10. Personal Food Library
11. Calendar extensions (planned meals, detail modal)
12. Admin

### Component tests (can be done in parallel with any E2E phase)
1. UI primitives (no mocking needed)
2. Dashboard widgets
3. Macro components
4. Grocery + Recipe components
5. Hooks
6. Calendar + Tutorial components

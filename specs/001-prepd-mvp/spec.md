# Feature Specification: Prepd MVP

**Feature Branch**: `001-prepd-mvp`  
**Created**: 2026-05-22  
**Status**: Draft  
**Input**: User description: "Prepd MVP — cross-platform meal planning app with dashboard, recipes, macro tracking, grocery list, and calendar sync for college students and busy people"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Account and Set Up Profile (Priority: P1)

A new user downloads Prepd and creates an account using email, Google, or Apple sign-in. They are guided through a skip-friendly onboarding flow where they can set daily macro goals (e.g., 2,200 calories, 150g protein), select dietary preferences (e.g., vegetarian, gluten-free), and connect their Google or Apple calendar. Every step is skippable — the user can start using the app immediately and configure later.

**Why this priority**: Without authentication and basic profile setup, no other feature can persist or personalize data. This is the foundation for every subsequent story.

**Independent Test**: Can be fully tested by creating an account via each auth method (email, Google, Apple), completing onboarding, skipping onboarding, and verifying profile data persists across app restarts.

**Acceptance Scenarios**:

1. **Given** a new user opens the app, **When** they sign up with email and password, **Then** an account is created and they land on the onboarding flow.
2. **Given** a user is on the onboarding flow, **When** they set macro goals for Calories (2,200) and Protein (150g), **Then** those goals are saved to their profile.
3. **Given** a user is on the onboarding dietary preferences step, **When** they select "Vegetarian" and "Gluten-free", **Then** those tags are saved and will filter future recipe searches.
4. **Given** a user is on the calendar connection step, **When** they skip it, **Then** they land on the dashboard and a contextual nudge says "Connect your calendar to plan meals around your schedule."
5. **Given** a user completes onboarding, **When** they close and reopen the app, **Then** all profile data (goals, preferences) persists.

---

### User Story 2 - Browse and Save Recipes (Priority: P1)

A user searches for recipes by keyword, cuisine, or dietary filter. They browse results sourced from an external recipe database, view recipe details (ingredients, steps, nutrition macros, difficulty, prep/cook time), and save recipes they like to their personal collection. Saved recipes are available offline.

**Why this priority**: Recipes are the core content of the app. Without the ability to discover and save recipes, the meal planner and grocery list have nothing to work with.

**Independent Test**: Can be tested by searching for "chicken stir-fry", viewing a result, checking that macros display correctly, saving it, toggling airplane mode, and verifying the saved recipe is still accessible.

**Acceptance Scenarios**:

1. **Given** a user navigates to recipe search, **When** they type "pasta" and tap search, **Then** a list of pasta recipes appears with title, image, prep time, and calorie count.
2. **Given** search results are displayed, **When** the user applies a "Vegetarian" filter, **Then** only vegetarian pasta recipes remain.
3. **Given** a user taps on a recipe, **When** the detail screen loads, **Then** it shows ingredients, step-by-step instructions, nutrition macros per serving, difficulty level, and cuisine type.
4. **Given** a user is viewing a recipe detail, **When** they tap "Save", **Then** the recipe is added to their saved collection and flagged for offline access.
5. **Given** a user has saved recipes, **When** they go offline, **Then** saved recipes are fully viewable including ingredients and macros.

---

### User Story 3 - Create Custom Recipe and Import from URL (Priority: P2)

A user creates a custom recipe by filling out a form (name, ingredients with quantities, steps, serving size). The app looks up nutrition macros for each ingredient automatically. Alternatively, a user pastes a recipe URL, the app extracts structured data, and auto-populates the form. In both cases, the user reviews and confirms before saving.

**Why this priority**: Hybrid recipe sourcing is a key differentiator. Users need to add personal recipes and import from food blogs to make the planner useful beyond the built-in database.

**Independent Test**: Can be tested by manually creating a recipe with 3 ingredients, verifying macro lookup populates, and by pasting a recipe URL from a popular food blog and confirming the form auto-fills correctly.

**Acceptance Scenarios**:

1. **Given** a user opens the custom recipe form, **When** they enter "Chicken Breast" as an ingredient with quantity "6 oz", **Then** the app looks up and displays macros (calories, protein, carbs, fat) for that ingredient.
2. **Given** a user has filled out all recipe fields, **When** they tap "Save", **Then** the recipe is saved to their collection with calculated total macros per serving.
3. **Given** a user pastes a URL from a recipe blog, **When** the app finds schema.org JSON-LD data on the page, **Then** the recipe form is auto-populated with name, ingredients, steps, and available nutrition info.
4. **Given** a URL import auto-populates the form, **When** some fields are missing (e.g., macros not in structured data), **Then** those fields are left empty for the user to fill manually.
5. **Given** a URL import has populated the form, **When** the user has not tapped "Save", **Then** the recipe is NOT persisted — user review is mandatory.

---

### User Story 4 - Plan Meals on the Weekly Calendar (Priority: P1)

A user views a weekly calendar showing 7 days. They create custom meal slots (e.g., "Breakfast", "Post-workout", "Dinner") and assign saved recipes to those slots. The calendar displays their external calendar events (Google/Apple) so they can plan meals around their real schedule. Planned meals are written back to their external calendar as events.

**Why this priority**: The weekly meal planner with calendar integration is the core value proposition that differentiates Prepd from recipe-only apps.

**Independent Test**: Can be tested by connecting a Google Calendar, creating meal slots for Monday, assigning a recipe to each slot, and verifying the meals appear as events in Google Calendar.

**Acceptance Scenarios**:

1. **Given** a user opens the meal planner, **When** they view the current week, **Then** 7 days are displayed with any existing meal slots and external calendar events.
2. **Given** a user is viewing a day, **When** they create a new meal slot called "Post-workout" at 5:00 PM, **Then** the slot appears on that day at the specified time.
3. **Given** a user has an empty meal slot, **When** they tap it and select a saved recipe, **Then** the recipe is assigned to that slot and the meal's macros are added to the day's totals.
4. **Given** a user has a connected Google Calendar, **When** they assign a recipe to a meal slot, **Then** a calendar event titled "Prepd: [Recipe Name]" is created in their Google Calendar.
5. **Given** a user has connected their calendar, **When** they view the planner, **Then** their non-meal calendar events (e.g., "CS 101 Lecture") are displayed as busy blocks alongside the meal slots.

---

### User Story 5 - Track Daily Macros (Priority: P2)

A user views their daily macro progress on the dashboard. The macros module shows compact progress (calories consumed vs. goal with a progress ring) and can expand inline to show breakdowns for each tracked macro (protein, carbs, fat, and any custom additions). Macros are auto-calculated from the meals planned for that day. The user can also view a detailed daily breakdown screen.

**Why this priority**: Macro tracking is a core feature for the fitness-oriented audience segment. Without it, the app is just a meal planner.

**Independent Test**: Can be tested by setting macro goals, planning 3 meals for a day with known nutrition data, and verifying the dashboard macro module shows correct totals and progress percentages.

**Acceptance Scenarios**:

1. **Given** a user has set a daily calorie goal of 2,200 and planned meals totaling 1,850 calories, **When** they view the dashboard, **Then** the macros module shows "1,850 / 2,200 cal" with a progress ring at ~84%.
2. **Given** the macros module is in compact mode, **When** the user taps to expand it, **Then** individual progress bars appear for each tracked macro (Calories, Protein, Carbs, Fat).
3. **Given** a user has added Fiber and Sodium to their tracked macros, **When** they expand the macros module, **Then** Fiber and Sodium progress bars appear alongside the default four.
4. **Given** a user taps the macros module to navigate to the detail screen, **When** the detail screen loads, **Then** it shows a per-meal breakdown of macro contributions for the selected day.
5. **Given** a user has no meals planned for a day, **When** they view that day's macros, **Then** all macro values show 0 with 0% progress.

---

### User Story 6 - Auto-Generate and Use Grocery List (Priority: P2)

A user generates a grocery list from their weekly meal plan. The app aggregates all ingredients across planned meals, combines duplicates (e.g., two recipes needing chicken → one entry), and groups items by category (produce, dairy, etc.). The user checks off items while shopping. The app remembers pantry staples the user always has and excludes them from future lists.

**Why this priority**: The grocery list closes the loop from planning to shopping. Without it, users must manually extract ingredients — a major friction point.

**Independent Test**: Can be tested by planning 3 different meals for a week, generating the grocery list, verifying ingredient aggregation, checking off items, and confirming pantry staples are excluded on regeneration.

**Acceptance Scenarios**:

1. **Given** a user has planned meals for the week, **When** they open the grocery list, **Then** all ingredients from all planned meals are listed, grouped by category.
2. **Given** two planned recipes both require "chicken breast", **When** the grocery list generates, **Then** a single "Chicken Breast" entry appears with the combined quantity (e.g., "12 oz" instead of two "6 oz" entries).
3. **Given** a user is at the store, **When** they check off "Eggs", **Then** the item is marked complete and the progress indicator updates.
4. **Given** a user marks "Olive Oil" as a pantry staple, **When** they generate next week's grocery list, **Then** "Olive Oil" is excluded even if recipes require it.
5. **Given** a user has checked off all items, **When** they view the grocery list, **Then** a completion state is shown.

---

### User Story 7 - Share a Recipe (Priority: P3)

A user shares a recipe from their collection via a deep link or shareable card. The recipient can open the link, view the recipe, and import it into their own Prepd account.

**Why this priority**: Social sharing drives organic growth and is low-effort to implement. However, the app is fully functional without it.

**Independent Test**: Can be tested by sharing a recipe link from the app, opening it on another device/account, and verifying the recipe details display correctly and can be imported.

**Acceptance Scenarios**:

1. **Given** a user is viewing a recipe, **When** they tap "Share", **Then** a shareable link or card is generated that can be sent via any messaging app.
2. **Given** a recipient opens a shared recipe link, **When** they have Prepd installed, **Then** the recipe detail screen opens with full information.
3. **Given** a recipient is viewing a shared recipe, **When** they tap "Import", **Then** the recipe is added to their personal collection.

---

### User Story 8 - Configure Notifications (Priority: P3)

A user configures which push notifications they want to receive: meal reminders, weekly planning nudges, and daily macro check-ins. Each type is independently toggleable. Meal reminders are tied to calendar meal events.

**Why this priority**: Notifications drive engagement and habit formation, but the app works without them. Users who don't configure notifications can still use all features.

**Independent Test**: Can be tested by enabling meal reminders, planning a meal for a specific time, and verifying the notification fires. Then disabling it and verifying it does not fire.

**Acceptance Scenarios**:

1. **Given** a user opens notification settings, **When** they view the options, **Then** three toggles are displayed: Meal Reminders, Planning Nudges, Macro Check-ins.
2. **Given** a user enables Meal Reminders and has a meal planned at 6:00 PM, **When** the reminder time arrives, **Then** a push notification says "Time to start cooking [Recipe Name]."
3. **Given** a user enables Planning Nudges, **When** Sunday evening arrives and no meals are planned for next week, **Then** a notification says "You haven't planned next week yet."
4. **Given** a user disables Macro Check-ins, **When** end of day arrives, **Then** no macro summary notification is sent.

---

### User Story 9 - Dashboard as Central Hub (Priority: P1)

A user opens the app and lands on the dashboard — a module grid showing a calendar preview (top-left), grocery list summary (bottom-left), upcoming meals (right half), and macro progress (adaptive position). Tapping any module navigates to the full detail screen. The dashboard is the single entry point — there is no bottom tab bar.

**Why this priority**: The dashboard is the app's home screen and primary navigation surface. Every other feature is accessed through it.

**Independent Test**: Can be tested by opening the app, verifying all four modules render with correct preview data, tapping each module, and confirming navigation to the correct detail screen.

**Acceptance Scenarios**:

1. **Given** a user opens the app after logging in, **When** the dashboard loads, **Then** four modules are visible: Calendar, Grocery List, Meals, and Macros.
2. **Given** the user has meals planned for today, **When** they view the Meals module, **Then** it shows today's upcoming meals with recipe names.
3. **Given** the user taps the Calendar module, **When** navigation occurs, **Then** the full weekly planner detail screen opens.
4. **Given** the user taps the Grocery module, **When** navigation occurs, **Then** the full grocery list detail screen opens.
5. **Given** the macros module is in compact mode, **When** the user taps to expand, **Then** it expands inline to show all tracked macro progress bars without navigating away.

---

### User Story 10 - Onboarding Tutorial (Priority: P3)

A first-time user sees an interactive tutorial that walks them through connecting their calendar, adding a meal to the planner, and understanding the dashboard modules. The tutorial is accessible later from settings for users who skipped it.

**Why this priority**: The tutorial reduces confusion for new users, especially around calendar sync. However, the app is usable without it.

**Independent Test**: Can be tested by completing onboarding, triggering the tutorial, following each step, and verifying the tutorial can be replayed from settings.

**Acceptance Scenarios**:

1. **Given** a new user completes account creation, **When** the onboarding flow ends, **Then** an interactive tutorial begins showing how to connect a calendar.
2. **Given** the tutorial is active, **When** it reaches the meal planning step, **Then** it demonstrates how to create a meal slot and assign a recipe.
3. **Given** a user skipped the tutorial during onboarding, **When** they go to Settings and tap "Replay Tutorial", **Then** the tutorial restarts from the beginning.

---

### User Story 11 - Ad-Hoc Food Logging (Priority: Future)

A user eats something they didn't plan — a coffee shop muffin, a friend's dinner, fast food between classes. They open the app and quickly log the food directly against the current day without creating a meal plan entry. The macro totals for the day update to reflect the unplanned item. This keeps the macro tracking screen accurate even when reality diverges from the plan.

**Why this priority**: Prepd targets busy people and college students who will regularly eat off-plan. Without a fallback logging path, the macro screen becomes inaccurate and loses trust the moment a user eats something unplanned. This feature is intentionally deferred from MVP to keep the initial build focused, but must be added before macro tracking is considered reliable.

**Dependency**: Requires a food/ingredient lookup source (USDA FoodData Central or similar) and a separate log entry data model that is distinct from planned meal slots.

**Independent Test**: Can be tested by having no meals planned for the day, logging an off-plan food item with a known calorie count, and verifying the daily macro totals update correctly.

**Acceptance Scenarios**:

1. **Given** a user did not plan a meal, **When** they tap "Log Food" on the macros screen, **Then** a food search or quick-entry form opens.
2. **Given** a user searches for "banana", **When** results appear, **Then** each result shows the food name, serving size, and calorie count.
3. **Given** a user selects a food and confirms a serving size, **When** they tap "Log", **Then** the item is added to the day's macro totals and appears in the per-meal breakdown as an ad-hoc entry.
4. **Given** a user has both planned meals and logged ad-hoc items for a day, **When** they view the macro detail screen, **Then** planned meals and ad-hoc entries are shown as separate sections with a combined total.
5. **Given** a user logs an item by mistake, **When** they tap to delete it, **Then** the item is removed and macro totals update accordingly.

---

### Edge Cases

- What happens when a user searches for recipes with no internet connection? The app shows a clear offline message and suggests browsing saved/downloaded recipes instead.
- What happens when a URL import finds no schema.org structured data? The app shows an error explaining the site doesn't support auto-import and offers the manual recipe form.
- What happens when two planned recipes use the same ingredient in different units (e.g., "1 cup milk" and "200ml milk")? The grocery list shows them as separate line items with a note suggesting they may be combinable.
- What happens when a user deletes a recipe that's assigned to meal slots? The affected meal slots are cleared and the user is notified which days were affected.
- What happens when calendar sync fails (revoked permissions, API error)? The planner still works locally; a banner notifies the user that calendar sync is unavailable and offers to reconnect.
- What happens when a user changes their macro goals mid-week? Historical days keep the old goals; current and future days use the new goals.
- What happens when a user adjusts serving size on a planned recipe? The macros for that meal slot update accordingly, and the grocery list quantities adjust on next regeneration.

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & Profile**

- **FR-001**: System MUST support account creation via email/password, Google sign-in, and Apple sign-in.
- **FR-002**: System MUST provide a skip-friendly onboarding flow where every step (macro goals, dietary preferences, calendar connection) is optional.
- **FR-003**: System MUST display contextual nudges on the dashboard for any onboarding steps the user skipped.
- **FR-004**: System MUST persist all user profile data (macro goals, dietary preferences, notification settings) locally and sync to cloud.

**Recipes**

- **FR-005**: System MUST allow users to search an external recipe database by keyword, cuisine type, and dietary filters.
- **FR-006**: System MUST display recipe details including name, image, ingredients with quantities, step-by-step instructions, prep time, cook time, servings, difficulty level, cuisine type, and per-serving nutrition macros.
- **FR-007**: System MUST allow users to save/download recipes from the external database for offline access.
- **FR-008**: System MUST allow users to create custom recipes via a form with name, ingredients (with quantities and units), instructions, and serving size.
- **FR-009**: System MUST auto-lookup nutrition macros for individual ingredients when creating custom recipes.
- **FR-010**: System MUST support recipe import from URL by extracting schema.org JSON-LD structured data and auto-populating the recipe form.
- **FR-011**: System MUST require user review and explicit confirmation before saving any externally-sourced recipe (URL import or API result).
- **FR-012**: System MUST recalculate ingredient quantities and nutrition macros when the user adjusts serving size.
- **FR-013**: Recipe data MUST conform to the schema.org Recipe standard, extended with: nutrition macros, difficulty, cuisine type, dietary tags, source flag, favorited flag, and offline availability flag.

**Meal Planning**

- **FR-014**: System MUST display a weekly calendar view showing 7 days with user-created meal slots.
- **FR-015**: System MUST allow users to create, rename, reorder, and delete custom meal slots (not restricted to breakfast/lunch/dinner).
- **FR-016**: System MUST allow users to assign any saved recipe to any meal slot.
- **FR-017**: System MUST read events from connected external calendars (Google Calendar, Apple Calendar) and display them as busy blocks on the weekly planner.
- **FR-018**: System MUST write planned meals back to the user's connected external calendar as events.
- **FR-019**: Any recipe MUST be assignable to any meal slot regardless of meal type.

**Macro Tracking**

- **FR-020**: System MUST allow users to select which macros they want to track, with Calories, Protein, Carbs, and Fat as defaults.
- **FR-021**: System MUST allow users to set daily goals for each tracked macro.
- **FR-022**: System MUST auto-calculate daily macro totals from planned meals.
- **FR-023**: System MUST display macro progress on the dashboard with compact (progress ring + calorie count) and expanded (individual progress bars per macro) views.
- **FR-024**: System MUST provide a detail screen showing per-meal macro contributions for a selected day.

*Future (US11 — Ad-Hoc Food Logging)*

- **FR-024a** *(Future)*: System MUST allow users to log off-plan food items directly against a day without creating a meal plan entry.
- **FR-024b** *(Future)*: System MUST support food search (USDA FoodData Central or equivalent) for ad-hoc log entries.
- **FR-024c** *(Future)*: System MUST include ad-hoc logged items in daily macro totals alongside planned meal macros.
- **FR-024d** *(Future)*: The macro detail screen MUST display planned meals and ad-hoc entries as distinct sections with a combined total.
- **FR-024e** *(Future)*: Users MUST be able to delete individual ad-hoc log entries with immediate macro total recalculation.

**Grocery List**

- **FR-025**: System MUST auto-generate a grocery list from all meals planned for the current week.
- **FR-026**: System MUST aggregate and combine duplicate ingredients across recipes (same ingredient → single entry with combined quantity).
- **FR-027**: System MUST group grocery items by category (produce, dairy, protein, grains, etc.).
- **FR-028**: System MUST allow users to check off items as they shop.
- **FR-029**: System MUST allow users to mark items as pantry staples, which are then excluded from future auto-generated lists.

**Sharing**

- **FR-030**: System MUST allow users to share a recipe via a deep link or shareable card.
- **FR-031**: Recipients MUST be able to view the shared recipe and import it into their own account.

**Notifications**

- **FR-032**: System MUST support user-configurable push notifications with independent toggles for: meal reminders, planning nudges, and macro check-ins.
- **FR-033**: Meal reminder notifications MUST be tied to the time of the planned meal event.

**Offline & Sync**

- **FR-034**: System MUST store all user data locally for offline access.
- **FR-035**: System MUST function fully offline for: viewing/editing meal plans, creating/editing recipes, tracking macros, and checking off grocery items.
- **FR-036**: System MUST sync data bidirectionally across devices when internet connectivity is available.
- **FR-037**: System MUST allow users to download external recipes for offline use.

**Navigation & Dashboard**

- **FR-038**: The app MUST use a dashboard with module grid layout as the single home screen and primary navigation surface.
- **FR-039**: Navigation from the dashboard MUST be stack-based (no bottom tab bar).
- **FR-040**: The dashboard MUST display four modules: Calendar preview (top-left), Grocery List summary (bottom-left), Meals (right half), and Macros (adaptive, compact/expandable).

**Onboarding & Tutorial**

- **FR-041**: System MUST provide an interactive tutorial covering calendar sync, meal planning, and dashboard usage.
- **FR-042**: The tutorial MUST be replayable from settings.

### Key Entities

- **User**: Account credentials, authentication method, dietary preference tags, tracked macro selections, daily macro goals, notification preferences, connected calendar providers, pantry staples list, account tier (free/premium — for future use).
- **Recipe**: Name, description, image, prep time, cook time, servings, ingredients list, step-by-step instructions, nutrition macros per serving, difficulty level, cuisine type, dietary tags, source (API / URL-import / user-created), favorited flag, offline-available flag. Conforms to schema.org Recipe type.
- **Ingredient**: Name, quantity, unit, nutrition macros (calories, protein, carbs, fat, and extended macros), category (produce, dairy, protein, etc.), price (nullable — for future budget features).
- **Meal Slot**: User-defined label (e.g., "Post-workout"), time, associated day, assigned recipe (if any), serving size override.
- **Meal Plan**: A collection of meal slots organized by week, associated with a user.
- **Grocery List**: Auto-generated collection of grocery items derived from a week's meal plan, with checked-off state per item and pantry staple exclusions.
- **Grocery Item**: Ingredient reference, aggregated quantity, unit, category, checked-off state.

## Assumptions

- Spoonacular API provides sufficient recipe coverage and reliable nutrition data for the primary use case.
- USDA FoodData Central API is freely available and provides accurate per-ingredient macro data.
- Most popular recipe websites embed schema.org JSON-LD structured data sufficient for URL import.
- Google Calendar and Apple Calendar APIs support both read and write access with standard OAuth flows.
- Users will primarily use the app on one device at a time; conflict resolution via last-write-wins (handled by PowerSync) is acceptable.
- Push notification permissions will be requested during onboarding or on first notification toggle.
- The app does not need to handle unit conversion between metric and imperial in MVP — ingredients display in the unit provided by the source.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create an account and complete onboarding in under 2 minutes.
- **SC-002**: Users can find and save a recipe in under 30 seconds from search.
- **SC-003**: Users can plan a full week of meals (7 days, 2+ meals/day) in under 10 minutes.
- **SC-004**: 90% of users successfully import a recipe from a URL on their first attempt (for sites with schema.org data).
- **SC-005**: Grocery list auto-generation produces a complete, correctly aggregated list within 3 seconds of opening.
- **SC-006**: Macro tracking displays accurate totals matching the sum of planned meals' nutrition data with zero discrepancy.
- **SC-007**: App is fully functional offline for all local operations (plan editing, recipe viewing, grocery checking, macro viewing).
- **SC-008**: Calendar sync (read + write) completes within 5 seconds of user action.
- **SC-009**: All features work identically on iOS, Android, and Web — no platform-specific feature gaps.
- **SC-010**: 80% of first-time users engage with at least 2 dashboard modules within their first session.

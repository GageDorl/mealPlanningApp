# Prepd — Product Specification

## Overview

**Prepd** is a cross-platform meal planning and macro tracking app for college students and busy people. It simplifies weekly meal planning, auto-generates grocery lists, tracks customizable nutrition macros, and syncs with the user's personal calendar to plan meals around their real schedule.

**Platforms:** iOS, Android, Web (all equally polished)

---

## Target Audience

- College students managing meals on a budget and chaotic schedule
- Busy professionals who want to eat better without spending time planning
- Fitness-oriented users tracking protein, calories, and other macros

---

## Core Features (MVP)

### 1. Dashboard

The home screen is a **module grid layout** that serves as the central hub for all features.

| Position | Module | Description |
|----------|--------|-------------|
| Top-left | **Calendar** | Preview of the current week's meal plan overlaid with calendar events |
| Bottom-left | **Grocery List** | Summary of the shopping list with item count / checked-off progress |
| Right half | **Meals** | Upcoming meals or today's planned meals |
| Adaptive | **Macros** | Compact by default (progress ring + cal count), expandable inline to show full macro breakdowns |

Tapping any module navigates into a full detail screen via **stack navigation**. There are no bottom tabs — the dashboard is the single entry point.

### 2. Meal Planning

- **Weekly calendar view** showing 7 days with meal slots
- **User-defined meal slots** — no rigid breakfast/lunch/dinner. Users create their own slots (e.g., "Post-workout", "Late night", "Meal 1, 2, 3")
- **Calendar integration (Read + Write):**
  - Reads events from Google Calendar, Apple Calendar, or other providers to display busy blocks alongside the meal planner
  - Writes planned meals back to the user's calendar as events
  - Users plan meals around their real schedule
- Drag-and-drop or tap-to-assign recipes to meal slots

### 3. Recipes

**Hybrid data sources:**

| Source | Description |
|--------|-------------|
| **Spoonacular API** | Recipe discovery, browsing, search with diet filters. Includes nutrition data. |
| **USDA FoodData Central** | Accurate macro lookup for individual ingredients in custom recipes |
| **User-created** | Manual recipe entry via a form |
| **URL import** | Paste a recipe URL → app extracts schema.org JSON-LD structured data → auto-populates the recipe form → user reviews and confirms before saving |

**Recipe data model** follows the [schema.org Recipe](https://schema.org/Recipe) standard, extended with:

- Nutrition macros per serving (from API or USDA lookup)
- Difficulty level (easy / medium / hard)
- Cuisine type (Mexican, Italian, Asian, etc.)
- Dietary tags (vegetarian, vegan, gluten-free, dairy-free, nut-free, etc.)
- Source flag (API-sourced, URL-imported, or user-created)
- Favorited / saved flag
- Offline availability flag (downloaded for offline use)

**Key behaviors:**
- Adjustable serving size recalculates ingredients and macros
- Recipes are not typed to specific meals — any recipe can go in any slot
- Users can save/download Spoonacular recipes for offline access
- Recipe import from URL always requires user review before saving

### 4. Macro Tracking

- **Flexible tracking** — users choose which macros to monitor
- **Default view:** Calories, Protein, Carbs, Fat (the Big 4)
- **Extended options:** Fiber, Sugar, Sodium, Cholesterol, and more
- Users set **daily goals** for each tracked macro
- Dashboard shows progress toward goals with visual indicators
- Macros auto-calculated from planned meals

### 5. Grocery List

- **Auto-generated** from the weekly meal plan
- Ingredients aggregated and combined (e.g., two recipes needing chicken breast → one combined entry)
- Grouped by category (produce, dairy, protein, grains, etc.)
- **Checkboxes** — users check off items as they shop
- **Pantry staples** — app remembers items the user always has, excludes them from the list

### 6. Dietary Preferences

- Basic preference tags set during onboarding (or later in Profile)
- Tags: Vegetarian, Vegan, Gluten-free, Dairy-free, Nut-free, etc.
- Preferences filter Spoonacular recipe search results
- No allergy warnings or conflict detection in MVP

### 7. Recipe Sharing

- Users can share a recipe via deep link or shareable card
- Recipients can view the recipe and import it into their own Prepd account

### 8. Notifications

User-configured notification types (all toggleable in settings):

| Type | Description |
|------|-------------|
| **Meal reminders** | "Time to start cooking [meal name]" based on calendar meal events |
| **Planning nudges** | "You haven't planned next week yet" (e.g., Sunday evening) |
| **Macro check-ins** | "You're 40g short on protein today" — end-of-day summary |

---

## Onboarding

**Skip-friendly guided setup** — every step is optional:

1. Create account (Email, Google, or Apple sign-in)
2. Set macro goals (calories, protein, etc.)
3. Set dietary preferences (veg, GF, etc.)
4. Connect calendar (Google/Apple)
5. **Interactive tutorial** — walkthrough showing how to sync calendars, add meals to the planner, and use the dashboard

If skipped, the dashboard displays contextual nudges (e.g., "Set your macro goals to start tracking") to guide setup later.

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Expo 56 + Expo Router (file-based routing) |
| **Language** | TypeScript |
| **Mobile** | React Native 0.85 (iOS + Android) |
| **Web** | React Native Web |
| **State Management** | Redux Toolkit (UI/transient state) |
| **Local Database** | SQLite via PowerSync |
| **Cloud Backend** | Supabase (Postgres, Auth, storage) |
| **Sync Layer** | PowerSync (local-first sync between SQLite ↔ Supabase Postgres) |
| **Recipe API** | Spoonacular (recipe search + nutrition) |
| **Nutrition API** | USDA FoodData Central (ingredient-level macro lookup) |
| **Animations** | React Native Reanimated |

### Authentication

- **Email + password**
- **Google sign-in** (also enables Google Calendar OAuth)
- **Apple sign-in** (required for App Store)
- Handled by Supabase Auth

### Local-First Architecture

- All user data stored locally in SQLite for instant access and offline use
- PowerSync handles bidirectional sync with Supabase Postgres
- Conflict resolution and offline queue managed by PowerSync
- Users' data syncs across all their devices when connected

### Offline Behavior

**Full offline support:**
- View and edit meal plans
- Create and edit custom recipes
- Track macros
- Check off grocery list items
- Add downloaded/saved recipes to plans

**Requires internet:**
- Searching Spoonacular for new recipes
- Calendar sync (read/write)
- Account creation and sign-in
- Cross-device sync

Users can **download recipes** from Spoonacular for offline access.

### Data Model Notes

- Recipe schema follows schema.org `Recipe` type
- Include a `user.tier` field (free/premium) for future monetization
- Include an `ingredient.price` field for future budget features

---

## Design

| Element | Direction |
|---------|-----------|
| **Style** | Clean and minimal |
| **Accent color** | Bright orange (pop color for CTAs, active states, progress indicators) |
| **Typography** | Futura-style geometric sans-serif |
| **Surfaces** | Lots of whitespace, clean card-based modules |
| **Tone** | Modern, premium, not clinical |
| **Dark mode** | Supported (already scaffolded in the codebase) |

---

## Navigation Architecture

```
Dashboard (home)
├── → Calendar Detail (stack push)
├── → Grocery List Detail (stack push)
├── → Meals / Meal Slot Detail (stack push)
│     └── → Recipe Detail
│           └── → Add to Plan
├── → Macro Detail / Daily Breakdown (stack push)
├── → Recipe Search / Browse (stack push)
│     ├── → Recipe Detail
│     └── → Create Custom Recipe
├── → URL Import (stack push)
├── → Profile / Settings (stack push)
│     ├── → Macro Goals
│     ├── → Dietary Preferences
│     ├── → Calendar Connection
│     ├── → Notification Settings
│     └── → Account Management
└── → Onboarding / Tutorial (modal)
```

No bottom tab bar. Dashboard is the single hub. All navigation is stack-based.

---

## Future Features (Post-MVP)

| Feature | Description |
|---------|-------------|
| **Smart meal suggestions** | Analyze calendar busyness → suggest quick meals on packed days, complex recipes on free evenings |
| **Budget tracking** | Estimated meal/week cost, weekly food budget goals |
| **Store integration** | Instacart/Walmart API for one-tap grocery ordering |
| **Shared meal plans** | Multiple users collaborate on the same weekly plan (roommates, couples) |
| **Community / social** | Public recipe sharing, user profiles, likes/ratings |
| **Monetization (Freemium)** | Free core features, premium tier for advanced analytics, calendar sync, etc. |

---

## MVP Scope Summary

**Build:**
- Dashboard with module grid (calendar, grocery, meals, macros)
- Weekly meal planner with custom slots + calendar read/write
- Recipe browsing (Spoonacular), custom creation, URL import (schema.org)
- Flexible macro tracking with daily goals
- Auto-generated grocery list with checkboxes + pantry staples
- Dietary preference filters
- Recipe sharing via link
- User-configured notifications
- Skip-friendly onboarding + calendar tutorial
- Email + Google + Apple auth
- Local-first with PowerSync + Supabase
- Full offline support
- iOS + Android + Web

**Don't build (yet):**
- Smart busyness-aware suggestions
- Budget/cost features
- Store integration
- Shared meal plans
- Community features
- Monetization gating

# Implementation Plan: Prepd MVP

**Branch**: `001-prepd-mvp` | **Date**: 2026-05-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-prepd-mvp/spec.md`

## Summary

Prepd is a cross-platform meal planning and macro tracking app targeting college students and busy people. The MVP delivers a dashboard-centric mobile + web app with: recipe discovery (Spoonacular) and custom creation (schema.org import + USDA macro lookup), a weekly meal planner with external calendar read/write sync, flexible macro tracking with customizable daily goals, auto-generated grocery lists with pantry staple awareness, and local-first offline support via PowerSync + Supabase. Built on Expo/React Native for iOS, Android, and Web with Redux Toolkit for UI state.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict mode)  
**Primary Dependencies**: Expo SDK 56, React Native 0.85, Expo Router, Redux Toolkit, PowerSync SDK, Supabase JS Client, React Native Reanimated, expo-notifications, expo-auth-session  
**Storage**: SQLite (local via PowerSync) ↔ Supabase Postgres (cloud), PowerSync sync rules  
**Testing**: Jest + React Native Testing Library (unit/component), Detox or Maestro (E2E)  
**Target Platform**: iOS 16+, Android API 26+, Modern browsers (Chrome, Safari, Firefox, Edge)  
**Project Type**: Mobile + Web (single codebase, platform-specific files via `.web.tsx`)  
**Performance Goals**: Dashboard render < 500ms, recipe search results < 2s, grocery list generation < 3s, calendar sync < 5s, 60fps scrolling  
**Constraints**: Offline-capable (local-first), Spoonacular free tier 150 req/day, USDA no rate limit, schema.org JSON-LD parsing client-side  
**Scale/Scope**: ~15 screens, ~10 data entities, single user per account (no real-time collaboration in MVP)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Local-First (NON-NEGOTIABLE) | ✅ PASS | PowerSync + SQLite local, Supabase Postgres cloud. All CRUD offline. Only Spoonacular search + calendar sync require network. |
| II | Cross-Platform Parity | ✅ PASS | Single Expo codebase targets iOS, Android, Web. Platform-specific files use `.web.tsx`. Calendar APIs require platform abstractions. |
| III | Schema-First Data | ✅ PASS | Recipe entity conforms to schema.org Recipe type. Data model defined in Phase 1 before implementation. PowerSync sync rules keep SQLite ↔ Postgres in sync. |
| IV | No Unreviewed Data Entry | ✅ PASS | FR-011 requires explicit user review for all external data (Spoonacular save, URL import). Same review form for all sources. |
| V | Minimal Navigation | ✅ PASS | Dashboard hub with module grid. Stack-only navigation. No bottom tabs. Max 3 levels deep (Dashboard → Detail → Sub-detail). |
| VI | Flexible Over Rigid | ✅ PASS | User-defined meal slots (FR-015), user-selectable macros (FR-020), toggleable notifications (FR-032), skippable onboarding (FR-002). |
| VII | Simplicity (YAGNI) | ✅ PASS | No budget tracking, no shared plans, no community features, no AI suggestions. Future fields (`user.tier`, `ingredient.price`) are nullable columns with no logic. |

**GATE RESULT: ALL PASS — proceed to Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/001-prepd-mvp/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
mealPlan/
├── src/
│   ├── app/                     # Expo Router file-based routes
│   │   ├── _layout.tsx          # Root layout (auth gate, splash)
│   │   ├── index.tsx            # Dashboard (home)
│   │   ├── (auth)/              # Auth group (sign-in, sign-up)
│   │   ├── (onboarding)/        # Onboarding flow screens
│   │   ├── calendar/            # Weekly planner detail
│   │   ├── recipes/             # Recipe search, detail, create, import
│   │   ├── grocery/             # Grocery list detail
│   │   ├── macros/              # Macro detail/daily breakdown
│   │   └── profile/             # Settings, preferences, account
│   ├── components/
│   │   ├── dashboard/           # Dashboard module cards
│   │   ├── recipes/             # Recipe card, form, detail components
│   │   ├── calendar/            # Planner, meal slot, event block
│   │   ├── grocery/             # Grocery item, category group
│   │   ├── macros/              # Progress ring, progress bar, breakdown
│   │   ├── onboarding/          # Onboarding step screens, tutorial
│   │   └── ui/                  # Shared primitives (buttons, inputs, cards)
│   ├── store/                   # Redux Toolkit slices + store config
│   │   ├── index.ts             # Store configuration
│   │   ├── slices/              # Feature slices (recipes, mealPlan, grocery, macros, user)
│   │   └── selectors/           # Memoized selectors
│   ├── services/                # External API + sync service wrappers
│   │   ├── spoonacular.ts       # Spoonacular API client
│   │   ├── usda.ts              # USDA FoodData Central client
│   │   ├── calendar.ts          # Calendar read/write abstraction
│   │   ├── schema-import.ts     # schema.org JSON-LD parser
│   │   ├── powersync.ts         # PowerSync setup + sync rules
│   │   └── supabase.ts          # Supabase client init + auth
│   ├── models/                  # TypeScript types + PowerSync table definitions
│   │   ├── recipe.ts
│   │   ├── ingredient.ts
│   │   ├── meal-slot.ts
│   │   ├── meal-plan.ts
│   │   ├── grocery.ts
│   │   └── user.ts
│   ├── hooks/                   # Custom React hooks
│   │   ├── use-recipes.ts
│   │   ├── use-meal-plan.ts
│   │   ├── use-grocery.ts
│   │   ├── use-macros.ts
│   │   ├── use-calendar.ts
│   │   └── use-offline.ts
│   ├── utils/                   # Pure utility functions
│   │   ├── macro-calculator.ts
│   │   ├── grocery-aggregator.ts
│   │   ├── serving-scaler.ts
│   │   └── deep-link.ts
│   └── constants/
│       ├── theme.ts             # Colors, fonts, spacing
│       ├── macros.ts            # Default macro definitions
│       └── dietary-tags.ts      # Dietary preference constants
└── __tests__/                   # Test files mirroring src structure
    ├── utils/
    ├── services/
    └── components/
```

**Structure Decision**: Single-codebase Expo project. The existing `mealPlan/src/` structure is extended with `store/`, `services/`, `models/`, and `utils/` directories. Existing `components/` and `hooks/` directories are expanded. Routes follow Expo Router's file-based convention. No separate backend — Supabase handles cloud services.

## Complexity Tracking

> No constitution violations to justify. All gates pass.

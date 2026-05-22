<!--
Sync Impact Report
- Version change: 0.0.0 → 1.0.0
- Modified principles: N/A (initial ratification)
- Added sections:
  - Core Principles (7 principles)
  - Technology Constraints
  - Development Workflow
  - Governance
- Removed sections: none
- Templates requiring updates:
  - .specify/templates/plan-template.md — ✅ compatible (Constitution Check
    section already present; principles are generic gates)
  - .specify/templates/spec-template.md — ✅ compatible (user stories,
    requirements, and success criteria align with principles)
  - .specify/templates/tasks-template.md — ✅ compatible (phase structure
    supports offline, cross-platform, and schema.org task types)
- Follow-up TODOs: none
-->

# Prepd Constitution

## Core Principles

### I. Local-First (NON-NEGOTIABLE)

All user data MUST be stored locally in SQLite via PowerSync
before any network operation. The app MUST be fully functional
offline for all operations except external API search and
calendar sync. Data MUST sync bidirectionally with Supabase
Postgres when connectivity is available. PowerSync manages
conflict resolution and offline queuing — no custom sync logic.

**Rationale:** College students have unreliable connectivity.
The app must never feel broken because of network state.

### II. Cross-Platform Parity

Every feature MUST work on iOS, Android, and Web. Platform-
specific code MUST use the `.web.tsx` / `.web.ts` suffix
convention. No feature may ship on one platform without at
least a functional equivalent on the others. Web is the demo
and presentation platform and MUST be equally polished.

**Rationale:** The target audience is split across platforms,
and web serves as the public-facing showcase.

### III. Schema-First Data

All recipe data MUST conform to the schema.org `Recipe` type,
extended with nutrition macros, difficulty, cuisine, dietary
tags, source flag, and offline-availability flag. Data models
MUST be defined before implementation begins for any feature
that introduces or modifies persisted entities. The SQLite
schema and Supabase Postgres schema MUST stay in sync via
PowerSync sync rules.

**Rationale:** schema.org compliance enables URL import from
any recipe site and ensures interoperability.

### IV. No Unreviewed Data Entry

The app MUST NOT persist any externally-sourced data (URL
imports, API results) without explicit user review and
confirmation. Auto-populated forms MUST be editable before
submission. Every recipe entry — whether from Spoonacular,
URL import, or manual — goes through the same review form.

**Rationale:** Prevents bad data from polluting meal plans
and macro calculations. Users trust data they've confirmed.

### V. Minimal Navigation

The app uses a single dashboard hub with module grid layout
and stack-based navigation. There MUST NOT be a bottom tab
bar. Every feature screen is reached by tapping a dashboard
module or navigating from within a stack. Navigation depth
SHOULD NOT exceed 3 levels from the dashboard.

**Rationale:** Dashboard-first reduces cognitive load and
keeps the most important data visible at a glance.

### VI. Flexible Over Rigid

User-facing structures MUST be configurable, not fixed:
- Meal slots MUST be user-defined (not hardcoded
  breakfast/lunch/dinner)
- Tracked macros MUST be user-selectable with sensible
  defaults (Calories, Protein, Carbs, Fat)
- Notification types MUST be individually toggleable
- Onboarding steps MUST be skippable

**Rationale:** College students have irregular schedules
and varied goals. Rigid structures cause abandonment.

### VII. Simplicity (YAGNI)

Do not add features, abstractions, or architecture beyond
what is explicitly requested or required by the current
task. No speculative code. No premature optimization. If
a simpler approach works, use it. Data model fields for
future features (e.g., `user.tier`, `ingredient.price`)
MAY be added as nullable columns but MUST NOT have
associated application logic until the feature is scoped.

**Rationale:** The project is in early development. Speed
of iteration matters more than architectural completeness.

## Technology Constraints

| Layer | Required Technology |
|-------|-------------------|
| Framework | Expo SDK 56+ / React Native 0.85+ |
| Language | TypeScript (strict mode) |
| Routing | Expo Router (file-based, typed routes) |
| State (UI) | Redux Toolkit |
| Local DB | SQLite via PowerSync |
| Cloud | Supabase (Postgres, Auth, storage) |
| Sync | PowerSync |
| Recipe API | Spoonacular |
| Nutrition API | USDA FoodData Central |
| Auth | Supabase Auth (Email + Google + Apple) |
| Animations | React Native Reanimated |

- Source code lives in `src/` with routes in `src/app/`,
  components in `src/components/`, hooks in `src/hooks/`
- Platform-specific files use `.web.ts` / `.web.tsx` suffix
- Path aliases: `@/` for `src/`, `@/assets/` for `assets/`
- Design: clean/minimal, bright orange accent, Futura-style
  geometric sans-serif typography

## Development Workflow

1. **Spec before code** — Every feature MUST have a
   specification (via speckit or equivalent) before
   implementation begins.
2. **Constitution check** — Every plan MUST verify alignment
   with these principles before Phase 0 research.
3. **One feature at a time** — Do not add features beyond
   what is explicitly requested in the current task.
4. **Platform test** — Changes MUST be verified on at least
   two platforms (iOS/Android/Web) before completion.
5. **Offline test** — Any feature touching persisted data
   MUST be tested in airplane mode.
6. **User review gate** — Any flow that imports external
   data MUST include a user confirmation step.

## Governance

This constitution supersedes all other development practices
for the Prepd project. All code reviews and PRs MUST verify
compliance with the Core Principles. Violations MUST be
justified in a Complexity Tracking table (see plan template).

**Amendment procedure:**
1. Propose the change with rationale.
2. Document the old and new text.
3. Increment the version per semantic versioning:
   - MAJOR: principle removal or incompatible redefinition
   - MINOR: new principle or material expansion
   - PATCH: clarification, wording, typo fix
4. Update `LAST_AMENDED_DATE` to the amendment date.
5. Run consistency propagation across all templates.

**Compliance review:** Re-read this constitution at the start
of every new feature specification and implementation plan.

**Guidance file:** `mealPlan/docs/PRODUCT_SPEC.md` contains
the full product specification and serves as the runtime
reference for feature decisions.

**Version**: 1.0.0 | **Ratified**: 2026-05-22 | **Last Amended**: 2026-05-22

# Data Model: Prepd MVP

**Branch**: `001-prepd-mvp` | **Date**: 2026-05-22  
**Source of truth**: PowerSync SQLite (local) ↔ Supabase Postgres (cloud)

## Entity Relationship Diagram

```
User 1──* MacroGoal
User 1──* DietaryPreference
User 1──* PantryStaple
User 1──* CalendarConnection
User 1──* Recipe (via user_id for user-created/saved)
User 1──* MealPlan

MealPlan 1──* MealSlot
MealSlot *──1 Recipe (nullable — empty slot)

Recipe 1──* RecipeIngredient
RecipeIngredient *──1 Ingredient (nullable — raw string fallback)

MealPlan 1──1 GroceryList
GroceryList 1──* GroceryItem
GroceryItem *──1 Ingredient (nullable)
```

## Entities

### User

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK | Supabase Auth user ID |
| `email` | string | NOT NULL, UNIQUE | |
| `display_name` | string | nullable | |
| `auth_method` | enum | NOT NULL | `email`, `google`, `apple` |
| `onboarding_completed` | boolean | NOT NULL, default false | |
| `tutorial_completed` | boolean | NOT NULL, default false | |
| `tier` | enum | NOT NULL, default `free` | `free`, `premium` — future use, no logic |
| `notification_meal_reminders` | boolean | NOT NULL, default false | |
| `notification_planning_nudges` | boolean | NOT NULL, default false | |
| `notification_macro_checkins` | boolean | NOT NULL, default false | |
| `created_at` | timestamp | NOT NULL | |
| `updated_at` | timestamp | NOT NULL | |

### MacroGoal

Tracks which macros a user monitors and their daily targets.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → User, NOT NULL | |
| `macro_name` | string | NOT NULL | e.g., `calories`, `protein`, `carbs`, `fat`, `fiber`, `sodium` |
| `daily_target` | decimal | NOT NULL | Target value per day |
| `unit` | string | NOT NULL | e.g., `kcal`, `g`, `mg` |
| `display_order` | integer | NOT NULL | User-defined sort order |
| `is_active` | boolean | NOT NULL, default true | Whether currently tracked |
| `created_at` | timestamp | NOT NULL | |

**Defaults on account creation**: Calories (2,000 kcal), Protein (50g), Carbs (250g), Fat (65g) — all active.

### DietaryPreference

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → User, NOT NULL | |
| `tag` | string | NOT NULL | e.g., `vegetarian`, `vegan`, `gluten-free`, `dairy-free`, `nut-free` |
| `created_at` | timestamp | NOT NULL | |

**UNIQUE**: (`user_id`, `tag`)

### CalendarConnection

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → User, NOT NULL | |
| `provider` | enum | NOT NULL | `google`, `apple`, `outlook` |
| `calendar_id` | string | NOT NULL | Provider-specific calendar identifier |
| `calendar_name` | string | nullable | Display name (e.g., "Work", "Personal") |
| `access_token` | string | NOT NULL | Encrypted OAuth token |
| `refresh_token` | string | nullable | Encrypted OAuth refresh token |
| `token_expires_at` | timestamp | nullable | |
| `is_read_enabled` | boolean | NOT NULL, default true | |
| `is_write_enabled` | boolean | NOT NULL, default true | |
| `created_at` | timestamp | NOT NULL | |
| `updated_at` | timestamp | NOT NULL | |

### Recipe

Conforms to schema.org Recipe type with extensions.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → User, NOT NULL | Owner (creator or saver) |
| `title` | string | NOT NULL | schema.org: `name` |
| `description` | text | nullable | schema.org: `description` |
| `image_url` | string | nullable | schema.org: `image` |
| `prep_minutes` | integer | nullable | Parsed from schema.org ISO 8601 `prepTime` |
| `cook_minutes` | integer | nullable | Parsed from schema.org ISO 8601 `cookTime` |
| `servings` | integer | NOT NULL, default 1 | schema.org: `recipeYield` |
| `difficulty` | enum | nullable | `easy`, `medium`, `hard` |
| `cuisine_type` | string | nullable | schema.org: `recipeCuisine` |
| `source_type` | enum | NOT NULL | `api`, `url_import`, `user_created`, `shared` |
| `source_url` | string | nullable | Original URL (for URL imports) or Spoonacular link |
| `source_api_id` | string | nullable | Spoonacular recipe ID (for de-duplication) |
| `is_favorited` | boolean | NOT NULL, default false | |
| `is_offline_available` | boolean | NOT NULL, default true | Downloaded for offline access |
| `calories_per_serving` | decimal | nullable | |
| `protein_per_serving` | decimal | nullable | grams |
| `carbs_per_serving` | decimal | nullable | grams |
| `fat_per_serving` | decimal | nullable | grams |
| `fiber_per_serving` | decimal | nullable | grams |
| `sugar_per_serving` | decimal | nullable | grams |
| `sodium_per_serving` | decimal | nullable | mg |
| `instructions` | text | nullable | JSON array of step strings |
| `dietary_tags` | text | nullable | JSON array of tag strings |
| `created_at` | timestamp | NOT NULL | |
| `updated_at` | timestamp | NOT NULL | |

**Indexes**: (`user_id`), (`source_type`), (`source_api_id`), (`cuisine_type`)

### RecipeIngredient

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK | |
| `recipe_id` | UUID | FK → Recipe, NOT NULL, CASCADE | |
| `ingredient_id` | UUID | FK → Ingredient, nullable | Linked USDA ingredient (if looked up) |
| `raw_text` | string | NOT NULL | Original text (e.g., "2 cups all-purpose flour") |
| `name` | string | NOT NULL | Parsed ingredient name |
| `quantity` | decimal | nullable | Parsed numeric quantity |
| `unit` | string | nullable | Parsed unit (e.g., `cup`, `oz`, `g`) |
| `display_order` | integer | NOT NULL | Order in recipe |
| `calories` | decimal | nullable | Per this quantity |
| `protein` | decimal | nullable | Per this quantity (grams) |
| `carbs` | decimal | nullable | Per this quantity (grams) |
| `fat` | decimal | nullable | Per this quantity (grams) |

### Ingredient

Reference table for known ingredients with USDA data.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK | |
| `usda_fdc_id` | string | nullable, UNIQUE | USDA FoodData Central ID |
| `name` | string | NOT NULL | Normalized name |
| `category` | enum | nullable | `produce`, `dairy`, `protein`, `grains`, `pantry`, `spices`, `frozen`, `beverages`, `other` |
| `calories_per_100g` | decimal | nullable | |
| `protein_per_100g` | decimal | nullable | grams |
| `carbs_per_100g` | decimal | nullable | grams |
| `fat_per_100g` | decimal | nullable | grams |
| `fiber_per_100g` | decimal | nullable | grams |
| `sugar_per_100g` | decimal | nullable | grams |
| `sodium_per_100g` | decimal | nullable | mg |
| `price` | decimal | nullable | Future use — no logic |
| `created_at` | timestamp | NOT NULL | |

### MealPlan

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → User, NOT NULL | |
| `week_start` | date | NOT NULL | Monday of the plan week |
| `created_at` | timestamp | NOT NULL | |
| `updated_at` | timestamp | NOT NULL | |

**UNIQUE**: (`user_id`, `week_start`)

### MealSlot

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK | |
| `meal_plan_id` | UUID | FK → MealPlan, NOT NULL, CASCADE | |
| `recipe_id` | UUID | FK → Recipe, nullable | Null = empty slot |
| `label` | string | NOT NULL | User-defined (e.g., "Post-workout", "Dinner") |
| `day_of_week` | integer | NOT NULL | 0=Monday, 6=Sunday |
| `time_of_day` | time | nullable | Optional scheduled time |
| `serving_override` | integer | nullable | If different from recipe default |
| `external_event_id` | string | nullable | Calendar event ID (for sync tracking) |
| `display_order` | integer | NOT NULL | Order within the day |
| `created_at` | timestamp | NOT NULL | |
| `updated_at` | timestamp | NOT NULL | |

### GroceryList

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → User, NOT NULL | |
| `meal_plan_id` | UUID | FK → MealPlan, NOT NULL | |
| `generated_at` | timestamp | NOT NULL | When the list was auto-generated |
| `created_at` | timestamp | NOT NULL | |
| `updated_at` | timestamp | NOT NULL | |

### GroceryItem

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK | |
| `grocery_list_id` | UUID | FK → GroceryList, NOT NULL, CASCADE | |
| `ingredient_id` | UUID | FK → Ingredient, nullable | Linked ingredient (if available) |
| `name` | string | NOT NULL | Display name |
| `quantity` | decimal | nullable | Aggregated quantity |
| `unit` | string | nullable | |
| `category` | enum | nullable | Same enum as Ingredient.category |
| `is_checked` | boolean | NOT NULL, default false | Checked off while shopping |
| `created_at` | timestamp | NOT NULL | |
| `updated_at` | timestamp | NOT NULL | |

### PantryStaple

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → User, NOT NULL | |
| `ingredient_name` | string | NOT NULL | Normalized name to match against |
| `created_at` | timestamp | NOT NULL | |

**UNIQUE**: (`user_id`, `ingredient_name`)

## Validation Rules

| Entity | Rule |
|--------|------|
| Recipe | `title` max 200 chars, `servings` >= 1, `prep_minutes` >= 0, `cook_minutes` >= 0 |
| RecipeIngredient | `quantity` > 0 when present, `display_order` >= 0 |
| MealSlot | `day_of_week` 0-6, `serving_override` >= 1 when present, `display_order` >= 0 |
| MacroGoal | `daily_target` > 0, `display_order` >= 0 |
| User | `email` valid format |
| GroceryItem | `quantity` > 0 when present |

## State Transitions

### Recipe Lifecycle
```
[API Search Result] → [User Review Form] → [Saved Recipe] → [Favorited]
[URL Import Parse]  → [User Review Form] → [Saved Recipe] → [Offline Downloaded]
[Manual Entry]      → [User Review Form] → [Saved Recipe]
[Shared Link]       → [View Only]        → [Imported to Collection]
```

### Meal Slot Lifecycle
```
[Empty Slot Created] → [Recipe Assigned] → [Calendar Event Written]
                                         → [Recipe Changed]
                                         → [Slot Deleted] → [Calendar Event Removed]
```

### Grocery List Lifecycle
```
[Meal Plan Updated] → [List Auto-Generated] → [Items Checked Off] → [All Complete]
                    → [Pantry Staples Excluded]
                    → [List Regenerated on Plan Change]
```

## PowerSync Sync Rules

Tables synced bidirectionally between SQLite and Supabase Postgres:
- `users` (row-level security: own row only)
- `macro_goals` (filtered by `user_id`)
- `dietary_preferences` (filtered by `user_id`)
- `calendar_connections` (filtered by `user_id`)
- `recipes` (filtered by `user_id`)
- `recipe_ingredients` (filtered via recipe's `user_id`)
- `ingredients` (global read, write filtered by creator)
- `meal_plans` (filtered by `user_id`)
- `meal_slots` (filtered via meal_plan's `user_id`)
- `grocery_lists` (filtered by `user_id`)
- `grocery_items` (filtered via grocery_list's `user_id`)
- `pantry_staples` (filtered by `user_id`)

All sync rules use `user_id` for row-level filtering. Each user only syncs their own data.

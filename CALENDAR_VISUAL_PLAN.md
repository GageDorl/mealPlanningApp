# Plan: Calendar Slot & Food Log Visual Overhaul + Icons

## Goal
Meal plan slots and food log entries on the calendar are cramped and truncate aggressively.
This plan improves their visual density and adds user-selectable icons to make entries
more identifiable at a glance.

## Phase 1: Visual Layout Redesign
**Status: [x] Done**

### Problem
The current slot/log cards rely entirely on text that gets truncated at very short lengths,
especially on the narrow (mobile) calendar path. Users can barely read what is in a slot.

### Changes

**`mealPlan/src/components/calendar/meal-slot-card.tsx`**
- Compact mode: label + recipe name side by side in a single row, both `numberOfLines={1}`
- Non-compact: bold label header, recipe name `fontWeight: '600'`, 2 lines max, calories hint
- `minHeight: 36`, transparent accent tint (`#4A90D9` with `1A` alpha), left accent border
- Local `ACCENT` constant instead of Colors import

**`mealPlan/src/components/calendar/food-log-card.tsx`**
- Compact mode: food summary + calories on same row, `fontWeight: '600'`
- Non-compact: ACCENT-colored bold label, item summary below, calories
- `minHeight: 36`, transparent green tint (`#50C878` with `1A` alpha), left accent border
- `handleDelete` extracted as named function

---

## Phase 2: Icon Set Selection
**Status: [x] Done**

### Icon library: `lucide-react-native`
Icons are stored as their Lucide PascalCase component name string (e.g. `"EggFried"`).
All icons verified present in the installed `lucide-react-native` package.

| Category | Lucide component | Display label |
|----------|-----------------|---------------|
| Breakfast | `EggFried` | Breakfast |
| Lunch | `Sandwich` | Lunch |
| Dinner | `Beef` | Dinner |
| Snack | `Donut` | Snack |
| Salad | `Salad` | Salad |
| Protein | `Dumbbell` | Protein |
| Drink | `GlassWater` | Drink |
| Fast food | `Hamburger` | Fast food |
| Dessert | `CakeSlice` | Dessert |
| Custom / None | (emoji or null) | — |

> Custom entries use a free-text emoji field (stored separately) rather than a Lucide icon.

The picker UI should show icon + label in a horizontal scroll row inside the add/edit modal.

---

## Phase 3: Database Schema — Add `icon` Field
**Status: [x] Done**

### Migration
**File to create:** `supabase/migrations/YYYYMMDD_slot_food_log_icons.sql`

```sql
ALTER TABLE meal_slots ADD COLUMN icon TEXT;
ALTER TABLE food_logs ADD COLUMN icon TEXT;
```

`icon` stores the Lucide PascalCase component name (e.g. `"EggFried"`), or `NULL` for no icon.

### PowerSync Schema
**File:** `mealPlan/src/services/powersync-schema.ts`

Add `icon: column.text` to both `meal_slots` and `food_logs` Table definitions.

### Service Layer
**File:** `mealPlan/src/services/meal-plan-service.ts`

- Add `icon?: string | null` to `createSlot` params and the INSERT statement
- Add `icon` to the `MealSlotWithRecipe` model

**File:** `mealPlan/src/services/food-log-service.ts`

- Add `icon?: string | null` to `createFoodLog` params and the INSERT statement
- Add `icon` to the `FoodLogWithItems` model

---

## Phase 4: Icon Picker UI
**Status: [x] Done**

### Where icons are selected
- **Meal slots:** Inside `AddMealSlotModal` — add a horizontal scroll row of icon chips above the label input
- **Food logs:** Inside the log-food form — same horizontal scroll row

Both pickers should default to no icon selected. Selecting an icon highlights it; tapping again deselects.

### Icon Picker Component
Create `mealPlan/src/components/ui/icon-picker.tsx`:

```tsx
// Props: icons: { name: string; label: string }[], value: string | null, onChange: (name: string | null) => void
// Renders a horizontal FlatList of pressable icon + label chips
// Uses lucide-react-native to render each icon by component name
```

---

## Phase 5: Display Icons on Calendar Cards
**Status: [x] Done**

In `meal-slot-card.tsx` and `food-log-card.tsx`, if the slot/log has an `icon` set, render
the Lucide icon to the left of the text. If no icon, layout stays text-only.

Icon size should be small enough to not dominate the card — 14–16px.

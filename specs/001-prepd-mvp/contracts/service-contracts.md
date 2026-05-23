# API Contracts: Prepd MVP — Service Layer

**Branch**: `001-prepd-mvp` | **Date**: 2026-05-22

Prepd is a local-first app. There is no custom REST API backend — Supabase provides the database, auth, and storage. These contracts define the **internal service layer interfaces** that components consume, and the **external API call patterns** for Spoonacular, USDA, and Calendar providers.

---

## 1. Supabase Auth Service

### `authService.signUp(email, password)`
- **Input**: `{ email: string, password: string }`
- **Output**: `{ user: User, session: Session }` or `{ error: AuthError }`

### `authService.signInWithEmail(email, password)`
- **Input**: `{ email: string, password: string }`
- **Output**: `{ user: User, session: Session }` or `{ error: AuthError }`

### `authService.signInWithOAuth(provider)`
- **Input**: `{ provider: 'google' | 'apple' }`
- **Output**: `{ user: User, session: Session }` via redirect flow

### `authService.signOut()`
- **Output**: `void`

### `authService.getSession()`
- **Output**: `{ session: Session | null }`

---

## 2. Recipe Service

### `recipeService.search(query, filters)`
External: Spoonacular `/recipes/complexSearch`

- **Input**:
  ```ts
  {
    query: string;
    cuisine?: string;
    diet?: string[];       // vegetarian, vegan, gluten-free, etc.
    maxReadyTime?: number;
    offset?: number;       // pagination
    number?: number;       // results per page (default 10)
  }
  ```
- **Output**:
  ```ts
  {
    results: Array<{
      id: number;          // Spoonacular ID
      title: string;
      image: string;
      readyInMinutes: number;
      servings: number;
      nutrition: { calories: number; protein: number; carbs: number; fat: number; };
    }>;
    totalResults: number;
    offset: number;
  }
  ```
- **Caching**: Results cached in SQLite for 7 days keyed by `query + filters` hash.
- **Offline**: Returns cached results or `{ error: 'offline', cached: [...] }`.

### `recipeService.getDetail(spoonacularId)`
External: Spoonacular `/recipes/{id}/information?includeNutrition=true`

- **Input**: `{ id: number }`
- **Output**:
  ```ts
  {
    id: number;
    title: string;
    description: string;
    image: string;
    prepMinutes: number;
    cookMinutes: number;
    servings: number;
    difficulty: 'easy' | 'medium' | 'hard' | null;
    cuisineType: string | null;
    ingredients: Array<{
      name: string;
      quantity: number;
      unit: string;
      rawText: string;
    }>;
    instructions: string[];
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
    };
    dietaryTags: string[];
    sourceUrl: string;
  }
  ```
- **Caching**: Cached in SQLite for 30 days.

### `recipeService.importFromUrl(url)`
Internal: Fetch HTML → parse schema.org JSON-LD

- **Input**: `{ url: string }`
- **Output**:
  ```ts
  {
    success: boolean;
    recipe?: Partial<RecipeFormData>;  // auto-populated fields
    error?: 'no_structured_data' | 'fetch_failed' | 'invalid_url';
  }
  ```
- **Behavior**: Returns partial recipe data for form pre-fill. Never persists. User reviews and saves manually.

### `recipeService.save(recipeData)`
Internal: PowerSync write to `recipes` + `recipe_ingredients` tables

- **Input**: `RecipeFormData` (all fields from recipe creation form)
- **Output**: `{ recipe: Recipe }` with generated UUID
- **Behavior**: Writes to local SQLite. PowerSync syncs to Supabase.

### `recipeService.toggleFavorite(recipeId)`
- **Input**: `{ id: UUID }`
- **Output**: `{ isFavorited: boolean }`

### `recipeService.delete(recipeId)`
- **Input**: `{ id: UUID }`
- **Output**: `void`
- **Side effect**: Clears any `meal_slots` referencing this recipe. Notifies user of affected days.

### `recipeService.share(recipeId)`
- **Input**: `{ id: UUID }`
- **Output**: `{ shareUrl: string }` (deep link)

---

## 3. Ingredient Nutrition Service

### `nutritionService.lookupIngredient(query)`
External: USDA FDC `/foods/search`

- **Input**: `{ query: string, dataType?: string[] }`
- **Output**:
  ```ts
  {
    results: Array<{
      fdcId: string;
      name: string;
      caloriesPer100g: number;
      proteinPer100g: number;
      carbsPer100g: number;
      fatPer100g: number;
      fiberPer100g?: number;
      sugarPer100g?: number;
      sodiumPer100g?: number;
    }>;
  }
  ```
- **Caching**: Looked-up ingredients stored in `ingredients` table permanently.

### `nutritionService.calculateForQuantity(ingredient, quantity, unit)`
Internal: Convert quantity/unit to grams → multiply by per-100g values

- **Input**: `{ ingredient: Ingredient, quantity: number, unit: string }`
- **Output**: `{ calories: number, protein: number, carbs: number, fat: number, ... }`

---

## 4. Meal Plan Service

### `mealPlanService.getWeek(weekStart)`
Internal: PowerSync query on `meal_plans` + `meal_slots` + joined `recipes`

- **Input**: `{ weekStart: Date }` (Monday)
- **Output**:
  ```ts
  {
    mealPlan: {
      id: UUID;
      weekStart: Date;
      slots: Array<{
        id: UUID;
        dayOfWeek: number;
        label: string;
        timeOfDay: string | null;
        recipe: Recipe | null;
        servingOverride: number | null;
        displayOrder: number;
      }>;
    };
  }
  ```
- **Behavior**: Creates the `MealPlan` row if it doesn't exist for the given week.

### `mealPlanService.createSlot(mealPlanId, slot)`
- **Input**: `{ mealPlanId: UUID, label: string, dayOfWeek: number, timeOfDay?: string, displayOrder: number }`
- **Output**: `{ slot: MealSlot }`

### `mealPlanService.assignRecipe(slotId, recipeId, servingOverride?)`
- **Input**: `{ slotId: UUID, recipeId: UUID, servingOverride?: number }`
- **Output**: `{ slot: MealSlot }`
- **Side effect**: If calendar connected and write enabled, creates calendar event.

### `mealPlanService.removeRecipe(slotId)`
- **Input**: `{ slotId: UUID }`
- **Output**: `void`
- **Side effect**: Removes associated calendar event if it exists.

### `mealPlanService.deleteSlot(slotId)`
- **Input**: `{ slotId: UUID }`
- **Output**: `void`
- **Side effect**: Removes associated calendar event if it exists.

### `mealPlanService.reorderSlots(mealPlanId, dayOfWeek, slotIds)`
- **Input**: `{ mealPlanId: UUID, dayOfWeek: number, slotIds: UUID[] }` (new order)
- **Output**: `void`

---

## 5. Calendar Service

### `calendarService.connect(provider)`
- **Input**: `{ provider: 'google' | 'apple' }`
- **Output**: `{ connection: CalendarConnection }` via OAuth flow
- **Platform**: Native uses `expo-calendar` permissions; web uses Google Calendar OAuth

### `calendarService.getEvents(dateRange)`
- **Input**: `{ start: Date, end: Date }`
- **Output**:
  ```ts
  {
    events: Array<{
      id: string;
      title: string;
      startDate: Date;
      endDate: Date;
      calendarId: string;
      isAllDay: boolean;
    }>;
  }
  ```

### `calendarService.createMealEvent(slot)`
- **Input**: `{ slot: MealSlot & { recipe: Recipe } }`
- **Output**: `{ eventId: string }`
- **Behavior**: Creates "Prepd: [Recipe Name]" event at the slot's time. Stores `eventId` on the slot.

### `calendarService.deleteMealEvent(eventId)`
- **Input**: `{ eventId: string }`
- **Output**: `void`

### `calendarService.disconnect(connectionId)`
- **Input**: `{ connectionId: UUID }`
- **Output**: `void`

---

## 6. Grocery Service

### `groceryService.generateList(mealPlanId)`
Internal: Aggregate all `recipe_ingredients` from slots in the meal plan

- **Input**: `{ mealPlanId: UUID }`
- **Output**: `{ groceryList: GroceryList & { items: GroceryItem[] } }`
- **Behavior**:
  1. Query all meal slots with assigned recipes for the plan
  2. Collect all recipe ingredients, adjusting for serving overrides
  3. Aggregate duplicates (same `ingredient_name`, compatible units → sum quantities)
  4. Exclude items matching `pantry_staples` entries
  5. Group by category
  6. Persist to `grocery_lists` + `grocery_items`

### `groceryService.toggleItemChecked(itemId)`
- **Input**: `{ itemId: UUID }`
- **Output**: `{ isChecked: boolean }`

### `groceryService.addPantryStaple(ingredientName)`
- **Input**: `{ ingredientName: string }`
- **Output**: `{ staple: PantryStaple }`

### `groceryService.removePantryStaple(stapleId)`
- **Input**: `{ stapleId: UUID }`
- **Output**: `void`

---

## 7. Macro Service

### `macroService.getDailyProgress(date)`
Internal: Computed from meal slots for the given date

- **Input**: `{ date: Date }`
- **Output**:
  ```ts
  {
    date: Date;
    goals: Array<{
      macroName: string;
      target: number;
      current: number;
      unit: string;
      percentage: number;
    }>;
    mealBreakdown: Array<{
      slotLabel: string;
      recipeName: string;
      macros: Record<string, number>;
    }>;
  }
  ```

### `macroService.getWeeklyProgress(weekStart)`
- **Input**: `{ weekStart: Date }`
- **Output**: `{ days: Array<DailyProgress> }`

---

## 8. User Profile Service

### `userService.getProfile()`
- **Output**: `{ user: User, macroGoals: MacroGoal[], dietaryPreferences: DietaryPreference[], calendarConnections: CalendarConnection[] }`

### `userService.updateMacroGoals(goals)`
- **Input**: `{ goals: Array<{ macroName: string, dailyTarget: number, unit: string, isActive: boolean }> }`
- **Output**: `void`
- **Behavior**: Mid-week changes apply to current and future days only.

### `userService.updateDietaryPreferences(tags)`
- **Input**: `{ tags: string[] }`
- **Output**: `void`

### `userService.updateNotificationSettings(settings)`
- **Input**: `{ mealReminders: boolean, planningNudges: boolean, macroCheckins: boolean }`
- **Output**: `void`

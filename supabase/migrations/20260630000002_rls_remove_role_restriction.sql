-- Remove the TO authenticated role restriction from all user-scoped RLS policies.
-- PowerSync executes sync queries under its own role which may not be 'authenticated',
-- causing all synced tables to be blocked. The auth.uid() = user_id check is the
-- actual security mechanism — anon/service roles get auth.uid() = NULL which never
-- matches any user_id, so removing the role restriction is safe.

-- === users ===
DROP POLICY IF EXISTS "users_all" ON users;
CREATE POLICY "users_all" ON users
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- === macro_goals ===
DROP POLICY IF EXISTS "macro_goals_all" ON macro_goals;
CREATE POLICY "macro_goals_all" ON macro_goals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- === dietary_preferences ===
DROP POLICY IF EXISTS "dietary_preferences_all" ON dietary_preferences;
CREATE POLICY "dietary_preferences_all" ON dietary_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- === calendar_connections ===
DROP POLICY IF EXISTS "calendar_connections_all" ON calendar_connections;
CREATE POLICY "calendar_connections_all" ON calendar_connections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- === ingredients (open read for all roles including anon/powersync) ===
DROP POLICY IF EXISTS "ingredients_select" ON ingredients;
CREATE POLICY "ingredients_select" ON ingredients
  FOR SELECT
  USING (true);

-- === recipes ===
DROP POLICY IF EXISTS "recipes_select" ON recipes;
DROP POLICY IF EXISTS "recipes_insert" ON recipes;
DROP POLICY IF EXISTS "recipes_update" ON recipes;
DROP POLICY IF EXISTS "recipes_delete" ON recipes;
CREATE POLICY "recipes_select" ON recipes
  FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "recipes_insert" ON recipes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recipes_update" ON recipes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recipes_delete" ON recipes
  FOR DELETE
  USING (auth.uid() = user_id);

-- === recipe_ingredients ===
DROP POLICY IF EXISTS "recipe_ingredients_select" ON recipe_ingredients;
DROP POLICY IF EXISTS "recipe_ingredients_insert" ON recipe_ingredients;
DROP POLICY IF EXISTS "recipe_ingredients_update" ON recipe_ingredients;
DROP POLICY IF EXISTS "recipe_ingredients_delete" ON recipe_ingredients;
CREATE POLICY "recipe_ingredients_select" ON recipe_ingredients
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_ingredients.recipe_id
      AND (recipes.user_id = auth.uid() OR recipes.user_id IS NULL)
  ));
CREATE POLICY "recipe_ingredients_insert" ON recipe_ingredients
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.user_id = auth.uid()
  ));
CREATE POLICY "recipe_ingredients_update" ON recipe_ingredients
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.user_id = auth.uid()
  ));
CREATE POLICY "recipe_ingredients_delete" ON recipe_ingredients
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.user_id = auth.uid()
  ));

-- === meal_plans ===
DROP POLICY IF EXISTS "meal_plans_all" ON meal_plans;
CREATE POLICY "meal_plans_all" ON meal_plans
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- === meal_slots ===
DROP POLICY IF EXISTS "meal_slots_select" ON meal_slots;
DROP POLICY IF EXISTS "meal_slots_insert" ON meal_slots;
DROP POLICY IF EXISTS "meal_slots_update" ON meal_slots;
DROP POLICY IF EXISTS "meal_slots_delete" ON meal_slots;
CREATE POLICY "meal_slots_select" ON meal_slots
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meal_plans
    WHERE meal_plans.id = meal_slots.meal_plan_id
      AND meal_plans.user_id = auth.uid()
  ));
CREATE POLICY "meal_slots_insert" ON meal_slots
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM meal_plans
    WHERE meal_plans.id = meal_slots.meal_plan_id
      AND meal_plans.user_id = auth.uid()
  ));
CREATE POLICY "meal_slots_update" ON meal_slots
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM meal_plans
    WHERE meal_plans.id = meal_slots.meal_plan_id
      AND meal_plans.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM meal_plans
    WHERE meal_plans.id = meal_slots.meal_plan_id
      AND meal_plans.user_id = auth.uid()
  ));
CREATE POLICY "meal_slots_delete" ON meal_slots
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM meal_plans
    WHERE meal_plans.id = meal_slots.meal_plan_id
      AND meal_plans.user_id = auth.uid()
  ));

-- === grocery_lists ===
DROP POLICY IF EXISTS "grocery_lists_all" ON grocery_lists;
CREATE POLICY "grocery_lists_all" ON grocery_lists
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- === grocery_items ===
DROP POLICY IF EXISTS "grocery_items_select" ON grocery_items;
DROP POLICY IF EXISTS "grocery_items_insert" ON grocery_items;
DROP POLICY IF EXISTS "grocery_items_update" ON grocery_items;
DROP POLICY IF EXISTS "grocery_items_delete" ON grocery_items;
CREATE POLICY "grocery_items_select" ON grocery_items
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM grocery_lists
    WHERE grocery_lists.id = grocery_items.grocery_list_id
      AND grocery_lists.user_id = auth.uid()
  ));
CREATE POLICY "grocery_items_insert" ON grocery_items
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM grocery_lists
    WHERE grocery_lists.id = grocery_items.grocery_list_id
      AND grocery_lists.user_id = auth.uid()
  ));
CREATE POLICY "grocery_items_update" ON grocery_items
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM grocery_lists
    WHERE grocery_lists.id = grocery_items.grocery_list_id
      AND grocery_lists.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM grocery_lists
    WHERE grocery_lists.id = grocery_items.grocery_list_id
      AND grocery_lists.user_id = auth.uid()
  ));
CREATE POLICY "grocery_items_delete" ON grocery_items
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM grocery_lists
    WHERE grocery_lists.id = grocery_items.grocery_list_id
      AND grocery_lists.user_id = auth.uid()
  ));

-- === pantry_staples ===
DROP POLICY IF EXISTS "pantry_staples_all" ON pantry_staples;
CREATE POLICY "pantry_staples_all" ON pantry_staples
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- === profiles ===
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- === meal_slot_recipes ===
DROP POLICY IF EXISTS "meal_slot_recipes_select" ON meal_slot_recipes;
DROP POLICY IF EXISTS "meal_slot_recipes_insert" ON meal_slot_recipes;
DROP POLICY IF EXISTS "meal_slot_recipes_update" ON meal_slot_recipes;
DROP POLICY IF EXISTS "meal_slot_recipes_delete" ON meal_slot_recipes;
CREATE POLICY "meal_slot_recipes_select" ON meal_slot_recipes
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM meal_slots
    JOIN meal_plans ON meal_plans.id = meal_slots.meal_plan_id
    WHERE meal_slots.id = meal_slot_recipes.meal_slot_id
      AND meal_plans.user_id = auth.uid()
  ));
CREATE POLICY "meal_slot_recipes_insert" ON meal_slot_recipes
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM meal_slots
    JOIN meal_plans ON meal_plans.id = meal_slots.meal_plan_id
    WHERE meal_slots.id = meal_slot_recipes.meal_slot_id
      AND meal_plans.user_id = auth.uid()
  ));
CREATE POLICY "meal_slot_recipes_update" ON meal_slot_recipes
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM meal_slots
    JOIN meal_plans ON meal_plans.id = meal_slots.meal_plan_id
    WHERE meal_slots.id = meal_slot_recipes.meal_slot_id
      AND meal_plans.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM meal_slots
    JOIN meal_plans ON meal_plans.id = meal_slots.meal_plan_id
    WHERE meal_slots.id = meal_slot_recipes.meal_slot_id
      AND meal_plans.user_id = auth.uid()
  ));
CREATE POLICY "meal_slot_recipes_delete" ON meal_slot_recipes
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM meal_slots
    JOIN meal_plans ON meal_plans.id = meal_slots.meal_plan_id
    WHERE meal_slots.id = meal_slot_recipes.meal_slot_id
      AND meal_plans.user_id = auth.uid()
  ));

-- === food_logs ===
DROP POLICY IF EXISTS "food_logs_all" ON food_logs;
CREATE POLICY "food_logs_all" ON food_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- === food_log_items ===
DROP POLICY IF EXISTS "food_log_items_select" ON food_log_items;
DROP POLICY IF EXISTS "food_log_items_insert" ON food_log_items;
DROP POLICY IF EXISTS "food_log_items_update" ON food_log_items;
DROP POLICY IF EXISTS "food_log_items_delete" ON food_log_items;
CREATE POLICY "food_log_items_select" ON food_log_items
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM food_logs
    WHERE food_logs.id = food_log_items.food_log_id
      AND food_logs.user_id = auth.uid()
  ));
CREATE POLICY "food_log_items_insert" ON food_log_items
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM food_logs
    WHERE food_logs.id = food_log_items.food_log_id
      AND food_logs.user_id = auth.uid()
  ));
CREATE POLICY "food_log_items_update" ON food_log_items
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM food_logs
    WHERE food_logs.id = food_log_items.food_log_id
      AND food_logs.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM food_logs
    WHERE food_logs.id = food_log_items.food_log_id
      AND food_logs.user_id = auth.uid()
  ));
CREATE POLICY "food_log_items_delete" ON food_log_items
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM food_logs
    WHERE food_logs.id = food_log_items.food_log_id
      AND food_logs.user_id = auth.uid()
  ));

-- === personal_foods ===
DROP POLICY IF EXISTS "personal_foods_all" ON personal_foods;
CREATE POLICY "personal_foods_all" ON personal_foods
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

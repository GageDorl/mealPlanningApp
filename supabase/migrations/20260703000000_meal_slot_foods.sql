-- Meal slots currently only support recipes (meal_slot_recipes). This adds a parallel
-- table for planning standalone food items in a meal slot — e.g. a specific FatSecret
-- product ("Quest Protein Bar - Chocolate Chip Cookie Dough") or an AI-suggested dish
-- that isn't tied to a Recipe row. Mirrors meal_slot_recipes' structure/RLS pattern,
-- and food_log_items' column shape (same nutrition fields, minus the log-specific ones).

CREATE TABLE IF NOT EXISTS meal_slot_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_slot_id UUID NOT NULL REFERENCES meal_slots(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  brand_name TEXT,
  serving_size_amount NUMERIC,
  serving_size_unit TEXT,
  servings_planned NUMERIC NOT NULL DEFAULT 1,
  calories NUMERIC,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  saturated_fat NUMERIC,
  trans_fat NUMERIC,
  cholesterol NUMERIC,
  sodium NUMERIC,
  dietary_fiber NUMERIC,
  total_sugar NUMERIC,
  added_sugar NUMERIC,
  source TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'fatsecret' | 'library' | 'community' | 'ai_estimate'
  source_id TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE meal_slot_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meal_slot_foods_select" ON meal_slot_foods
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM meal_slots
    JOIN meal_plans ON meal_plans.id = meal_slots.meal_plan_id
    WHERE meal_slots.id = meal_slot_foods.meal_slot_id
      AND meal_plans.user_id = auth.uid()
  ));

CREATE POLICY "meal_slot_foods_insert" ON meal_slot_foods
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM meal_slots
    JOIN meal_plans ON meal_plans.id = meal_slots.meal_plan_id
    WHERE meal_slots.id = meal_slot_foods.meal_slot_id
      AND meal_plans.user_id = auth.uid()
  ));

CREATE POLICY "meal_slot_foods_update" ON meal_slot_foods
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM meal_slots
    JOIN meal_plans ON meal_plans.id = meal_slots.meal_plan_id
    WHERE meal_slots.id = meal_slot_foods.meal_slot_id
      AND meal_plans.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM meal_slots
    JOIN meal_plans ON meal_plans.id = meal_slots.meal_plan_id
    WHERE meal_slots.id = meal_slot_foods.meal_slot_id
      AND meal_plans.user_id = auth.uid()
  ));

CREATE POLICY "meal_slot_foods_delete" ON meal_slot_foods
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM meal_slots
    JOIN meal_plans ON meal_plans.id = meal_slots.meal_plan_id
    WHERE meal_slots.id = meal_slot_foods.meal_slot_id
      AND meal_plans.user_id = auth.uid()
  ));

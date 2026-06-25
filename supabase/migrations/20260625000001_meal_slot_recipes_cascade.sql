-- Add ON DELETE CASCADE to meal_slot_recipes.meal_slot_id so deleting a meal_slot
-- automatically removes its recipes, preventing FK violations during PowerSync uploads.
ALTER TABLE meal_slot_recipes
  DROP CONSTRAINT IF EXISTS meal_slot_recipes_meal_slot_id_fkey;

ALTER TABLE meal_slot_recipes
  ADD CONSTRAINT meal_slot_recipes_meal_slot_id_fkey
  FOREIGN KEY (meal_slot_id) REFERENCES meal_slots(id) ON DELETE CASCADE;

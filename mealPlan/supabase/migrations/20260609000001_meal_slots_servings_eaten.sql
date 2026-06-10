-- Add servings_eaten to meal_slots so users can log how many servings they actually ate
-- (distinct from serving_override, which is the planned portion size)
ALTER TABLE meal_slots ADD COLUMN servings_eaten numeric;

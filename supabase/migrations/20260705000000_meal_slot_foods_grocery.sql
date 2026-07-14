-- Lets the weekly planner's food items feed into grocery list generation. AI "buy" items are
-- either a restaurant/fast-food order (never a grocery item) or something grocery-purchasable
-- (goes on the list); "cook" items have no ingredient breakdown yet, so they're excluded either way.
ALTER TABLE meal_slot_foods ADD COLUMN IF NOT EXISTS is_grocery_item BOOLEAN NOT NULL DEFAULT true;

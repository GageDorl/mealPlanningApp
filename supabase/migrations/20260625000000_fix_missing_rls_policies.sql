-- Add dev_allow_all RLS policies for tables that were added after the initial schema
-- without corresponding policies, causing all writes to be blocked.

ALTER TABLE meal_slot_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_log_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_allow_all" ON meal_slot_recipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON food_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON food_log_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON personal_foods FOR ALL USING (true) WITH CHECK (true);

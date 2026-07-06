-- Meals-per-day is now a persistent profile setting (set in Account settings) rather than a
-- question asked every time the user opens the week planner, since it rarely changes.
ALTER TABLE users ADD COLUMN IF NOT EXISTS meals_per_day INTEGER NOT NULL DEFAULT 3;

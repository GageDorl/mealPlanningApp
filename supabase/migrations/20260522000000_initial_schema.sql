-- Initial schema for Prepd MVP
-- Based on specs/001-prepd-mvp/migrations/001_initial_schema.sql

CREATE TYPE auth_method_enum AS ENUM ('email', 'google', 'apple');
CREATE TYPE user_tier_enum AS ENUM ('free', 'premium');
CREATE TYPE calendar_provider_enum AS ENUM ('google', 'apple', 'outlook');
CREATE TYPE recipe_source_type_enum AS ENUM ('api', 'url_import', 'user_created', 'shared');
CREATE TYPE recipe_difficulty_enum AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE ingredient_category_enum AS ENUM ('produce', 'dairy', 'protein', 'grains', 'pantry', 'spices', 'frozen', 'beverages', 'other');

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  auth_method auth_method_enum NOT NULL,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  tutorial_completed BOOLEAN NOT NULL DEFAULT FALSE,
  tier user_tier_enum NOT NULL DEFAULT 'free',
  notification_meal_reminders BOOLEAN NOT NULL DEFAULT FALSE,
  notification_planning_nudges BOOLEAN NOT NULL DEFAULT FALSE,
  notification_macro_checkins BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE macro_goals (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  macro_name TEXT NOT NULL,
  daily_target NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE dietary_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(user_id, tag)
);

CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider calendar_provider_enum NOT NULL,
  calendar_id TEXT NOT NULL,
  calendar_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_read_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_write_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE ingredients (
  id UUID PRIMARY KEY,
  usda_fdc_id TEXT UNIQUE,
  name TEXT NOT NULL,
  category ingredient_category_enum,
  calories_per_100g NUMERIC,
  protein_per_100g NUMERIC,
  carbs_per_100g NUMERIC,
  fat_per_100g NUMERIC,
  fiber_per_100g NUMERIC,
  sugar_per_100g NUMERIC,
  sodium_per_100g NUMERIC,
  price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE recipes (
  id UUID PRIMARY KEY,
  -- user_id is nullable during Phase 7 development (auth wired in Phase 3)
  user_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  prep_minutes INTEGER,
  cook_minutes INTEGER,
  servings INTEGER NOT NULL DEFAULT 1,
  difficulty recipe_difficulty_enum,
  cuisine_type TEXT,
  source_type recipe_source_type_enum NOT NULL DEFAULT 'user_created',
  source_url TEXT,
  source_api_id TEXT,
  is_favorited BOOLEAN NOT NULL DEFAULT FALSE,
  is_offline_available BOOLEAN NOT NULL DEFAULT TRUE,
  calories_per_serving NUMERIC,
  protein_per_serving NUMERIC,
  carbs_per_serving NUMERIC,
  fat_per_serving NUMERIC,
  fiber_per_serving NUMERIC,
  sugar_per_serving NUMERIC,
  sodium_per_serving NUMERIC,
  instructions JSONB,
  dietary_tags JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_source_type ON recipes(source_type);
CREATE INDEX idx_recipes_source_api_id ON recipes(source_api_id);
CREATE INDEX idx_recipes_cuisine_type ON recipes(cuisine_type);

CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id),
  raw_text TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  display_order INTEGER NOT NULL,
  calories NUMERIC,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC
);

CREATE TABLE meal_plans (
  id UUID PRIMARY KEY,
  -- user_id is nullable during Phase 7 development (auth wired in Phase 3)
  user_id UUID,
  week_start DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meal_plans_week_start ON meal_plans(week_start);
CREATE INDEX idx_meal_plans_user_id ON meal_plans(user_id);

CREATE TABLE meal_slots (
  id UUID PRIMARY KEY,
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id),
  label TEXT NOT NULL,
  date DATE NOT NULL,
  time_of_day TIME,
  serving_override INTEGER,
  external_event_id TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meal_slots_meal_plan_id ON meal_slots(meal_plan_id);
CREATE INDEX idx_meal_slots_date ON meal_slots(date);

CREATE TABLE grocery_lists (
  id UUID PRIMARY KEY,
  user_id UUID,
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE grocery_items (
  id UUID PRIMARY KEY,
  grocery_list_id UUID NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id),
  name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  category ingredient_category_enum,
  is_checked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE pantry_staples (
  id UUID PRIMARY KEY,
  user_id UUID,
  ingredient_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Row Level Security
-- Permissive policies during development (tighten once auth is wired in Phase 3)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE macro_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE dietary_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_staples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_allow_all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON macro_goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON dietary_preferences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON calendar_connections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON recipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON recipe_ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON meal_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON meal_slots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON grocery_lists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON grocery_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_allow_all" ON pantry_staples FOR ALL USING (true) WITH CHECK (true);

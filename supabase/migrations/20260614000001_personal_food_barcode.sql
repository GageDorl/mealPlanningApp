CREATE TABLE IF NOT EXISTS personal_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  brand_name TEXT,
  serving_size_amount NUMERIC,
  serving_size_unit TEXT,
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
  fatsecret_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE personal_foods ADD COLUMN IF NOT EXISTS barcode TEXT;
CREATE INDEX IF NOT EXISTS idx_personal_food_barcode ON personal_foods(barcode) WHERE barcode IS NOT NULL;

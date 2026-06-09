-- Pantry rework: add quantity/unit tracking to pantry_staples
-- and deficit_note to grocery_items for "need X more" display

ALTER TABLE pantry_staples
  ADD COLUMN quantity NUMERIC,
  ADD COLUMN unit TEXT;

ALTER TABLE grocery_items
  ADD COLUMN deficit_note TEXT;

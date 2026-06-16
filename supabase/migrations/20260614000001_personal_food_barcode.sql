ALTER TABLE personal_foods ADD COLUMN barcode TEXT;
CREATE INDEX idx_personal_food_barcode ON personal_foods(barcode) WHERE barcode IS NOT NULL;

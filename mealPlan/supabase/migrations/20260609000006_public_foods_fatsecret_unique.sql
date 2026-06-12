-- Partial unique index so fatsecret foods can be upserted without duplicates
-- while manual foods (fatsecret_id IS NULL) remain unrestricted.
create unique index public_foods_fatsecret_id_unique
  on public.public_foods(fatsecret_id)
  where fatsecret_id is not null;

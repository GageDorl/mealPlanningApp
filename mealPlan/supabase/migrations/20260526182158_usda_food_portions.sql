create table public.usda_food_portions (
  fdc_id text primary key,
  food_name text not null,
  portions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.usda_food_portions enable row level security;

-- Any authenticated user can read the shared cache
create policy "authenticated users can read food portions"
  on public.usda_food_portions
  for select
  to authenticated
  using (true);

-- Writes are handled exclusively via the store-food-portions Edge Function
-- using the service role key — no direct client write policies needed

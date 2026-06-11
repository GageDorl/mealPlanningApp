-- Multiple recipes per meal slot
create table public.meal_slot_recipes (
  id uuid primary key default gen_random_uuid(),
  meal_slot_id uuid not null references public.meal_slots(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  servings_eaten numeric,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_meal_slot_recipes_slot_id on public.meal_slot_recipes(meal_slot_id);

-- Migrate existing single-recipe data into the new table
insert into public.meal_slot_recipes (id, meal_slot_id, recipe_id, servings_eaten, display_order, created_at, updated_at)
select gen_random_uuid(), id, recipe_id, servings_eaten, 0, created_at, updated_at
from public.meal_slots
where recipe_id is not null;

alter table public.meal_slot_recipes enable row level security;

create policy "dev_allow_all" on public.meal_slot_recipes for all using (true) with check (true);

create table public.personal_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_name text not null,
  brand_name text,
  serving_size_amount numeric,
  serving_size_unit text,
  calories numeric,
  protein numeric,
  carbs numeric,
  fat numeric,
  saturated_fat numeric,
  trans_fat numeric,
  cholesterol numeric,
  sodium numeric,
  dietary_fiber numeric,
  total_sugar numeric,
  added_sugar numeric,
  fatsecret_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index personal_foods_user_id_idx on public.personal_foods(user_id);

alter table public.personal_foods enable row level security;

create policy "users can manage their own personal foods"
  on public.personal_foods
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

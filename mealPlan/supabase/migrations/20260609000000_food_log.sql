create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  time_of_day time,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.food_log_items (
  id uuid primary key default gen_random_uuid(),
  food_log_id uuid not null references public.food_logs(id) on delete cascade,
  food_name text not null,
  brand_name text,
  serving_size_amount numeric,
  serving_size_unit text,
  servings_eaten numeric not null default 1,
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
  source text not null default 'manual',
  source_id text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index food_logs_user_date_idx on public.food_logs(user_id, date);
create index food_log_items_food_log_id_idx on public.food_log_items(food_log_id);

alter table public.food_logs enable row level security;
alter table public.food_log_items enable row level security;

create policy "users can manage their own food logs"
  on public.food_logs
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users can manage their own food log items"
  on public.food_log_items
  for all
  to authenticated
  using (
    exists (
      select 1 from public.food_logs
      where id = food_log_items.food_log_id
        and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.food_logs
      where id = food_log_items.food_log_id
        and user_id = auth.uid()
    )
  );

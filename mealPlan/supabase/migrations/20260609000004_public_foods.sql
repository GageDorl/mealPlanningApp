create table public.public_foods (
  id uuid primary key default gen_random_uuid(),

  -- nutrition data mirrors personal_foods
  food_name            text not null,
  brand_name           text,
  serving_size_amount  numeric,
  serving_size_unit    text,
  calories             numeric,
  protein              numeric,
  carbs                numeric,
  fat                  numeric,
  saturated_fat        numeric,
  trans_fat            numeric,
  cholesterol          numeric,
  sodium               numeric,
  dietary_fiber        numeric,
  total_sugar          numeric,
  added_sugar          numeric,
  fatsecret_id         text,
  source               text,  -- 'manual' | 'fatsecret' | 'recipe'

  -- community / moderation fields
  submitted_by   uuid not null references auth.users(id),
  approved       bool not null default false,
  approval_notes text,
  barcode        text,
  trusted        bool not null default false,  -- true = FatSecret-sourced, auto-approved
  flagged        bool not null default false,  -- true = has open flags awaiting moderator review
  flag_count     int  not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index public_foods_approved_flagged_idx on public.public_foods(approved, flagged);
create index public_foods_submitted_by_idx     on public.public_foods(submitted_by);
create index public_foods_fatsecret_id_idx     on public.public_foods(fatsecret_id);
create index public_foods_barcode_idx          on public.public_foods(barcode);

alter table public.public_foods enable row level security;

-- Authenticated users can see approved foods.
-- Submitters can also see their own pending/rejected foods.
create policy "read approved or own foods"
  on public.public_foods
  for select
  to authenticated
  using (
    approved = true
    or (select auth.uid()) = submitted_by
  );

-- No INSERT, UPDATE, or DELETE policies for regular clients.
-- All writes go through edge functions that use the service_role key (bypasses RLS).

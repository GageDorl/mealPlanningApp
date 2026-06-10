create table public.food_flags (
  id         uuid primary key default gen_random_uuid(),
  food_id    uuid not null references public.public_foods(id) on delete cascade,
  flagged_by uuid not null references auth.users(id),
  reason     text,
  resolved   bool not null default false,
  created_at timestamptz not null default now(),

  -- one flag per user per food
  unique (food_id, flagged_by)
);

create index food_flags_food_id_idx  on public.food_flags(food_id);
create index food_flags_resolved_idx on public.food_flags(resolved);

alter table public.food_flags enable row level security;

-- Users can submit a flag for a food they haven't already flagged
create policy "users can flag foods"
  on public.food_flags
  for insert
  to authenticated
  with check ((select auth.uid()) = flagged_by);

-- Users can read their own flags.
-- Moderators and admins can read all flags (needed for the admin review screen).
create policy "users read own flags, moderators read all"
  on public.food_flags
  for select
  to authenticated
  using (
    (select auth.uid()) = flagged_by
    or exists (
      select 1 from public.profiles
      where user_id = (select auth.uid())
        and role in ('moderator', 'admin')
    )
  );

-- Moderators/admins can update flags (mark resolved = true via moderate-food edge function).
-- Edge function uses service_role and bypasses RLS, but this policy is a fallback for
-- future direct moderator access if needed.
create policy "moderators can update flags"
  on public.food_flags
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where user_id = (select auth.uid())
        and role in ('moderator', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where user_id = (select auth.uid())
        and role in ('moderator', 'admin')
    )
  );

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role    text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile row (needed so role-check subqueries in other policies work)
create policy "users can read own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Only admins can update any profile's role field.
-- The subquery reads the caller's own row (covered by the SELECT policy above).
create policy "admins can update any profile role"
  on public.profiles
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = (select auth.uid())
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.user_id = (select auth.uid())
        and p.role = 'admin'
    )
  );

-- Auto-create a profile row when a new auth user signs up.
-- SECURITY DEFINER is required to write to public.profiles from an auth.users trigger.
-- set search_path = '' prevents search-path hijacking.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Prevent direct invocation by non-superuser roles
revoke execute on function public.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profiles for any users that already exist
insert into public.profiles (user_id, role)
select id, 'user'
from auth.users
on conflict (user_id) do nothing;

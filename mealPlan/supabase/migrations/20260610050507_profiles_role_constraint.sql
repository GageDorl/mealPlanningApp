alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'moderator', 'admin'));

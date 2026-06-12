-- Replace the open dev_allow_all policy with a user-scoped one.
-- Access is granted when the slot belongs to a meal plan owned by the caller.
drop policy if exists "dev_allow_all" on public.meal_slot_recipes;

create policy "users can manage their own meal slot recipes"
  on public.meal_slot_recipes
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.meal_slots ms
      join public.meal_plans mp on mp.id = ms.meal_plan_id
      where ms.id = meal_slot_recipes.meal_slot_id
        and mp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.meal_slots ms
      join public.meal_plans mp on mp.id = ms.meal_plan_id
      where ms.id = meal_slot_recipes.meal_slot_id
        and mp.user_id = auth.uid()
    )
  );

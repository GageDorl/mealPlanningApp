import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

function adminClient() {
  const url = process.env.CYPRESS_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.CYPRESS_SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url) throw new Error('CYPRESS_SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) is not set');
  if (!key) throw new Error('CYPRESS_SUPABASE_SERVICE_ROLE_KEY is not set');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function seedTestData(): Promise<null> {
  const supabase = adminClient();
  const email = process.env.CYPRESS_TEST_USER_EMAIL ?? '';
  const password = process.env.CYPRESS_TEST_USER_PASSWORD ?? '';
  if (!email) throw new Error('CYPRESS_TEST_USER_EMAIL is not set');
  if (!password) throw new Error('CYPRESS_TEST_USER_PASSWORD is not set');

  // Ensure the test user exists in auth
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  let user = listData?.users.find((u) => u.email === email);

  if (!user) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    user = created.user;
  }

  if (!user) throw new Error('Could not find or create test user');
  const userId = user.id;
  const now = new Date().toISOString();

  // users table: id and created_at have no DEFAULT — must be supplied.
  // auth_method is an enum: 'email' | 'google' | 'apple'.
  const { data: existingUser, error: existingUserError } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
  if (existingUserError) throw existingUserError;
  if (existingUser) {
    const { error } = await supabase.from('users').update({
      display_name: 'Cypress Tester',
      onboarding_completed: true,
      tutorial_completed: true,
      updated_at: now,
    }).eq('id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('users').insert({
      id: userId,
      email,
      display_name: 'Cypress Tester',
      auth_method: 'email',
      onboarding_completed: true,
      tutorial_completed: true,
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;
  }

  // macro_goals: id and created_at have no DEFAULT — must be supplied.
  const goals = [
    { macro_name: 'Calories', daily_target: 2000, unit: 'kcal', display_order: 0 },
    { macro_name: 'Protein',  daily_target: 150,  unit: 'g',    display_order: 1 },
    { macro_name: 'Carbs',    daily_target: 200,  unit: 'g',    display_order: 2 },
    { macro_name: 'Fat',      daily_target: 65,   unit: 'g',    display_order: 3 },
  ];

  for (const goal of goals) {
    const { data: existing, error: existingError } = await supabase
      .from('macro_goals')
      .select('id')
      .eq('user_id', userId)
      .eq('macro_name', goal.macro_name)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      const { error } = await supabase.from('macro_goals').update({
        daily_target: goal.daily_target,
        unit: goal.unit,
        display_order: goal.display_order,
        is_active: true,
      }).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('macro_goals').insert({
        id: randomUUID(),
        user_id: userId,
        macro_name: goal.macro_name,
        daily_target: goal.daily_target,
        unit: goal.unit,
        display_order: goal.display_order,
        is_active: true,
        created_at: now,
      });
      if (error) throw error;
    }
  }

  return null;
}

export async function cleanFoodLogs(): Promise<null> {
  const supabase = adminClient();
  const email = process.env.CYPRESS_TEST_USER_EMAIL ?? '';

  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  const user = listData?.users.find((u) => u.email === email);
  if (!user) return null;

  const { error: deleteError } = await supabase.from('food_logs').delete().eq('user_id', user.id);
  if (deleteError) throw deleteError;

  return null;
}

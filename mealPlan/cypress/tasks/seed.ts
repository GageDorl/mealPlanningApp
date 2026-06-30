import { createClient } from '@supabase/supabase-js';

function adminClient() {
  const url = process.env.CYPRESS_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.CYPRESS_SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!key) throw new Error('CYPRESS_SUPABASE_SERVICE_ROLE_KEY is not set');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function seedTestData(): Promise<null> {
  const supabase = adminClient();
  const email = process.env.CYPRESS_TEST_USER_EMAIL ?? '';
  const password = process.env.CYPRESS_TEST_USER_PASSWORD ?? '';

  // Ensure the test user exists in auth
  const { data: listData } = await supabase.auth.admin.listUsers();
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

  // Upsert user profile
  await supabase.from('users').upsert({
    id: userId,
    email,
    display_name: 'Cypress Tester',
    onboarding_completed: true,
    tutorial_completed: true,
    tutorial_chapters_completed: '[]',
    notification_meal_reminders: false,
    notification_planning_nudges: false,
    notification_macro_checkins: false,
    notification_macro_adjustment: false,
  }, { onConflict: 'id' });

  // Upsert macro goals
  const goals = [
    { user_id: userId, macro_name: 'Calories', daily_target: 2000, unit: 'kcal', display_order: 0, is_active: true },
    { user_id: userId, macro_name: 'Protein', daily_target: 150, unit: 'g', display_order: 1, is_active: true },
    { user_id: userId, macro_name: 'Carbs', daily_target: 200, unit: 'g', display_order: 2, is_active: true },
    { user_id: userId, macro_name: 'Fat', daily_target: 65, unit: 'g', display_order: 3, is_active: true },
  ];

  for (const goal of goals) {
    await supabase.from('macro_goals').upsert(goal, { onConflict: 'user_id,macro_name' });
  }

  return null;
}

export async function cleanFoodLogs(): Promise<null> {
  const supabase = adminClient();
  const email = process.env.CYPRESS_TEST_USER_EMAIL ?? '';

  const { data: listData } = await supabase.auth.admin.listUsers();
  const user = listData?.users.find((u) => u.email === email);
  if (!user) return null;

  // Delete all food logs for the test user (cascades to food_log_items)
  await supabase.from('food_logs').delete().eq('user_id', user.id);

  return null;
}

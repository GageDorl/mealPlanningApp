import { supabase } from '@/services/supabase';

interface MacroGoalInput {
  macro_name: string;
  daily_target: number;
  unit: string;
  display_order: number;
  is_active: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  theme_preference: 'light' | 'dark' | null;
  onboarding_completed: boolean;
  notification_meal_reminders: boolean;
  notification_planning_nudges: boolean;
  notification_macro_checkins: boolean;
}

export interface UserProfileData {
  user: UserProfile;
  macroGoals: MacroGoalInput[];
  dietaryPreferences: string[];
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createUserProfile(user: {
  id: string;
  email: string;
  displayName?: string | null;
  authMethod?: 'email' | 'google' | 'apple';
}) {
  return supabase.from('users').insert([
    {
      id: user.id,
      email: user.email,
      display_name: user.displayName ?? null,
      auth_method: user.authMethod ?? 'email',
      onboarding_completed: false,
      tutorial_completed: false,
      tier: 'free',
      notification_meal_reminders: false,
      notification_planning_nudges: false,
      notification_macro_checkins: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);
}

export async function getProfile(userId: string): Promise<UserProfileData | null> {
  const [{ data: userData, error: userError }, { data: macroData, error: macrosError }, { data: dietData, error: dietError }] =
    await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('macro_goals').select('*').eq('user_id', userId),
      supabase.from('dietary_preferences').select('tag').eq('user_id', userId),
    ]);

  if (userError || macrosError || dietError || !userData) {
    return null;
  }

  return {
    user: userData as UserProfile,
    macroGoals: (macroData ?? []) as MacroGoalInput[],
    dietaryPreferences: ((dietData ?? []) as Array<{ tag: string }>).map((item) => item.tag),
  };
}

export async function updateMacroGoals(userId: string, macroGoals: MacroGoalInput[]) {
  await supabase.from('macro_goals').delete().eq('user_id', userId);
  const records = macroGoals.map((goal) => ({
    id: createId(),
    user_id: userId,
    macro_name: goal.macro_name,
    daily_target: goal.daily_target,
    unit: goal.unit,
    display_order: goal.display_order,
    is_active: goal.is_active,
    created_at: new Date().toISOString(),
  }));

  return supabase.from('macro_goals').insert(records);
}

export async function updateDietaryPreferences(userId: string, tags: string[]) {
  await supabase.from('dietary_preferences').delete().eq('user_id', userId);
  const records = tags.map((tag) => ({
    id: createId(),
    user_id: userId,
    tag,
    created_at: new Date().toISOString(),
  }));

  return supabase.from('dietary_preferences').insert(records);
}

export async function markOnboardingComplete(userId: string) {
  return supabase.from('users').update({ onboarding_completed: true }).eq('id', userId);
}

export async function updateNotificationSettings(userId: string, settings: {
  notification_meal_reminders: boolean;
  notification_planning_nudges: boolean;
  notification_macro_checkins: boolean;
}) {
  return supabase.from('users').update(settings).eq('id', userId);
}

export async function updateThemePreference(userId: string, mode: 'light' | 'dark' | null) {
  return supabase.from('users').update({ theme_preference: mode }).eq('id', userId);
}

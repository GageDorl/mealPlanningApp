import { supabase } from '@/services/supabase';

interface PsDb {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
  getAll<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

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

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function createUserProfile(db: PsDb, user: {
  id: string;
  email: string;
  displayName?: string | null;
  authMethod?: 'email' | 'google' | 'apple';
}): Promise<void> {
  const now = new Date().toISOString();
  await db.execute(
    'INSERT INTO users (id, email, display_name, auth_method, theme_preference, onboarding_completed, tutorial_completed, tier, notification_meal_reminders, notification_planning_nudges, notification_macro_checkins, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [user.id, user.email, user.displayName ?? null, user.authMethod ?? 'email', null, 0, 0, 'free', 0, 0, 0, now, now],
  );
}

export async function getProfile(userId: string): Promise<UserProfileData | null> {
  const [{ data: userData, error: userError }, { data: macroData, error: macrosError }, { data: dietData, error: dietError }] =
    await Promise.all([
      supabase.from('users').select('*').eq('id', userId).maybeSingle(),
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

export async function updateMacroGoals(db: PsDb, userId: string, macroGoals: MacroGoalInput[]) {
  const now = new Date().toISOString();
  const existing = await db.getAll<{ id: string; macro_name: string }>(
    'SELECT id, macro_name FROM macro_goals WHERE user_id = ?',
    [userId],
  );
  const existingMap = new Map(existing.map((r) => [r.macro_name, r.id]));

  for (const goal of macroGoals) {
    const existingId = existingMap.get(goal.macro_name);
    if (existingId) {
      await db.execute(
        'UPDATE macro_goals SET daily_target = ?, unit = ?, display_order = ?, is_active = ? WHERE id = ?',
        [goal.daily_target, goal.unit, goal.display_order, goal.is_active ? 1 : 0, existingId],
      );
    } else {
      await db.execute(
        'INSERT INTO macro_goals (id, user_id, macro_name, daily_target, unit, display_order, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [createId(), userId, goal.macro_name, goal.daily_target, goal.unit, goal.display_order, goal.is_active ? 1 : 0, now],
      );
    }
  }
}

export async function updateDietaryPreferences(db: PsDb, userId: string, tags: string[]) {
  const now = new Date().toISOString();
  const existing = await db.getAll<{ id: string; tag: string }>(
    'SELECT id, tag FROM dietary_preferences WHERE user_id = ?',
    [userId],
  );
  const existingByTag = new Map(existing.map((r) => [r.tag, r.id]));
  const newTagSet = new Set(tags);

  // Delete only tags the user explicitly removed
  for (const [tag, id] of existingByTag) {
    if (!newTagSet.has(tag)) {
      await db.execute('DELETE FROM dietary_preferences WHERE id = ?', [id]);
    }
  }

  // Insert only newly added tags
  for (const tag of tags) {
    if (!existingByTag.has(tag)) {
      await db.execute(
        'INSERT INTO dietary_preferences (id, user_id, tag, created_at) VALUES (?, ?, ?, ?)',
        [createId(), userId, tag, now],
      );
    }
  }
}

export async function markOnboardingComplete(db: PsDb, userId: string) {
  await db.execute(
    'UPDATE users SET onboarding_completed = 1, updated_at = ? WHERE id = ?',
    [new Date().toISOString(), userId],
  );
}

export async function updateNotificationSettings(db: PsDb, userId: string, settings: {
  notification_meal_reminders: boolean;
  notification_planning_nudges: boolean;
  notification_macro_checkins: boolean;
}) {
  await db.execute(
    'UPDATE users SET notification_meal_reminders = ?, notification_planning_nudges = ?, notification_macro_checkins = ?, updated_at = ? WHERE id = ?',
    [
      settings.notification_meal_reminders ? 1 : 0,
      settings.notification_planning_nudges ? 1 : 0,
      settings.notification_macro_checkins ? 1 : 0,
      new Date().toISOString(),
      userId,
    ],
  );
}

export async function updateDisplayName(db: PsDb, userId: string, displayName: string) {
  await db.execute(
    'UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?',
    [displayName || null, new Date().toISOString(), userId],
  );
}

export async function updateThemePreference(db: PsDb, userId: string, mode: 'light' | 'dark' | null) {
  await db.execute(
    'UPDATE users SET theme_preference = ?, updated_at = ? WHERE id = ?',
    [mode, new Date().toISOString(), userId],
  );
}

export async function getCalendarPrefs(userId: string): Promise<{
  selected_calendar_ids: string[];
  calendar_export_enabled: boolean;
}> {
  const { data, error } = await supabase
    .from('users')
    .select('selected_calendar_ids, calendar_export_enabled')
    .eq('id', userId)
    .single();
  if (error || !data) return { selected_calendar_ids: [], calendar_export_enabled: false };
  return {
    selected_calendar_ids: (() => {
      const raw = data.selected_calendar_ids;
      if (!raw) return [];
      if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return []; } }
      return raw as string[];
    })(),
    calendar_export_enabled: (data.calendar_export_enabled as boolean) ?? false,
  };
}

export async function setCalendarPrefs(
  db: PsDb,
  userId: string,
  prefs: { selected_calendar_ids?: string[]; calendar_export_enabled?: boolean },
): Promise<void> {
  const updates: string[] = [];
  const values: unknown[] = [];
  if (prefs.selected_calendar_ids !== undefined) {
    updates.push('selected_calendar_ids = ?');
    values.push(JSON.stringify(prefs.selected_calendar_ids));
  }
  if (prefs.calendar_export_enabled !== undefined) {
    updates.push('calendar_export_enabled = ?');
    values.push(prefs.calendar_export_enabled ? 1 : 0);
  }
  if (updates.length === 0) return;
  values.push(userId);
  await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
}

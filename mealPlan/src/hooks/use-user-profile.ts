import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@powersync/react-native';
import { supabase, getCachedUserId } from '@/services/supabase';
import type { UserProfileData } from '@/services/user-service';

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  theme_preference: string | null;
  onboarding_completed: number;
  notification_meal_reminders: number;
  notification_planning_nudges: number;
  notification_macro_checkins: number;
}

interface MacroGoalRow {
  macro_name: string;
  daily_target: number;
  unit: string;
  display_order: number;
  is_active: number;
}

export function useUserProfile() {
  const [userId, setUserId] = useState<string | null>(getCachedUserId() ?? null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const { data: userRows } = useQuery<UserRow>(
    'SELECT * FROM users WHERE id = ?',
    [userId ?? ''],
  );

  const { data: macroGoalRows } = useQuery<MacroGoalRow>(
    'SELECT * FROM macro_goals WHERE user_id = ? AND is_active = 1 ORDER BY display_order',
    [userId ?? ''],
  );

  const { data: dietRows } = useQuery<{ tag: string }>(
    'SELECT tag FROM dietary_preferences WHERE user_id = ?',
    [userId ?? ''],
  );

  const userRow = userRows[0];


  const profile = useMemo<UserProfileData | null>(() => {
    if (!userId || !userRow) return null;
    return {
      user: {
        id: userRow.id,
        email: userRow.email,
        display_name: userRow.display_name,
        theme_preference: (userRow.theme_preference as 'light' | 'dark' | null) ?? null,
        onboarding_completed: Boolean(userRow.onboarding_completed),
        notification_meal_reminders: Boolean(userRow.notification_meal_reminders),
        notification_planning_nudges: Boolean(userRow.notification_planning_nudges),
        notification_macro_checkins: Boolean(userRow.notification_macro_checkins),
      },
      macroGoals: macroGoalRows.map((g) => ({
        macro_name: g.macro_name,
        daily_target: g.daily_target,
        unit: g.unit,
        display_order: g.display_order,
        is_active: Boolean(g.is_active),
      })),
      dietaryPreferences: dietRows.map((d) => d.tag),
    };
  }, [userId, userRow, macroGoalRows, dietRows]);

  return {
    profile,
    loading: false,
    reload: useCallback(() => {}, []),
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { usePowerSync, useQuery } from '@powersync/react-native';

import { FontSizes, MaxContentWidth, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { updateNotificationSettings } from '@/services/user-service';
import { Toggle } from '@/components/ui/toggle';
import {
  register,
  schedulePlanningNudge,
  cancelPlanningNudge,
  scheduleMacroCheckIn,
  cancelMacroCheckIn,
  scheduleMacroAdjustmentReminder,
  cancelMacroAdjustmentReminder,
} from '@/services/notification-service';

interface NotificationState {
  mealReminders: boolean;
  planningNudges: boolean;
  macroCheckIns: boolean;
  macroAdjustment: boolean;
}

const NOTIFICATION_TYPES = [
  {
    key: 'mealReminders' as const,
    label: 'Meal reminders',
    description: 'Get notified when it\'s time to start cooking a planned meal.',
  },
  {
    key: 'planningNudges' as const,
    label: 'Planning nudges',
    description: 'Sunday evening reminder to plan meals for the week ahead.',
  },
  {
    key: 'macroCheckIns' as const,
    label: 'Macro check-ins',
    description: 'Daily summary of your macro progress at 9 PM.',
  },
  {
    key: 'macroAdjustment' as const,
    label: 'Macro adjustment reminders',
    description: 'Notified on your check-in day (7 days after setting goals) when your macros are ready to review.',
  },
] as const;

function nextCheckInDate(macroGoalSetAt: string | null): Date | null {
  if (!macroGoalSetAt) return null;
  const setAt = new Date(macroGoalSetAt);
  if (isNaN(setAt.getTime())) return null;
  const next = new Date(setAt);
  next.setDate(next.getDate() + 7);
  next.setHours(8, 0, 0, 0);
  return next;
}

export default function NotificationsScreen() {
  const db = usePowerSync();
  const theme = useTheme();
  const { profile } = useUserProfile();
  const [initialized, setInitialized] = useState(false);
  const [notifications, setNotifications] = useState<NotificationState>({
    mealReminders: false,
    planningNudges: false,
    macroCheckIns: false,
    macroAdjustment: false,
  });

  const { data: macroGoalDateRows } = useQuery<{ latest: string | null }>(
    'SELECT MAX(created_at) as latest FROM macro_goals WHERE user_id = ? AND is_active = 1',
    [profile?.user.id ?? ''],
  );

  // Always-current ref for the blur save so the cleanup captures latest state
  const notificationsRef = useRef(notifications);
  const profileRef = useRef(profile);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  // Initialize from DB once on first load
  useEffect(() => {
    if (!profile || initialized) return;
    setNotifications({
      mealReminders: profile.user.notification_meal_reminders,
      planningNudges: profile.user.notification_planning_nudges,
      macroCheckIns: profile.user.notification_macro_checkins,
      macroAdjustment: profile.user.notification_macro_adjustment,
    });
    setInitialized(true);
  }, [profile, initialized]);

  // Save to DB when the user navigates away
  useFocusEffect(
    useCallback(() => {
      return () => {
        const p = profileRef.current;
        const n = notificationsRef.current;
        if (!p) return;
        updateNotificationSettings(db, p.user.id, {
          notification_meal_reminders: n.mealReminders,
          notification_planning_nudges: n.planningNudges,
          notification_macro_checkins: n.macroCheckIns,
          notification_macro_adjustment: n.macroAdjustment,
        }).catch(console.error);
      };
    }, [db]),
  );

  const handleToggle = async (key: keyof NotificationState, next: boolean) => {
    if (next && Platform.OS !== 'web') {
      const granted = await register();
      if (!granted) return;
    }
    setNotifications((prev) => ({ ...prev, [key]: next }));

    // Schedule / cancel immediately so notification fires even before the user leaves
    if (key === 'planningNudges') { next ? schedulePlanningNudge() : cancelPlanningNudge(); }
    if (key === 'macroCheckIns') { next ? scheduleMacroCheckIn() : cancelMacroCheckIn(); }
    if (key === 'macroAdjustment') {
      if (next) {
        const checkIn = nextCheckInDate(macroGoalDateRows[0]?.latest ?? null);
        if (checkIn) scheduleMacroAdjustmentReminder(checkIn);
      } else {
        cancelMacroAdjustmentReminder();
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { maxWidth: MaxContentWidth }]}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Notifications</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Configure which notifications you want to receive. Each type is independent.
          </Text>

          <View style={[styles.list, { borderColor: theme.border }]}>
            {NOTIFICATION_TYPES.map(({ key, label, description }, index) => (
              <View
                key={key}
                style={[
                  styles.row,
                  { borderColor: theme.border },
                  index < NOTIFICATION_TYPES.length - 1 && styles.rowBorder,
                ]}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
                  <Text style={[styles.rowDescription, { color: theme.textSecondary }]}>{description}</Text>
                </View>
                <Toggle
                  value={notifications[key]}
                  onValueChange={(next) => handleToggle(key, next)}
                />
              </View>
            ))}
          </View>

          <Text style={[styles.note, { color: theme.textSecondary }]}>
            Meal reminders fire at the scheduled meal time. Notifications are not available on web.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  scrollContent: {
    padding: Spacing.lg,
    alignItems: 'center',
  } as ViewStyle,
  card: {
    width: '100%',
    gap: Spacing.md,
  } as ViewStyle,
  pageTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
  } as TextStyle,
  subtitle: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  } as TextStyle,
  list: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  } as ViewStyle,
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  rowText: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  rowLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  } as TextStyle,
  rowDescription: {
    fontSize: FontSizes.sm,
    lineHeight: 18,
  } as TextStyle,
  note: {
    fontSize: FontSizes.xs,
    lineHeight: 16,
    marginTop: Spacing.sm,
  } as TextStyle,
});

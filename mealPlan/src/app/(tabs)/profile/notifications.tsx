import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { usePowerSync } from '@powersync/react-native';

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
    description: 'Weekly Monday morning reminder when your calorie targets may need recalibration.',
  },
] as const;

export default function NotificationsScreen() {
  const db = usePowerSync();
  const theme = useTheme();
  const { profile, reload } = useUserProfile();
  const [notifications, setNotifications] = useState<NotificationState>({
    mealReminders: false,
    planningNudges: false,
    macroCheckIns: false,
    macroAdjustment: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setNotifications({
      mealReminders: profile.user.notification_meal_reminders,
      planningNudges: profile.user.notification_planning_nudges,
      macroCheckIns: profile.user.notification_macro_checkins,
      macroAdjustment: profile.user.notification_macro_adjustment,
    });
  }, [profile]);

  const handleToggle = async (key: keyof NotificationState, next: boolean) => {
    if (!profile || saving) return;
    setSaving(true);
    try {
      if (next && Platform.OS !== 'web') {
        const granted = await register();
        if (!granted) {
          setSaving(false);
          return;
        }
      }

      const updated = { ...notifications, [key]: next };
      setNotifications(updated);

      await updateNotificationSettings(db, profile.user.id, {
        notification_meal_reminders: updated.mealReminders,
        notification_planning_nudges: updated.planningNudges,
        notification_macro_checkins: updated.macroCheckIns,
        notification_macro_adjustment: updated.macroAdjustment,
      });

      if (key === 'planningNudges') {
        if (next) await schedulePlanningNudge();
        else await cancelPlanningNudge();
      }
      if (key === 'macroCheckIns') {
        if (next) await scheduleMacroCheckIn();
        else await cancelMacroCheckIn();
      }
      if (key === 'macroAdjustment') {
        if (next) await scheduleMacroAdjustmentReminder();
        else await cancelMacroAdjustmentReminder();
      }

      reload();
    } finally {
      setSaving(false);
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
                  disabled={saving}
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

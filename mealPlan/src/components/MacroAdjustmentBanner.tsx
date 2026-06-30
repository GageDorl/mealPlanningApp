import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { usePowerSync, useQuery } from '@powersync/react-native';

import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { surfaces } from '@/styles/surfaces';
import { parseWeightLogs, parseWeightGoal, dismissAdjustment } from '@/services/weight-log-service';
import {
  hasEnoughData,
  isDismissed,
  calculateActualTdee,
  buildMacroAdjustment,
  type DailyCalories,
} from '@/services/adaptive-macro-service';
import { updateMacroGoals } from '@/services/user-service';
import { scheduleMacroAdjustmentReminder, cancelMacroAdjustmentReminder } from '@/services/notification-service';
import type { GoalType } from '@/services/macro-planner-service';

interface Props {
  userId: string;
}

export function MacroAdjustmentBanner({ userId }: Props) {
  const db = usePowerSync();
  const theme = useTheme();
  const [applying, setApplying] = useState(false);

  const { data: userRows } = useQuery<{ weight_logs: string | null; weight_goal: string | null; notification_macro_adjustment: number }>(
    'SELECT weight_logs, weight_goal, notification_macro_adjustment FROM users WHERE id = ?',
    [userId],
  );

  const { data: calorieRows } = useQuery<{ date: string; calories: number }>(
    `SELECT date, COALESCE(SUM(calories), 0) as calories FROM (
       SELECT fl.date, fli.calories * fli.servings_eaten as calories
       FROM food_logs fl
       LEFT JOIN food_log_items fli ON fli.food_log_id = fl.id
       WHERE fl.user_id = ?
       UNION ALL
       SELECT ms.date, r.calories_per_serving * msr.servings_eaten as calories
       FROM meal_slots ms
       JOIN meal_slot_recipes msr ON msr.meal_slot_id = ms.id
       JOIN recipes r ON r.id = msr.recipe_id
       JOIN meal_plans mp ON mp.id = ms.meal_plan_id
       WHERE mp.user_id = ?
     ) combined
     GROUP BY date
     ORDER BY date DESC
     LIMIT 90`,
    [userId, userId],
  );

  const { data: macroGoalRows } = useQuery<{
    macro_name: string; daily_target: number; unit: string; display_order: number;
  }>(
    'SELECT macro_name, daily_target, unit, display_order FROM macro_goals WHERE user_id = ? AND is_active = 1 ORDER BY display_order',
    [userId],
  );

  const row = userRows[0];
  const weightLogs = useMemo(() => parseWeightLogs(row?.weight_logs), [row?.weight_logs]);
  const weightGoal = useMemo(() => parseWeightGoal(row?.weight_goal), [row?.weight_goal]);
  const dailyCalories = useMemo<DailyCalories[]>(() => calorieRows as DailyCalories[], [calorieRows]);

  const goalType = useMemo((): GoalType => {
    if (!weightGoal) return 'maintain';
    const sorted = [...weightLogs].sort((a, b) => b.date.localeCompare(a.date));
    const currentWeight = sorted[0]?.weight_lbs ?? weightGoal.baseline_weight_lbs;
    if (weightGoal.goal_weight_lbs < currentWeight * 0.98) return 'lose';
    if (weightGoal.goal_weight_lbs > currentWeight * 1.02) return 'gain';
    return 'maintain';
  }, [weightGoal, weightLogs]);

  const currentWeightLbs = useMemo(() => {
    const sorted = [...weightLogs].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0]?.weight_lbs ?? weightGoal?.baseline_weight_lbs ?? 150;
  }, [weightLogs, weightGoal]);

  const actualTdee = useMemo(
    () => calculateActualTdee(weightLogs, dailyCalories, new Set()),
    [weightLogs, dailyCalories],
  );

  const adjustment = useMemo(
    () => weightGoal && actualTdee > 0
      ? buildMacroAdjustment(actualTdee, weightGoal, currentWeightLbs, goalType)
      : null,
    [actualTdee, weightGoal, currentWeightLbs, goalType],
  );

  if (!weightGoal || isDismissed(weightGoal) || !hasEnoughData(weightLogs, dailyCalories) || !adjustment) {
    return null;
  }

  const rescheduleNotification = () => {
    if (!row?.notification_macro_adjustment) return;
    const next = new Date();
    next.setDate(next.getDate() + 7);
    next.setHours(8, 0, 0, 0);
    scheduleMacroAdjustmentReminder(next).catch(() => {});
  };

  const handleAccept = async () => {
    if (!adjustment) return;
    setApplying(true);
    try {
      const updatedGoals = macroGoalRows.map((g) => ({
        macro_name: g.macro_name,
        daily_target:
          g.macro_name === 'calories' ? adjustment.calories
          : g.macro_name === 'protein' ? adjustment.protein
          : g.macro_name === 'carbs' ? adjustment.carbs
          : g.macro_name === 'fat' ? adjustment.fat
          : g.daily_target,
        unit: g.unit,
        display_order: g.display_order,
        is_active: true,
      }));
      await updateMacroGoals(db, userId, updatedGoals);
      await dismissAdjustment(db, userId, weightGoal);
      rescheduleNotification();
    } catch {
      Alert.alert('Error', 'Failed to apply adjustment. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const handleDismiss = async () => {
    try {
      await dismissAdjustment(db, userId, weightGoal);
      rescheduleNotification();
    } catch {
      Alert.alert('Error', 'Failed to dismiss. Please try again.');
    }
  };

  const direction = adjustment.calories > (macroGoalRows.find((g) => g.macro_name === 'calories')?.daily_target ?? 0)
    ? 'up'
    : 'down';
  const currentCals = macroGoalRows.find((g) => g.macro_name === 'calories')?.daily_target ?? 0;
  const diff = Math.abs(adjustment.calories - currentCals);

  return (
    <View style={[styles.banner, { backgroundColor: theme.backgroundElement, borderColor: Colors.accent }]}>
      <View style={styles.left}>
        <View style={[surfaces.dot, { flexShrink: 0, backgroundColor: Colors.accent }]} />
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: theme.text }]}>Macro adjustment ready</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]} numberOfLines={2}>
            {`Calorie target ${direction === 'up' ? '+' : '-'}${diff} kcal based on your last ${weightLogs.length} weigh-ins.`}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          style={[styles.acceptBtn, { backgroundColor: Colors.accent }]}
          onPress={handleAccept}
          disabled={applying}
        >
          <Text style={styles.acceptText}>{applying ? '…' : 'Accept'}</Text>
        </Pressable>
        <Pressable onPress={handleDismiss} hitSlop={12}>
          <Text style={[styles.dismissText, { color: theme.textSecondary }]}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  } as ViewStyle,
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  textBlock: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  title: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
  body: {
    fontSize: FontSizes.xs,
    lineHeight: 16,
  } as TextStyle,
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexShrink: 0,
  } as ViewStyle,
  acceptBtn: {
    paddingVertical: 5,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  } as ViewStyle,
  acceptText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: '#fff',
  } as TextStyle,
  dismissText: {
    fontSize: FontSizes.sm,
  } as TextStyle,
});

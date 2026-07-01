import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { useQuery } from '@powersync/react-native';

import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { surfaces } from '@/styles/surfaces';
import { parseWeightLogs, parseWeightGoal } from '@/services/weight-log-service';
import {
  hasEnoughData,
  isDismissed,
  calculateActualTdee,
  buildMacroAdjustment,
  type DailyCalories,
} from '@/services/adaptive-macro-service';
import type { GoalType } from '@/services/macro-planner-service';

interface Props {
  userId: string;
  onPress: () => void;
}

export function MacroAdjustmentBanner({ userId, onPress }: Props) {
  const theme = useTheme();

  const { data: userRows } = useQuery<{ weight_logs: string | null; weight_goal: string | null }>(
    'SELECT weight_logs, weight_goal FROM users WHERE id = ?',
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

  const { data: macroGoalRows } = useQuery<{ macro_name: string; daily_target: number }>(
    'SELECT macro_name, daily_target FROM macro_goals WHERE user_id = ? AND is_active = 1',
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

  const currentCalories = macroGoalRows.find((g) => g.macro_name === 'calories')?.daily_target ?? 0;

  const adjustment = useMemo(
    () => weightGoal && actualTdee > 0
      ? buildMacroAdjustment(actualTdee, weightGoal, currentWeightLbs, goalType, currentCalories)
      : null,
    [actualTdee, weightGoal, currentWeightLbs, goalType, currentCalories],
  );

  if (!weightGoal || isDismissed(weightGoal) || !hasEnoughData(weightLogs, dailyCalories) || !adjustment) {
    return null;
  }

  const direction = adjustment.calories > currentCalories ? 'up' : 'down';
  const diff = Math.abs(adjustment.calories - currentCalories);

  return (
    <Pressable
      style={[styles.banner, { backgroundColor: theme.backgroundElement, borderColor: Colors.accent }]}
      onPress={onPress}
    >
      <View style={[surfaces.dot, { flexShrink: 0, backgroundColor: Colors.accent }]} />
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: theme.text }]}>Macro adjustment ready</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]} numberOfLines={2}>
          {`Calorie target ${direction === 'up' ? '+' : '-'}${diff} kcal based on your last ${weightLogs.length} weigh-ins. Tap to review.`}
        </Text>
      </View>
    </Pressable>
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
});

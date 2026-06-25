import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { usePowerSync, useQuery } from '@powersync/react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  parseWeightLogs,
  parseWeightGoal,
  dismissAdjustment,
} from '@/services/weight-log-service';
import {
  hasEnoughData,
  isDismissed,
  detectSuspiciousDays,
  calculateActualTdee,
  buildMacroAdjustment,
  type DailyCalories,
  type SuspiciousDay,
} from '@/services/adaptive-macro-service';
import { updateMacroGoals } from '@/services/user-service';
import type { GoalType } from '@/services/macro-planner-service';

interface Props {
  userId: string;
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function suspiciousReason(day: SuspiciousDay): string {
  const parts: string[] = [];
  if (day.reasons.includes('low_calories')) {
    parts.push(day.calories === 0 ? 'No food logged' : `Only ${Math.round(day.calories)} kcal logged`);
  }
  if (day.reasons.includes('unexpected_gain') && day.weightDeltaLbs !== null) {
    parts.push(`Weight +${day.weightDeltaLbs.toFixed(1)} lbs despite low intake`);
  }
  return parts.join(' · ');
}

export function MacroAdjustmentCard({ userId }: Props) {
  const db = usePowerSync();
  const theme = useTheme();
  const [excludedDates, setExcludedDates] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

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

  const suspiciousDays = useMemo(
    () => detectSuspiciousDays(weightLogs, dailyCalories),
    [weightLogs, dailyCalories],
  );

  const actualTdee = useMemo(
    () => calculateActualTdee(weightLogs, dailyCalories, excludedDates),
    [weightLogs, dailyCalories, excludedDates],
  );

  const adjustment = useMemo(
    () => weightGoal && actualTdee > 0
      ? buildMacroAdjustment(actualTdee, weightGoal, currentWeightLbs, goalType)
      : null,
    [actualTdee, weightGoal, currentWeightLbs, goalType],
  );

  if (!weightGoal || isDismissed(weightGoal) || !hasEnoughData(weightLogs, dailyCalories)) {
    return null;
  }

  if (!adjustment || actualTdee <= 0) return null;

  const toggleExclude = (date: string) => {
    setExcludedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  };

  const handleApply = async () => {
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
    } catch {
      Alert.alert('Error', 'Failed to apply macro adjustment.');
    } finally {
      setApplying(false);
    }
  };

  const handleDismiss = async () => {
    await dismissAdjustment(db, userId, weightGoal);
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.accentDot, { backgroundColor: Colors.accent }]} />
        <Text style={[styles.cardTitle, { color: theme.text }]}>Macro Adjustment Available</Text>
        <Pressable onPress={handleDismiss} hitSlop={12}>
          <Text style={[styles.dismissIcon, { color: theme.textSecondary }]}>✕</Text>
        </Pressable>
      </View>

      {/* Suspicious days */}
      {suspiciousDays.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            Some days may have incomplete logs. Tap to exclude from the calculation:
          </Text>
          {suspiciousDays.map((day) => {
            const excluded = excludedDates.has(day.date);
            return (
              <Pressable
                key={day.date}
                style={[
                  styles.suspiciousRow,
                  { borderColor: theme.border },
                  excluded && { opacity: 0.4 },
                ]}
                onPress={() => toggleExclude(day.date)}
              >
                <View style={styles.suspiciousLeft}>
                  <Text style={[styles.suspiciousDate, { color: theme.text }]}>
                    {formatDisplayDate(day.date)}
                  </Text>
                  <Text style={[styles.suspiciousReason, { color: theme.textSecondary }]}>
                    {suspiciousReason(day)}
                  </Text>
                </View>
                <View style={[
                  styles.excludeToggle,
                  { borderColor: excluded ? theme.border : Colors.accent },
                  !excluded && { backgroundColor: Colors.accent },
                ]}>
                  <Text style={[styles.excludeToggleText, { color: excluded ? theme.border : '#fff' }]}>
                    {excluded ? 'Excluded' : 'Include'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* TDEE insight */}
      <View style={[styles.section, styles.tdeeRow]}>
        <View style={styles.tdeeBlock}>
          <Text style={[styles.tdeeValue, { color: theme.text }]}>{actualTdee} kcal</Text>
          <Text style={[styles.tdeeLabel, { color: theme.textSecondary }]}>Est. daily burn</Text>
        </View>
        <Text style={[styles.tdeeSeparator, { color: theme.border }]}>→</Text>
        <View style={styles.tdeeBlock}>
          <Text style={[styles.tdeeValue, { color: Colors.accent }]}>{adjustment.calories} kcal</Text>
          <Text style={[styles.tdeeLabel, { color: theme.textSecondary }]}>New calorie goal</Text>
        </View>
      </View>

      {/* Macro breakdown */}
      <View style={[styles.section, styles.macroGrid]}>
        {[
          { label: 'Protein', current: macroGoalRows.find((g) => g.macro_name === 'protein')?.daily_target ?? 0, next: adjustment.protein, unit: 'g' },
          { label: 'Carbs', current: macroGoalRows.find((g) => g.macro_name === 'carbs')?.daily_target ?? 0, next: adjustment.carbs, unit: 'g' },
          { label: 'Fat', current: macroGoalRows.find((g) => g.macro_name === 'fat')?.daily_target ?? 0, next: adjustment.fat, unit: 'g' },
        ].map((m) => (
          <View key={m.label} style={[styles.macroCell, { backgroundColor: theme.backgroundSelected }]}>
            <Text style={[styles.macroCellLabel, { color: theme.textSecondary }]}>{m.label}</Text>
            <Text style={[styles.macroCellCurrent, { color: theme.textSecondary }]}>{m.current}{m.unit}</Text>
            <Text style={[styles.macroCellNext, { color: Colors.accent }]}>{m.next}{m.unit}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.dataNote, { color: theme.textSecondary }]}>
        Calculated from {weightLogs.length - excludedDates.size} weight logs · {excludedDates.size > 0 ? `${excludedDates.size} day${excludedDates.size > 1 ? 's' : ''} excluded` : 'no days excluded'}
      </Text>

      {/* Actions */}
      <Pressable
        style={[styles.applyButton, { backgroundColor: Colors.accent }, applying && styles.buttonDisabled]}
        onPress={handleApply}
        disabled={applying}
      >
        <Text style={styles.applyButtonText}>{applying ? 'Applying…' : 'Apply new targets'}</Text>
      </Pressable>
      <Pressable style={styles.dismissButton} onPress={handleDismiss}>
        <Text style={[styles.dismissButtonText, { color: theme.textSecondary }]}>Dismiss for 7 days</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  } as ViewStyle,
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  } as ViewStyle,
  accentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  } as ViewStyle,
  cardTitle: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,
  dismissIcon: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  section: {
    gap: Spacing.sm,
  } as ViewStyle,
  sectionLabel: {
    fontSize: FontSizes.xs,
    lineHeight: 16,
  } as TextStyle,
  suspiciousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    gap: Spacing.sm,
  } as ViewStyle,
  suspiciousLeft: {
    flex: 1,
    gap: 2,
  } as ViewStyle,
  suspiciousDate: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
  suspiciousReason: {
    fontSize: FontSizes.xs,
    lineHeight: 14,
  } as TextStyle,
  excludeToggle: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  } as ViewStyle,
  excludeToggleText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
  tdeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  } as ViewStyle,
  tdeeBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  } as ViewStyle,
  tdeeValue: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  } as TextStyle,
  tdeeLabel: {
    fontSize: FontSizes.xs,
  } as TextStyle,
  tdeeSeparator: {
    fontSize: FontSizes.lg,
    paddingHorizontal: Spacing.sm,
  } as TextStyle,
  macroGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  } as ViewStyle,
  macroCell: {
    flex: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 2,
  } as ViewStyle,
  macroCellLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
  macroCellCurrent: {
    fontSize: FontSizes.sm,
    textDecorationLine: 'line-through',
  } as TextStyle,
  macroCellNext: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  } as TextStyle,
  dataNote: {
    fontSize: FontSizes.xs,
    textAlign: 'center',
    marginTop: Spacing.xs,
  } as TextStyle,
  applyButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.xs,
  } as ViewStyle,
  applyButtonText: {
    color: '#fff',
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
  buttonDisabled: {
    opacity: 0.5,
  } as ViewStyle,
  dismissButton: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  } as ViewStyle,
  dismissButtonText: {
    fontSize: FontSizes.xs,
  } as TextStyle,
});

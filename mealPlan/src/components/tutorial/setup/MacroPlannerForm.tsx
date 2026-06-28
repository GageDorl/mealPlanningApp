import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ViewStyle, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@powersync/react-native';

import { Button } from '@/components/ui/button';
import { DatePickerModal } from '@/components/ui/date-picker-modal';
import { Colors, BorderRadius, FontSizes, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { ActivityLevel, GoalType } from '@/services/macro-planner-service';
import { parseWeightLogs, parseWeightGoal } from '@/services/weight-log-service';

export interface MacroPlannerSubmitParams {
  weight: string;
  goalType: GoalType;
  activityLevel: ActivityLevel;
  goalWeight?: string;
  goalDate?: string;
  existingBaselineWeight?: string;
  existingBaselineDate?: string;
  existingDismissedAt?: string;
}

interface Props {
  onSubmit: (params: MacroPlannerSubmitParams) => void;
}

const GOAL_OPTIONS: Array<{ label: string; value: GoalType }> = [
  { label: 'Lose weight', value: 'lose' },
  { label: 'Maintain weight', value: 'maintain' },
  { label: 'Gain muscle', value: 'gain' },
];

const ACTIVITY_OPTIONS: Array<{ label: string; value: ActivityLevel; description: string }> = [
  { label: 'Sedentary', value: 'sedentary', description: 'Little or no exercise' },
  { label: 'Light', value: 'light', description: '1–3 days/week' },
  { label: 'Moderate', value: 'moderate', description: '3–5 days/week' },
  { label: 'Active', value: 'active', description: '6–7 days/week' },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type GoalMode = 'direction' | 'specific';

function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatGoalDate(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function defaultGoalDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 56);
  return d;
}

export function MacroPlannerForm({ onSubmit }: Props) {
  const router = useRouter();
  const theme = useTheme();
  const { profile } = useUserProfile();

  const [weight, setWeight] = useState('170');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goalMode, setGoalMode] = useState<GoalMode>('direction');
  const [goalType, setGoalType] = useState<GoalType>('maintain');
  const [goalWeight, setGoalWeight] = useState('');
  const [goalDate, setGoalDate] = useState<Date>(defaultGoalDate);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { data: plannerRows } = useQuery<{
    weight_goal: string | null;
    weight_logs: string | null;
    planner_sex: string | null;
    planner_dob: string | null;
    planner_height_ft: number | null;
    planner_height_in: number | null;
    planner_activity_level: string | null;
  }>(
    'SELECT weight_goal, weight_logs, planner_sex, planner_dob, planner_height_ft, planner_height_in, planner_activity_level FROM users WHERE id = ?',
    [profile?.user.id ?? ''],
  );

  const plannerRow = plannerRows[0];

  const profileComplete = Boolean(
    plannerRow?.planner_sex &&
    plannerRow?.planner_dob &&
    plannerRow?.planner_height_ft != null &&
    plannerRow?.planner_height_in != null,
  );

  const existingGoal = useMemo(
    () => parseWeightGoal(plannerRow?.weight_goal),
    [plannerRow?.weight_goal],
  );

  const initUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!plannerRow || !profile?.user.id) return;
    if (initUserIdRef.current === profile.user.id) return;
    initUserIdRef.current = profile.user.id;
    if (plannerRow.planner_activity_level) setActivityLevel(plannerRow.planner_activity_level as ActivityLevel);
    const logs = parseWeightLogs(plannerRow.weight_logs);
    const latest = [...logs].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (latest) setWeight(String(latest.weight_lbs));
  }, [plannerRow, profile?.user.id]);

  useEffect(() => {
    if (!existingGoal?.goal_date) return;
    setGoalWeight(String(existingGoal.goal_weight_lbs));
    const [y, m, d] = existingGoal.goal_date.split('-').map(Number);
    if (y && m && d) setGoalDate(new Date(y, m - 1, d, 12, 0, 0));
    setGoalMode('specific');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingGoal?.goal_weight_lbs, existingGoal?.goal_date]);

  const weeklyRate = useMemo(() => {
    if (goalMode !== 'specific') return null;
    const gwn = Number(goalWeight);
    const wn = Number(weight);
    if (!gwn || !wn) return null;
    const daysRemaining = Math.max(1, Math.round((goalDate.getTime() - Date.now()) / 86_400_000));
    return (wn - gwn) / (daysRemaining / 7);
  }, [goalMode, goalWeight, weight, goalDate]);

  const rateWarning = useMemo(() => {
    if (weeklyRate === null) return null;
    const absRate = Math.abs(weeklyRate);
    if (absRate > 2) return `${absRate.toFixed(1)} lbs/week is aggressive — consider a longer timeframe.`;
    return null;
  }, [weeklyRate]);

  const handleSubmit = () => {
    const weightNum = Number(weight);
    if (Number.isNaN(weightNum) || weightNum < 80 || weightNum > 500) {
      Alert.alert('Invalid weight', 'Please enter a weight between 80 and 500 lbs.');
      return;
    }

    let effectiveGoalType: GoalType = goalType;
    let passGoalWeight: string | undefined;
    let passGoalDate: string | undefined;

    if (goalMode === 'specific') {
      const gwn = Number(goalWeight);
      if (!gwn || gwn < 50 || gwn > 500) {
        Alert.alert('Invalid target weight', 'Please enter a target weight between 50 and 500 lbs.');
        return;
      }
      const daysRemaining = Math.round((goalDate.getTime() - Date.now()) / 86_400_000);
      if (daysRemaining <= 0) {
        Alert.alert('Invalid date', 'Target date must be in the future.');
        return;
      }
      if (gwn < weightNum - 1) effectiveGoalType = 'lose';
      else if (gwn > weightNum + 1) effectiveGoalType = 'gain';
      else effectiveGoalType = 'maintain';
      passGoalWeight = String(gwn);
      passGoalDate = dateToStr(goalDate);
    }

    onSubmit({
      weight,
      goalType: effectiveGoalType,
      activityLevel,
      goalWeight: passGoalWeight,
      goalDate: passGoalDate,
      existingBaselineWeight: existingGoal?.baseline_weight_lbs != null ? String(existingGoal.baseline_weight_lbs) : undefined,
      existingBaselineDate: existingGoal?.baseline_date ?? undefined,
      existingDismissedAt: existingGoal?.last_dismissed_at ?? undefined,
    });
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!profileComplete && (
          <Pressable
            style={[styles.incompleteBanner, { backgroundColor: `${Colors.accent}18`, borderColor: Colors.accent }]}
            onPress={() => router.push('/(tabs)/profile/account')}
          >
            <Text style={[styles.incompleteBannerTitle, { color: Colors.accent }]}>Complete your profile first</Text>
            <Text style={[styles.incompleteBannerBody, { color: theme.textSecondary }]}>
              Add your height, birthday, and biological sex in Account settings so we can calculate accurate recommendations.
            </Text>
            <Text style={[styles.incompleteBannerLink, { color: Colors.accent }]}>Go to Account settings →</Text>
          </Pressable>
        )}

        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>CURRENT WEIGHT</Text>
        <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Weight</Text>
            <View style={styles.rowRight}>
              <TextInput
                style={[styles.inlineInput, { color: theme.text }]}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                textAlign="right"
                placeholderTextColor={theme.textSecondary}
                placeholder="170"
              />
              <Text style={[styles.unit, { color: theme.textSecondary }]}>lbs</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>GOAL</Text>
        <View style={[styles.modeToggle, { backgroundColor: theme.backgroundElement }]}>
          <Pressable
            style={[styles.modeBtn, goalMode === 'direction' && { backgroundColor: Colors.accent }]}
            onPress={() => setGoalMode('direction')}
          >
            <Text style={[styles.modeBtnText, { color: goalMode === 'direction' ? '#fff' : theme.textSecondary }]}>
              General
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeBtn, goalMode === 'specific' && { backgroundColor: Colors.accent }]}
            onPress={() => setGoalMode('specific')}
          >
            <Text style={[styles.modeBtnText, { color: goalMode === 'specific' ? '#fff' : theme.textSecondary }]}>
              Specific target
            </Text>
          </Pressable>
        </View>

        {goalMode === 'direction' && (
          <View style={[styles.chipRow, { marginTop: 10 }]}>
            {GOAL_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.chip, {
                  borderColor: goalType === opt.value ? Colors.accent : theme.border,
                  backgroundColor: goalType === opt.value ? Colors.accent : theme.backgroundElement,
                }]}
                onPress={() => setGoalType(opt.value)}
              >
                <Text style={[styles.chipText, { color: goalType === opt.value ? '#fff' : theme.text }]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {goalMode === 'specific' && (
          <>
            {existingGoal && (
              <View style={[styles.activeBadge, { backgroundColor: theme.backgroundElement, marginTop: 10 }]}>
                <Text style={[styles.activeBadgeText, { color: Colors.accent }]}>
                  Active target: {existingGoal.goal_weight_lbs} lbs by {existingGoal.goal_date}
                </Text>
              </View>
            )}
            <View style={[styles.group, { backgroundColor: theme.backgroundElement, marginTop: 10 }]}>
              <View style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}>
                <Text style={[styles.rowLabel, { color: theme.text }]}>Target weight</Text>
                <View style={styles.rowRight}>
                  <TextInput
                    style={[styles.inlineInput, { color: theme.text }]}
                    value={goalWeight}
                    onChangeText={setGoalWeight}
                    keyboardType="decimal-pad"
                    textAlign="right"
                    placeholderTextColor={theme.textSecondary}
                    placeholder="150"
                  />
                  <Text style={[styles.unit, { color: theme.textSecondary }]}>lbs</Text>
                </View>
              </View>
              <Pressable style={styles.row} onPress={() => setShowDatePicker(true)}>
                <Text style={[styles.rowLabel, { color: theme.text }]}>Target date</Text>
                <View style={styles.rowRight}>
                  <Text style={[styles.dateValue, { color: theme.text }]}>{formatGoalDate(goalDate)}</Text>
                  <Text style={[styles.chevron, { color: Colors.accent }]}>›</Text>
                </View>
              </Pressable>
            </View>
            {weeklyRate !== null && (
              <Text style={[styles.rateNote, { color: rateWarning ? theme.error : theme.textSecondary }]}>
                {Math.abs(weeklyRate) < 0.05
                  ? 'This pace maintains your current weight.'
                  : `${Math.abs(weeklyRate).toFixed(2)} lbs/week ${weeklyRate > 0 ? 'lost' : 'gained'}`}
                {rateWarning ? `  ⚠ ${rateWarning}` : ''}
              </Text>
            )}
          </>
        )}

        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>ACTIVITY LEVEL</Text>
        <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
          {ACTIVITY_OPTIONS.map((opt, i) => (
            <Pressable
              key={opt.value}
              style={[
                styles.activityRow,
                i < ACTIVITY_OPTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
                activityLevel === opt.value && { backgroundColor: `${Colors.accent}14` },
              ]}
              onPress={() => setActivityLevel(opt.value)}
            >
              <View style={styles.activityLeft}>
                <Text style={[styles.activityLabel, { color: theme.text }]}>{opt.label}</Text>
                <Text style={[styles.activityDesc, { color: theme.textSecondary }]}>{opt.description}</Text>
              </View>
              {activityLevel === opt.value && (
                <View style={[styles.checkDot, { backgroundColor: Colors.accent }]} />
              )}
            </Pressable>
          ))}
        </View>

        <View style={[styles.buttonGroup, { marginTop: 24, marginBottom: 32 }]}>
          <Button
            label="Get Recommendation →"
            onPress={handleSubmit}
            disabled={!profileComplete}
          />
        </View>
      </ScrollView>

      <DatePickerModal
        visible={showDatePicker}
        currentDate={goalDate}
        onSelect={setGoalDate}
        onClose={() => setShowDatePicker(false)}
        allowFuture
      />
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 } as ViewStyle,
  incompleteBanner: { borderRadius: BorderRadius.md, borderWidth: 1, padding: 14, marginBottom: 12, gap: 4 } as ViewStyle,
  incompleteBannerTitle: { fontSize: 14, fontWeight: '700' } as TextStyle,
  incompleteBannerBody: { fontSize: 13, lineHeight: 18 } as TextStyle,
  incompleteBannerLink: { fontSize: 13, fontWeight: '600', marginTop: 4 } as TextStyle,
  sectionHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 16, marginBottom: 8 } as TextStyle,
  modeToggle: { flexDirection: 'row', borderRadius: BorderRadius.md, padding: 3, gap: 3 } as ViewStyle,
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: BorderRadius.sm, alignItems: 'center' } as ViewStyle,
  modeBtnText: { fontSize: 13, fontWeight: '600' } as TextStyle,
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as ViewStyle,
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: BorderRadius.full, borderWidth: 1 } as ViewStyle,
  chipText: { fontSize: 13, fontWeight: '600' } as TextStyle,
  group: { borderRadius: BorderRadius.md, overflow: 'hidden' } as ViewStyle,
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, minHeight: 48 } as ViewStyle,
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' } as TextStyle,
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 } as ViewStyle,
  inlineInput: { fontSize: 15, minWidth: 48, maxWidth: 80, paddingVertical: 2, paddingHorizontal: 2 } as TextStyle,
  unit: { fontSize: 13, fontWeight: '500', minWidth: 20 } as TextStyle,
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, minHeight: 56 } as ViewStyle,
  activityLeft: { flex: 1, gap: 2 } as ViewStyle,
  activityLabel: { fontSize: 15, fontWeight: '500' } as TextStyle,
  activityDesc: { fontSize: 12 } as TextStyle,
  checkDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 } as ViewStyle,
  activeBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 12, paddingVertical: 8 } as ViewStyle,
  activeBadgeText: { fontSize: 13, fontWeight: '600' } as TextStyle,
  dateValue: { fontSize: 15 } as TextStyle,
  chevron: { fontSize: 20, fontWeight: '300', marginLeft: 4 } as TextStyle,
  rateNote: { fontSize: 12, marginTop: 6, lineHeight: 16 } as TextStyle,
  buttonGroup: { gap: 8 } as ViewStyle,
});

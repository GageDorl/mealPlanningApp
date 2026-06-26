import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ViewStyle, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { usePowerSync, useQuery } from '@powersync/react-native';

import { Button } from '@/components/ui/button';
import { DatePickerModal } from '@/components/ui/date-picker-modal';
import { DefaultMacros, type MacroDefinition } from '@/constants/macros';
import { Colors, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { updateMacroGoals, updatePlannerProfile } from '@/services/user-service';
import {
  ActivityLevel,
  GoalType,
  Sex,
  recommendMacroPlan,
  type MacroPlannerInput,
  type MacroRecommendation,
} from '@/services/macro-planner-service';
import {
  parseWeightLogs,
  parseWeightGoal,
  setWeightGoal as saveWeightGoal,
  clearWeightGoal,
  type WeightGoal,
} from '@/services/weight-log-service';

const GOAL_OPTIONS: Array<{ label: string; value: GoalType }> = [
  { label: 'Lose weight', value: 'lose' },
  { label: 'Maintain weight', value: 'maintain' },
  { label: 'Gain muscle', value: 'gain' },
];

const ACTIVITY_OPTIONS: Array<{ label: string; value: ActivityLevel }> = [
  { label: 'Sedentary', value: 'sedentary' },
  { label: 'Light', value: 'light' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Active', value: 'active' },
];

const SEX_OPTIONS: Array<{ label: string; value: Sex }> = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Prefer not to say', value: 'other' },
];

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatGoalDate(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function defaultGoalDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 56); // 8 weeks out as a sensible starting point
  return d;
}

export default function MacroPlannerScreen() {
  const db = usePowerSync();
  const router = useRouter();
  const theme = useTheme();
  const { profile, loading } = useUserProfile();

  // — Body stats —
  const [weight, setWeight] = useState('170');
  const [heightFt, setHeightFt] = useState('5');
  const [heightIn, setHeightIn] = useState('10');
  const [age, setAge] = useState('30');
  const [sex, setSex] = useState<Sex>('other');
  const [goalType, setGoalType] = useState<GoalType>('maintain');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');

  // — Manual macro goal inputs —
  const [goals, setGoals] = useState<MacroDefinition[]>(DefaultMacros);
  const [goalInputs, setGoalInputs] = useState<string[]>(DefaultMacros.map((m) => String(m.defaultGoal)));
  const [initialGoals, setInitialGoals] = useState<MacroDefinition[]>(DefaultMacros);

  // — Weight goal inputs —
  const [goalWeight, setGoalWeight] = useState('');
  const [goalDate, setGoalDate] = useState<Date>(defaultGoalDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [goalSaving, setGoalSaving] = useState(false);

  // — Save state —
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load macro goals from profile
  useEffect(() => {
    if (!profile) return;
    const synced = DefaultMacros.map((macro) => {
      const match = profile.macroGoals.find((item) => item.macro_name === macro.key);
      return { ...macro, defaultGoal: match ? Number(match.daily_target) : macro.defaultGoal };
    });
    setGoals(synced);
    setGoalInputs(synced.map((m) => String(m.defaultGoal)));
    setInitialGoals(synced);
  }, [profile]);

  // Load planner profile + goal + weight logs from PowerSync
  const { data: plannerRows } = useQuery<{
    weight_goal: string | null;
    weight_logs: string | null;
    planner_sex: string | null;
    planner_age: number | null;
    planner_height_ft: number | null;
    planner_height_in: number | null;
    planner_activity_level: string | null;
  }>(
    'SELECT weight_goal, weight_logs, planner_sex, planner_age, planner_height_ft, planner_height_in, planner_activity_level FROM users WHERE id = ?',
    [profile?.user.id ?? ''],
  );

  const plannerRow = plannerRows[0];

  const existingGoal = useMemo(
    () => parseWeightGoal(plannerRow?.weight_goal),
    [plannerRow?.weight_goal],
  );

  // Initialize planner fields from DB once per user session
  const initUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!plannerRow || !profile?.user.id) return;
    if (initUserIdRef.current === profile.user.id) return;
    initUserIdRef.current = profile.user.id;

    if (plannerRow.planner_sex) setSex(plannerRow.planner_sex as Sex);
    if (plannerRow.planner_age) setAge(String(plannerRow.planner_age));
    if (plannerRow.planner_height_ft != null) setHeightFt(String(plannerRow.planner_height_ft));
    if (plannerRow.planner_height_in != null) setHeightIn(String(plannerRow.planner_height_in));
    if (plannerRow.planner_activity_level) setActivityLevel(plannerRow.planner_activity_level as ActivityLevel);

    const logs = parseWeightLogs(plannerRow.weight_logs);
    const latest = [...logs].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (latest) setWeight(String(latest.weight_lbs));
  }, [plannerRow, profile?.user.id]);

  // Populate weight goal fields when an existing goal is loaded
  useEffect(() => {
    if (!existingGoal?.goal_date) return;
    setGoalWeight(String(existingGoal.goal_weight_lbs));
    const [y, m, d] = existingGoal.goal_date.split('-').map(Number);
    if (y && m && d) setGoalDate(new Date(y, m - 1, d, 12, 0, 0));
  // Only re-run when the stored goal values themselves change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingGoal?.goal_weight_lbs, existingGoal?.goal_date]);

  // Computed weekly rate toward goal
  const weeklyRate = useMemo(() => {
    const gwn = Number(goalWeight);
    const wn = Number(weight);
    if (!gwn || !wn) return null;
    const daysRemaining = Math.max(1, Math.round(
      (goalDate.getTime() - Date.now()) / 86_400_000,
    ));
    return (wn - gwn) / (daysRemaining / 7);
  }, [goalWeight, weight, goalDate]);

  const rateWarning = useMemo(() => {
    if (weeklyRate === null) return null;
    const absRate = Math.abs(weeklyRate);
    if (absRate > 2) return `${absRate.toFixed(1)} lbs/week is aggressive — consider a longer timeframe.`;
    if (goalType === 'lose' && weeklyRate < 0) return 'Goal weight is above your current weight for a loss goal.';
    if (goalType === 'gain' && weeklyRate > 0) return 'Goal weight is below your current weight for a gain goal.';
    return null;
  }, [weeklyRate, goalType]);

  const restoreCurrentGoals = () => {
    setGoals(initialGoals);
    setGoalInputs(initialGoals.map((m) => String(m.defaultGoal)));
    setSaveError(null);
  };

  const validateInputs = () => {
    const weightValue = Number(weight);
    if (Number.isNaN(weightValue) || weightValue < 80 || weightValue > 500) {
      return 'Please enter a weight between 80 and 500 lbs.';
    }
    const ftValue = Number(heightFt);
    const inValue = Number(heightIn);
    if (Number.isNaN(ftValue) || Number.isNaN(inValue) || inValue < 0 || inValue > 11) {
      return 'Please enter a valid height (feet 3–7, inches 0–11).';
    }
    const totalInches = ftValue * 12 + inValue;
    if (totalInches < 48 || totalInches > 90) {
      return 'Please enter a height between 4\'0" and 7\'6".';
    }
    const ageValue = Number(age);
    if (Number.isNaN(ageValue) || ageValue < 18 || ageValue > 100) {
      return 'Please enter an age between 18 and 100.';
    }
    const invalidMacro = goals.find((macro) => Number.isNaN(Number(macro.defaultGoal)) || macro.defaultGoal <= 0);
    if (invalidMacro) {
      return `Please enter a valid daily target for ${invalidMacro.label}.`;
    }
    return null;
  };

  const goalDateStr = useMemo(() => dateToStr(goalDate), [goalDate]);

  const inputPayload: MacroPlannerInput = useMemo(() => {
    const gwn = Number(goalWeight);
    const hasGoal = gwn >= 50 && gwn <= 500 && goalDateStr !== null;
    return {
      weightLbs: clampNumber(Number(weight), 80, 500),
      heightIn: clampNumber(Number(heightFt) * 12 + Number(heightIn), 48, 90),
      age: clampNumber(Number(age), 18, 100),
      sex,
      goalType,
      activityLevel,
      dietaryTags: profile?.dietaryPreferences ?? [],
      ...(hasGoal && { goalWeightLbs: gwn, goalDate: goalDateStr! }),
    };
  }, [weight, heightFt, heightIn, age, sex, goalType, activityLevel, profile?.dietaryPreferences, goalWeight, goalDateStr]);

  const recommendation: MacroRecommendation = useMemo(
    () => recommendMacroPlan(inputPayload),
    [inputPayload],
  );

  const applyRecommendationToGoals = () => {
    const updated = goals.map((item) => {
      if (item.key === 'calories') return { ...item, defaultGoal: recommendation.calories };
      if (item.key === 'protein') return { ...item, defaultGoal: recommendation.protein };
      if (item.key === 'carbs') return { ...item, defaultGoal: recommendation.carbs };
      if (item.key === 'fat') return { ...item, defaultGoal: recommendation.fat };
      return item;
    });
    setGoals(updated);
    setGoalInputs(updated.map((m) => String(m.defaultGoal)));
  };

  const updateGoal = (index: number, value: string) => {
    setGoalInputs((prev) => prev.map((v, idx) => (idx === index ? value : v)));
    const amount = Number(value);
    if (value !== '' && !Number.isNaN(amount) && amount > 0) {
      setGoals((prev) => prev.map((item, idx) => (
        idx === index ? { ...item, defaultGoal: amount } : item
      )));
    }
  };

  const handleSetGoal = async () => {
    if (!profile) return;
    const gwn = Number(goalWeight);
    if (!gwn || gwn < 50 || gwn > 500) {
      Alert.alert('Invalid goal weight', 'Please enter a goal weight between 50 and 500 lbs.');
      return;
    }
    const daysRemaining = Math.round((goalDate.getTime() - Date.now()) / 86_400_000);
    if (daysRemaining <= 0) {
      Alert.alert('Invalid date', 'Goal date must be in the future.');
      return;
    }
    setGoalSaving(true);
    try {
      const today = dateToStr(new Date());
      const goal: WeightGoal = {
        goal_weight_lbs: gwn,
        goal_date: dateToStr(goalDate),
        baseline_weight_lbs: existingGoal?.baseline_weight_lbs ?? (Number(weight) || gwn),
        baseline_date: existingGoal?.baseline_date ?? today,
        last_dismissed_at: existingGoal?.last_dismissed_at,
      };
      await saveWeightGoal(db, profile.user.id, goal);
      Alert.alert('Goal saved', 'Your weight goal has been set.');
    } catch {
      Alert.alert('Error', 'Failed to save weight goal.');
    } finally {
      setGoalSaving(false);
    }
  };

  const handleClearGoal = () => {
    if (!profile) return;
    Alert.alert('Clear goal', 'Remove your active weight goal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearWeightGoal(db, profile.user.id);
          setGoalWeight('');
          setGoalDate(defaultGoalDate());
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!profile) {
      setSaveError('Profile not loaded. Please sign out and sign in again.');
      return;
    }
    const validationError = validateInputs();
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      await Promise.all([
        updateMacroGoals(db, profile.user.id, goals.map((goal, index) => ({
          macro_name: goal.key,
          daily_target: goal.defaultGoal,
          unit: goal.unit,
          display_order: index,
          is_active: true,
        }))),
        updatePlannerProfile(db, profile.user.id, {
          sex,
          age: Number(age),
          height_ft: Number(heightFt),
          height_in: Number(heightIn),
          activity_level: activityLevel,
        }),
      ]);
      Alert.alert('Saved', 'Your macro goals have been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save macro goals.';
      setSaveError(message);
      Alert.alert('Save failed', message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.statusText, { color: theme.textSecondary }]}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.pageTitle, { color: theme.text }]}>Macro Planner</Text>

        {/* ── About you ── */}
        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>ABOUT YOU</Text>
        <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}>
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
          <View style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Height</Text>
            <View style={styles.rowRight}>
              <TextInput style={[styles.inlineInput, { color: theme.text }]} value={heightFt} onChangeText={setHeightFt} keyboardType="number-pad" textAlign="right" placeholderTextColor={theme.textSecondary} placeholder="5" />
              <Text style={[styles.unit, { color: theme.textSecondary }]}>ft</Text>
              <TextInput style={[styles.inlineInput, { color: theme.text }]} value={heightIn} onChangeText={setHeightIn} keyboardType="number-pad" textAlign="right" placeholderTextColor={theme.textSecondary} placeholder="10" />
              <Text style={[styles.unit, { color: theme.textSecondary }]}>in</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Age</Text>
            <View style={styles.rowRight}>
              <TextInput style={[styles.inlineInput, { color: theme.text }]} value={age} onChangeText={setAge} keyboardType="number-pad" textAlign="right" placeholderTextColor={theme.textSecondary} placeholder="30" />
              <Text style={[styles.unit, { color: theme.textSecondary }]}>yrs</Text>
            </View>
          </View>
        </View>

        {/* ── Sex ── */}
        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>BIOLOGICAL SEX</Text>
        <View style={styles.chipRow}>
          {SEX_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.chip, { borderColor: sex === opt.value ? Colors.accent : theme.border, backgroundColor: sex === opt.value ? Colors.accent : theme.backgroundElement }]}
              onPress={() => setSex(opt.value)}
            >
              <Text style={[styles.chipText, { color: sex === opt.value ? '#fff' : theme.text }]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Goal ── */}
        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>GOAL</Text>
        <View style={styles.chipRow}>
          {GOAL_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.chip, { borderColor: goalType === opt.value ? Colors.accent : theme.border, backgroundColor: goalType === opt.value ? Colors.accent : theme.backgroundElement }]}
              onPress={() => setGoalType(opt.value)}
            >
              <Text style={[styles.chipText, { color: goalType === opt.value ? '#fff' : theme.text }]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Activity ── */}
        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>ACTIVITY LEVEL</Text>
        <View style={styles.chipRow}>
          {ACTIVITY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.chip, { borderColor: activityLevel === opt.value ? Colors.accent : theme.border, backgroundColor: activityLevel === opt.value ? Colors.accent : theme.backgroundElement }]}
              onPress={() => setActivityLevel(opt.value)}
            >
              <Text style={[styles.chipText, { color: activityLevel === opt.value ? '#fff' : theme.text }]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Weight goal ── */}
        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>WEIGHT GOAL (OPTIONAL)</Text>
        {existingGoal && (
          <View style={[styles.activeBadge, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.activeBadgeText, { color: Colors.accent }]}>
              Active: {existingGoal.goal_weight_lbs} lbs by {existingGoal.goal_date}
            </Text>
          </View>
        )}
        <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Goal weight</Text>
            <View style={styles.rowRight}>
              <TextInput
                style={[styles.inlineInput, { color: theme.text }]}
                value={goalWeight}
                onChangeText={setGoalWeight}
                keyboardType="decimal-pad"
                textAlign="right"
                placeholderTextColor={theme.textSecondary}
                placeholder="lbs"
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
        <View style={styles.buttonGroup}>
          <Button label={goalSaving ? 'Saving…' : 'Set weight goal'} onPress={handleSetGoal} disabled={goalSaving || !goalWeight} />
          {existingGoal && <Button label="Clear goal" variant="secondary" onPress={handleClearGoal} />}
        </View>

        {/* ── Recommended targets ── */}
        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>RECOMMENDED TARGETS</Text>
        <View style={[styles.recCard, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.recCalories, { color: theme.text }]}>{recommendation.caloriesLabel}</Text>
          <View style={styles.recMacroRow}>
            <Text style={[styles.recMacro, { color: theme.text }]}>{recommendation.protein}g protein</Text>
            <Text style={[styles.recMacro, { color: theme.text }]}>{recommendation.carbs}g carbs</Text>
            <Text style={[styles.recMacro, { color: theme.text }]}>{recommendation.fat}g fat</Text>
          </View>
          <Text style={[styles.recNote, { color: theme.textSecondary }]}>{recommendation.mealPattern}</Text>
          <View style={styles.buttonGroup}>
            <Button label="Apply recommended targets" onPress={applyRecommendationToGoals} variant="secondary" />
            <Button label="Reset to current goals" onPress={restoreCurrentGoals} variant="secondary" />
          </View>
        </View>

        {/* ── Macro goals ── */}
        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>MACRO GOALS</Text>
        <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
          {goals.map((macro, index) => (
            <View
              key={macro.key}
              style={[styles.row, index < goals.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}
            >
              <Text style={[styles.rowLabel, { color: theme.text }]}>{macro.label}</Text>
              <View style={styles.rowRight}>
                <TextInput
                  style={[styles.inlineInput, { color: theme.text }]}
                  value={goalInputs[index]}
                  onChangeText={(v) => updateGoal(index, v)}
                  keyboardType="numeric"
                  textAlign="right"
                  placeholderTextColor={theme.textSecondary}
                />
                <Text style={[styles.unit, { color: theme.textSecondary }]}>{macro.unit}</Text>
              </View>
            </View>
          ))}
        </View>

        {saveError ? <Text style={[styles.errorText, { color: theme.error }]}>{saveError}</Text> : null}

        <View style={[styles.buttonGroup, { marginTop: 8 }]}>
          <Button label={saving ? 'Saving…' : 'Save macro goals'} onPress={handleSave} disabled={saving} />
          <Button label="Back to Profile" variant="secondary" onPress={() => router.back()} />
        </View>
      </ScrollView>

      <DatePickerModal
        visible={showDatePicker}
        currentDate={goalDate}
        onSelect={setGoalDate}
        onClose={() => setShowDatePicker(false)}
        allowFuture
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
  } as ViewStyle,
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  } as TextStyle,
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
  } as TextStyle,
  group: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  } as ViewStyle,
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  } as TextStyle,
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  inlineInput: {
    fontSize: 15,
    minWidth: 48,
    maxWidth: 80,
    paddingVertical: 2,
    paddingHorizontal: 2,
  } as TextStyle,
  unit: {
    fontSize: 13,
    fontWeight: '500',
    minWidth: 20,
  } as TextStyle,
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  } as ViewStyle,
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  } as ViewStyle,
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  } as TextStyle,
  activeBadge: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  } as ViewStyle,
  activeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  } as TextStyle,
  dateValue: {
    fontSize: 15,
  } as TextStyle,
  chevron: {
    fontSize: 20,
    fontWeight: '300',
    marginLeft: 4,
  } as TextStyle,
  rateNote: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  } as TextStyle,
  buttonGroup: {
    gap: 8,
    marginTop: 12,
  } as ViewStyle,
  recCard: {
    borderRadius: BorderRadius.md,
    padding: 14,
    gap: 8,
  } as ViewStyle,
  recCalories: {
    fontSize: 16,
    fontWeight: '700',
  } as TextStyle,
  recMacroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  } as ViewStyle,
  recMacro: {
    fontSize: 14,
    fontWeight: '500',
  } as TextStyle,
  recNote: {
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
  } as TextStyle,
  statusText: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 15,
    fontWeight: '500',
  } as TextStyle,
});

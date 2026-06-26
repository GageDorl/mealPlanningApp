import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ViewStyle, type TextStyle } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePowerSync, useQuery } from '@powersync/react-native';

import { Button } from '@/components/ui/button';
import { DefaultMacros, type MacroDefinition } from '@/constants/macros';
import { Colors, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { updateMacroGoals, updatePlannerProfile } from '@/services/user-service';
import {
  recommendMacroPlan,
  type ActivityLevel,
  type GoalType,
  type Sex,
} from '@/services/macro-planner-service';
import {
  setWeightGoal as saveWeightGoal,
  clearWeightGoal,
  type WeightGoal,
} from '@/services/weight-log-service';

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return Math.max(18, Math.min(100, age));
}

function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function MacroRecommendationScreen() {
  const db = usePowerSync();
  const router = useRouter();
  const theme = useTheme();
  const { profile } = useUserProfile();

  const params = useLocalSearchParams<{
    weight: string;
    goalType: string;
    activityLevel: string;
    goalWeight?: string;
    goalDate?: string;
    existingBaselineWeight?: string;
    existingBaselineDate?: string;
    existingDismissedAt?: string;
  }>();

  const { data: bodyRows } = useQuery<{
    planner_sex: string | null;
    planner_dob: string | null;
    planner_height_ft: number | null;
    planner_height_in: number | null;
  }>(
    'SELECT planner_sex, planner_dob, planner_height_ft, planner_height_in FROM users WHERE id = ?',
    [profile?.user.id ?? ''],
  );

  const bodyRow = bodyRows[0];

  const recommendation = useMemo(() => {
    if (!bodyRow?.planner_dob || bodyRow.planner_height_ft == null) return null;
    const age = calculateAge(bodyRow.planner_dob);
    const heightIn = (bodyRow.planner_height_ft ?? 0) * 12 + (bodyRow.planner_height_in ?? 0);
    const weightLbs = Math.max(80, Math.min(500, Number(params.weight) || 170));
    const gwn = params.goalWeight ? Number(params.goalWeight) : undefined;
    const hasGoal = gwn != null && gwn >= 50 && gwn <= 500 && !!params.goalDate;

    return recommendMacroPlan({
      weightLbs,
      heightIn: Math.max(48, Math.min(90, heightIn)),
      age,
      sex: (bodyRow.planner_sex ?? 'other') as Sex,
      goalType: (params.goalType ?? 'maintain') as GoalType,
      activityLevel: (params.activityLevel ?? 'moderate') as ActivityLevel,
      dietaryTags: profile?.dietaryPreferences ?? [],
      ...(hasGoal && { goalWeightLbs: gwn!, goalDate: params.goalDate! }),
    });
  }, [bodyRow, params, profile?.dietaryPreferences]);

  const [goals, setGoals] = useState<MacroDefinition[]>(() =>
    DefaultMacros.map((m) => ({ ...m })),
  );
  const [goalInputs, setGoalInputs] = useState<string[]>(() =>
    DefaultMacros.map((m) => String(m.defaultGoal)),
  );
  const [appliedRec, setAppliedRec] = useState(false);
  const [saving, setSaving] = useState(false);

  const applyRecommendation = () => {
    if (!recommendation) return;
    const updated = goals.map((item) => {
      if (item.key === 'calories') return { ...item, defaultGoal: recommendation.calories };
      if (item.key === 'protein') return { ...item, defaultGoal: recommendation.protein };
      if (item.key === 'carbs') return { ...item, defaultGoal: recommendation.carbs };
      if (item.key === 'fat') return { ...item, defaultGoal: recommendation.fat };
      return item;
    });
    setGoals(updated);
    setGoalInputs(updated.map((m) => String(m.defaultGoal)));
    setAppliedRec(true);
  };

  const updateGoal = (index: number, value: string) => {
    setGoalInputs((prev) => prev.map((v, idx) => (idx === index ? value : v)));
    const amount = Number(value);
    if (value !== '' && !Number.isNaN(amount) && amount > 0) {
      setGoals((prev) => prev.map((item, idx) =>
        idx === index ? { ...item, defaultGoal: amount } : item,
      ));
    }
  };

  const handleApply = async () => {
    if (!profile) return;
    const invalidMacro = goals.find((m) => Number.isNaN(Number(m.defaultGoal)) || m.defaultGoal <= 0);
    if (invalidMacro) {
      Alert.alert('Invalid value', `Please enter a valid target for ${invalidMacro.label}.`);
      return;
    }

    setSaving(true);
    try {
      const tasks: Promise<void>[] = [
        updateMacroGoals(db, profile.user.id, goals.map((goal, index) => ({
          macro_name: goal.key,
          daily_target: goal.defaultGoal,
          unit: goal.unit,
          display_order: index,
          is_active: true,
        }))),
        updatePlannerProfile(db, profile.user.id, {
          activity_level: params.activityLevel ?? 'moderate',
        }),
      ];

      const gwn = params.goalWeight ? Number(params.goalWeight) : undefined;
      const hasGoal = gwn != null && gwn >= 50 && !!params.goalDate;
      if (hasGoal) {
        const today = dateToStr(new Date());
        const existingBaseline = params.existingBaselineWeight ? Number(params.existingBaselineWeight) : undefined;
        const goal: WeightGoal = {
          goal_weight_lbs: gwn!,
          goal_date: params.goalDate!,
          baseline_weight_lbs: existingBaseline ?? Number(params.weight) ?? gwn!,
          baseline_date: params.existingBaselineDate || today,
          last_dismissed_at: params.existingDismissedAt || undefined,
        };
        tasks.push(saveWeightGoal(db, profile.user.id, goal));
      } else if (params.existingBaselineDate === '' && params.goalWeight === '') {
        tasks.push(clearWeightGoal(db, profile.user.id));
      }

      await Promise.all(tasks);

      Alert.alert('Saved', 'Your macro goals have been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save macro goals.';
      Alert.alert('Save failed', message);
    } finally {
      setSaving(false);
    }
  };

  const goalLabel = params.goalType === 'lose' ? 'Lose weight'
    : params.goalType === 'gain' ? 'Gain muscle'
    : 'Maintain weight';

  const activityLabel = params.activityLevel === 'sedentary' ? 'Sedentary'
    : params.activityLevel === 'light' ? 'Light activity'
    : params.activityLevel === 'active' ? 'Active'
    : 'Moderate activity';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.pageTitle, { color: theme.text }]}>Recommended Targets</Text>

        {/* Input summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.summaryRow, { color: theme.textSecondary }]}>
            {params.weight} lbs · {goalLabel} · {activityLabel}
            {params.goalWeight ? ` · Target: ${params.goalWeight} lbs by ${params.goalDate}` : ''}
          </Text>
        </View>

        {/* Recommendation card */}
        {recommendation && (
          <>
            <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>RECOMMENDATION</Text>
            <View style={[styles.recCard, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.recCalories, { color: theme.text }]}>{recommendation.caloriesLabel}</Text>
              <View style={styles.recMacroRow}>
                <View style={styles.recMacroItem}>
                  <Text style={[styles.recMacroValue, { color: theme.text }]}>{recommendation.protein}g</Text>
                  <Text style={[styles.recMacroLabel, { color: theme.textSecondary }]}>Protein</Text>
                </View>
                <View style={[styles.recMacroDivider, { backgroundColor: theme.border }]} />
                <View style={styles.recMacroItem}>
                  <Text style={[styles.recMacroValue, { color: theme.text }]}>{recommendation.carbs}g</Text>
                  <Text style={[styles.recMacroLabel, { color: theme.textSecondary }]}>Carbs</Text>
                </View>
                <View style={[styles.recMacroDivider, { backgroundColor: theme.border }]} />
                <View style={styles.recMacroItem}>
                  <Text style={[styles.recMacroValue, { color: theme.text }]}>{recommendation.fat}g</Text>
                  <Text style={[styles.recMacroLabel, { color: theme.textSecondary }]}>Fat</Text>
                </View>
              </View>
              <Text style={[styles.recNote, { color: theme.textSecondary }]}>{recommendation.mealPattern}</Text>
              {!appliedRec && (
                <Pressable
                  style={[styles.applyRecBtn, { borderColor: Colors.accent }]}
                  onPress={applyRecommendation}
                >
                  <Text style={[styles.applyRecBtnLabel, { color: Colors.accent }]}>
                    Use these values
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}

        {/* Editable macro goals */}
        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>
          {appliedRec ? 'YOUR GOALS' : 'MACRO GOALS'}
        </Text>
        {!appliedRec && (
          <Text style={[styles.editHint, { color: theme.textSecondary }]}>
            Apply the recommendation above, or set your own targets below.
          </Text>
        )}
        <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
          {goals.map((macro, index) => (
            <View
              key={macro.key}
              style={[
                styles.row,
                index < goals.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
              ]}
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

        {/* Guidance */}
        {recommendation && recommendation.guidance.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>GUIDANCE</Text>
            <View style={[styles.guidanceCard, { backgroundColor: theme.backgroundElement }]}>
              {recommendation.guidance.map((line, i) => (
                <Text key={i} style={[styles.guidanceLine, { color: theme.textSecondary }]}>
                  {`• ${line}`}
                </Text>
              ))}
            </View>
          </>
        )}

        <View style={[styles.buttonGroup, { marginTop: 24 }]}>
          <Button label={saving ? 'Saving…' : 'Apply & save'} onPress={handleApply} disabled={saving} />
          <Button label="Back" variant="secondary" onPress={() => router.back()} />
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
  } as ViewStyle,
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  } as TextStyle,
  summaryCard: {
    borderRadius: BorderRadius.md,
    padding: 12,
    marginTop: 8,
  } as ViewStyle,
  summaryRow: {
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
  } as TextStyle,
  recCard: {
    borderRadius: BorderRadius.md,
    padding: 16,
    gap: 12,
  } as ViewStyle,
  recCalories: {
    fontSize: 18,
    fontWeight: '700',
  } as TextStyle,
  recMacroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  recMacroItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  } as ViewStyle,
  recMacroDivider: {
    width: 1,
    height: 32,
  } as ViewStyle,
  recMacroValue: {
    fontSize: 16,
    fontWeight: '700',
  } as TextStyle,
  recMacroLabel: {
    fontSize: 12,
    fontWeight: '500',
  } as TextStyle,
  recNote: {
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,
  applyRecBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  } as ViewStyle,
  applyRecBtnLabel: {
    fontSize: 14,
    fontWeight: '600',
  } as TextStyle,
  editHint: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: -4,
    marginBottom: 6,
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
    minWidth: 60,
    maxWidth: 90,
    paddingVertical: 2,
    paddingHorizontal: 2,
  } as TextStyle,
  unit: {
    fontSize: 13,
    fontWeight: '500',
    minWidth: 28,
  } as TextStyle,
  guidanceCard: {
    borderRadius: BorderRadius.md,
    padding: 14,
    gap: 8,
  } as ViewStyle,
  guidanceLine: {
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,
  buttonGroup: {
    gap: 8,
  } as ViewStyle,
});

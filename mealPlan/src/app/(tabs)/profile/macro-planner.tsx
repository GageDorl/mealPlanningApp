import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { usePowerSync } from '@powersync/react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScreenContainer, ScreenCard, ScreenTitle } from '@/components/ui/screen';
import { DefaultMacros, type MacroDefinition } from '@/constants/macros';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { updateMacroGoals } from '@/services/user-service';
import {
  ActivityLevel,
  GoalType,
  Sex,
  getActivityLabel,
  getGoalLabel,
  getSexLabel,
  recommendMacroPlan,
  type MacroPlannerInput,
  type MacroRecommendation,
} from '@/services/macro-planner-service';

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

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function MacroPlannerScreen() {
  const db = usePowerSync();
  const router = useRouter();
  const theme = useTheme();
  const { profile, loading } = useUserProfile();
  const [weight, setWeight] = useState('70');
  const [height, setHeight] = useState('170');
  const [age, setAge] = useState('30');
  const [sex, setSex] = useState<Sex>('other');
  const [goalType, setGoalType] = useState<GoalType>('maintain');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goals, setGoals] = useState<MacroDefinition[]>(DefaultMacros);
  const [initialGoals, setInitialGoals] = useState<MacroDefinition[]>(DefaultMacros);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const synced = DefaultMacros.map((macro) => {
      const match = profile.macroGoals.find((item) => item.macro_name === macro.key);
      return {
        ...macro,
        defaultGoal: match ? Number(match.daily_target) : macro.defaultGoal,
      };
    });
    setGoals(synced);
    setInitialGoals(synced);
  }, [profile]);

  const restoreCurrentGoals = () => {
    setGoals(initialGoals);
    setSaveError(null);
  };

  const validateInputs = () => {
    const weightValue = Number(weight);
    if (Number.isNaN(weightValue) || weightValue < 40 || weightValue > 200) {
      return 'Please enter a weight between 40 and 200 kg.';
    }

    const heightValue = Number(height);
    if (Number.isNaN(heightValue) || heightValue < 120 || heightValue > 230) {
      return 'Please enter a height between 120 and 230 cm.';
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

  const inputPayload: MacroPlannerInput = useMemo(
    () => ({
      weightKg: clampNumber(Number(weight), 40, 200),
      heightCm: clampNumber(Number(height), 120, 230),
      age: clampNumber(Number(age), 18, 100),
      sex,
      goalType,
      activityLevel,
      dietaryTags: profile?.dietaryPreferences ?? [],
    }),
    [weight, height, age, sex, goalType, activityLevel, profile?.dietaryPreferences],
  );

  const recommendation: MacroRecommendation = useMemo(
    () => recommendMacroPlan(inputPayload),
    [inputPayload],
  );

  const weeklySummary = useMemo(() => ({
    calories: recommendation.calories * 7,
    protein: recommendation.protein * 7,
    carbs: recommendation.carbs * 7,
    fat: recommendation.fat * 7,
  }), [recommendation]);

  const applyRecommendationToGoals = () => {
    setGoals((prev) => prev.map((item) => {
      if (item.key === 'protein') return { ...item, defaultGoal: recommendation.protein };
      if (item.key === 'carbs') return { ...item, defaultGoal: recommendation.carbs };
      if (item.key === 'fat') return { ...item, defaultGoal: recommendation.fat };
      return item;
    }));
  };

  const updateGoal = (index: number, value: string) => {
    const amount = Number(value);
    setGoals((prev) => prev.map((item, idx) => (
      idx === index ? { ...item, defaultGoal: Number.isNaN(amount) ? item.defaultGoal : amount } : item
    )));
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
      await updateMacroGoals(db, profile.user.id, goals.map((goal, index) => ({
        macro_name: goal.key,
        daily_target: goal.defaultGoal,
        unit: goal.unit,
        display_order: index,
        is_active: true,
      })));
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
      <ScreenContainer>
        <Text style={[styles.statusText, { color: theme.textSecondary }]}>Loading profile…</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenCard>
          <ScreenTitle>Macro Planner</ScreenTitle>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>About you</Text>
          <View style={styles.fieldRow}>
            <View style={styles.fieldLabel}>
              <Text style={[styles.fieldLabelText, { color: theme.text }]}>Weight (kg)</Text>
            </View>
            <Input value={weight} onChangeText={setWeight} keyboardType="numeric" />
          </View>
          <View style={styles.fieldRow}>
            <View style={styles.fieldLabel}>
              <Text style={[styles.fieldLabelText, { color: theme.text }]}>Height (cm)</Text>
            </View>
            <Input value={height} onChangeText={setHeight} keyboardType="numeric" />
          </View>
          <View style={styles.fieldRow}>
            <View style={styles.fieldLabel}>
              <Text style={[styles.fieldLabelText, { color: theme.text }]}>Age</Text>
            </View>
            <Input value={age} onChangeText={setAge} keyboardType="numeric" />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Profile</Text>
          <View style={styles.optionGrid}>
            {SEX_OPTIONS.map((option) => (
              <Button
                key={option.value}
                label={option.label}
                variant={sex === option.value ? 'primary' : 'secondary'}
                onPress={() => setSex(option.value)}
              />
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Goal</Text>
          <View style={styles.optionGrid}>
            {GOAL_OPTIONS.map((option) => (
              <Button
                key={option.value}
                label={option.label}
                variant={goalType === option.value ? 'primary' : 'secondary'}
                onPress={() => setGoalType(option.value)}
              />
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Activity</Text>
          <View style={styles.optionGrid}>
            {ACTIVITY_OPTIONS.map((option) => (
              <Button
                key={option.value}
                label={option.label}
                variant={activityLevel === option.value ? 'primary' : 'secondary'}
                onPress={() => setActivityLevel(option.value)}
              />
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recommended targets</Text>
          <Text style={[styles.summaryHeader, { color: theme.textSecondary }]}>This estimate is based on your profile, activity, and goal settings.</Text>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}> 
            <Text style={[styles.recommendationLabel, { color: theme.text }]}>{recommendation.caloriesLabel}</Text>
            <View style={styles.recommendationRow}>
              <Text style={[styles.recommendationText, { color: theme.text }]}>Protein: {recommendation.protein} g</Text>
              <Text style={[styles.recommendationText, { color: theme.text }]}>Carbs: {recommendation.carbs} g</Text>
              <Text style={[styles.recommendationText, { color: theme.text }]}>Fat: {recommendation.fat} g</Text>
            </View>
            <Text style={[styles.recommendationText, { color: theme.text }]}>{recommendation.mealPattern}</Text>
            <Text style={[styles.recommendationSubtext, { color: theme.textSecondary }]}>Daily balance: {Math.round(recommendation.proteinRatio * 100)}% protein · {Math.round(recommendation.carbsRatio * 100)}% carbs · {Math.round(recommendation.fatRatio * 100)}% fat</Text>
            {recommendation.guidance.map((line) => (
              <Text key={line} style={[styles.guidanceLine, { color: theme.textSecondary }]}>{line}</Text>
            ))}
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Weekly calories</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{weeklySummary.calories} kcal</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Weekly protein</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{weeklySummary.protein} g</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Weekly carbs</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{weeklySummary.carbs} g</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Weekly fat</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{weeklySummary.fat} g</Text>
              </View>
            </View>
            <Button
              label="Apply recommended targets"
              onPress={applyRecommendationToGoals}
              variant="secondary"
            />
            <Button
              label="Reset to current goals"
              onPress={restoreCurrentGoals}
              variant="secondary"
            />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Macro goals</Text>
          {goals.map((macro, index) => (
            <View key={macro.key} style={styles.fieldRow}>
              <View style={styles.fieldLabel}>
                <Text style={[styles.fieldLabelText, { color: theme.text }]}>{macro.label}</Text>
              </View>
              <Input
                value={String(macro.defaultGoal)}
                onChangeText={(value) => updateGoal(index, value)}
                keyboardType="numeric"
              />
            </View>
          ))}

          {saveError ? <Text style={[styles.errorText, { color: theme.error }]}>{saveError}</Text> : null}

          <Button label={saving ? 'Saving…' : 'Save macro goals'} onPress={handleSave} disabled={saving} />
          <Button label="Back to Profile" variant="secondary" onPress={() => router.back()} />
        </ScreenCard>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    width: '100%',
    alignItems: 'center',
  } as ViewStyle,
  fieldRow: {
    width: '100%',
    marginBottom: 12,
  } as ViewStyle,
  fieldLabel: {
    marginBottom: 6,
  } as ViewStyle,
  fieldLabelText: {
    fontSize: 15,
    fontWeight: '600',
  } as TextStyle,
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 10,
  } as TextStyle,
  optionGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  } as ViewStyle,
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    marginBottom: 14,
  } as ViewStyle,
  recommendationLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  } as TextStyle,
  recommendationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  } as ViewStyle,
  recommendationText: {
    fontSize: 14,
    fontWeight: '500',
  } as TextStyle,
  summaryHeader: {
    fontSize: 13,
    marginBottom: 10,
  } as TextStyle,
  recommendationSubtext: {
    fontSize: 13,
    marginTop: 6,
  } as TextStyle,
  summaryGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
    marginBottom: 12,
  } as ViewStyle,
  summaryItem: {
    width: '48%',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F2F3F5',
  } as ViewStyle,
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
  } as TextStyle,
  summaryValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
  } as TextStyle,
  guidanceLine: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  } as TextStyle,
  statusText: {
    fontSize: 15,
    fontWeight: '500',
  } as TextStyle,
  errorText: {
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '500',
  } as TextStyle,
});

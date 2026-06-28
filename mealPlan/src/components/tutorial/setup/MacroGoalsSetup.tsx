import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ViewStyle, type TextStyle } from 'react-native';
import { Button } from '@/components/ui/button';
import { DatePickerModal } from '@/components/ui/date-picker-modal';
import { DefaultMacros, type MacroDefinition } from '@/constants/macros';
import { Colors, BorderRadius, FontSizes, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { recommendMacroPlan, type ActivityLevel, type GoalType } from '@/services/macro-planner-service';
import type { TooltipData } from '@/types/tutorial';

// Demo-only: no DB reads or writes. Uses hardcoded example body stats for recommendation.
const DEMO_BODY = { heightIn: 70, age: 30, sex: 'male' as const };

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatGoalDate(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function defaultGoalDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 56);
  return d;
}

interface Props {
  onComplete: () => void;
  onTooltipChange?: (data: TooltipData | null) => void;
}

type Step = 'form' | 'recommendation';
type GoalMode = 'direction' | 'specific';

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

const TOOLTIP_STEPS: Array<{ title: string; body: string }> = [
  {
    title: 'Current Weight',
    body: 'Used with your height, age, and sex to estimate how many calories you burn daily (your TDEE). The more accurate this is, the better your recommendation.',
  },
  {
    title: 'Goal Type',
    body: '"General" lets you pick a direction — lose, maintain, or gain. "Specific target" lets you set an exact goal weight and date so Prepd can calculate the weekly pace.',
  },
  {
    title: 'Activity Level',
    body: 'How active you are in a typical week. This has the single biggest impact on your calorie target — being honest here really matters.',
  },
];


export function MacroGoalsSetup({ onComplete, onTooltipChange }: Props) {
  const theme = useTheme();
  const [step, setStep] = useState<Step>('form');

  // Tooltip tour: starts at step 0 (weight field), null = dismissed
  const [tooltipStep, setTooltipStep] = useState<number | null>(0);
  // Bottom-Y of each highlighted section (relative to scroll content)
  const [weightBottom, setWeightBottom] = useState(0);
  const [goalBottom, setGoalBottom] = useState(0);
  const [activityBottom, setActivityBottom] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const tooltipY = tooltipStep === 0 ? weightBottom : tooltipStep === 1 ? goalBottom : activityBottom;

  // Form state — example defaults, no DB pre-fill
  const [weight, setWeight] = useState('170');
  const [goalMode, setGoalMode] = useState<GoalMode>('direction');
  const [goalType, setGoalType] = useState<GoalType>('maintain');
  const [goalWeight, setGoalWeight] = useState('155');
  const [goalDate, setGoalDate] = useState<Date>(defaultGoalDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');

  // Recommendation state
  const [recommendation, setRecommendation] = useState<ReturnType<typeof recommendMacroPlan> | null>(null);
  const [goals, setGoals] = useState<MacroDefinition[]>(() => DefaultMacros.map((m) => ({ ...m })));
  const [goalInputs, setGoalInputs] = useState<string[]>(() => DefaultMacros.map((m) => String(m.defaultGoal)));
  const [appliedRec, setAppliedRec] = useState(false);

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

  const advanceTooltip = useCallback(() => {
    setTooltipStep((prev) => {
      if (prev === null) return null;
      return prev < TOOLTIP_STEPS.length - 1 ? prev + 1 : null;
    });
  }, []);

  const dismissTooltip = useCallback(() => setTooltipStep(null), []);

  useEffect(() => {
    if (!onTooltipChange) return;
    if (tooltipStep !== null && tooltipY > 0) {
      onTooltipChange({
        step: tooltipStep,
        total: TOOLTIP_STEPS.length,
        title: TOOLTIP_STEPS[tooltipStep].title,
        body: TOOLTIP_STEPS[tooltipStep].body,
        relativeY: tooltipY - scrollY,
        centerX: 0,
        onNext: advanceTooltip,
        onDismiss: dismissTooltip,
      });
    } else {
      onTooltipChange(null);
    }
    return () => onTooltipChange(null);
  }, [tooltipStep, tooltipY, scrollY, onTooltipChange, advanceTooltip, dismissTooltip]);

  const handleGetRecommendation = () => {
    const wn = Number(weight);
    if (Number.isNaN(wn) || wn < 80 || wn > 500) {
      Alert.alert('Invalid weight', 'Please enter a weight between 80 and 500 lbs.');
      return;
    }
    let effectiveGoalType: GoalType = goalType;
    if (goalMode === 'specific') {
      const gwn = Number(goalWeight);
      if (!gwn || gwn < 50 || gwn > 500) {
        Alert.alert('Invalid target weight', 'Please enter a target weight between 50 and 500 lbs.');
        return;
      }
      if (gwn < wn - 1) effectiveGoalType = 'lose';
      else if (gwn > wn + 1) effectiveGoalType = 'gain';
      else effectiveGoalType = 'maintain';
    }
    const rec = recommendMacroPlan({
      weightLbs: wn,
      ...DEMO_BODY,
      goalType: effectiveGoalType,
      activityLevel,
      dietaryTags: [],
    });
    setRecommendation(rec);
    setStep('recommendation');
  };

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
  };

  if (step === 'recommendation' && recommendation) {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.summaryRow, { color: theme.textSecondary }]}>
              {weight} lbs (example) · {goalMode === 'specific' ? `Target: ${goalWeight} lbs by ${formatGoalDate(goalDate)}` : goalType === 'lose' ? 'Lose weight' : goalType === 'gain' ? 'Gain muscle' : 'Maintain weight'} ·{' '}
              {ACTIVITY_OPTIONS.find((a) => a.value === activityLevel)?.label}
            </Text>
          </View>

          <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>EXAMPLE RECOMMENDATION</Text>
          <View style={[styles.recCard, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.recCalories, { color: theme.text }]}>{recommendation.caloriesLabel}</Text>
            <View style={styles.recMacroRow}>
              {(['protein', 'carbs', 'fat'] as const).map((key, i, arr) => (
                <View key={key} style={styles.recMacroItem}>
                  <Text style={[styles.recMacroValue, { color: theme.text }]}>
                    {recommendation[key]}g
                  </Text>
                  <Text style={[styles.recMacroLabel, { color: theme.textSecondary }]}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Text>
                  {i < arr.length - 1 && <View style={[styles.recMacroDivider, { backgroundColor: theme.border }]} />}
                </View>
              ))}
            </View>
            <Text style={[styles.recNote, { color: theme.textSecondary }]}>{recommendation.mealPattern}</Text>
            {!appliedRec && (
              <Pressable style={[styles.applyRecBtn, { borderColor: Colors.accent }]} onPress={applyRecommendation}>
                <Text style={[styles.applyRecBtnLabel, { color: Colors.accent }]}>Preview these values</Text>
              </Pressable>
            )}
          </View>

          <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>
            {appliedRec ? 'EXAMPLE GOALS' : 'MACRO GOALS'}
          </Text>
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

          <View style={[styles.demoNote, { backgroundColor: `${Colors.accent}10`, borderColor: `${Colors.accent}30` }]}>
            <Text style={[styles.demoNoteText, { color: theme.textSecondary }]}>
              This is a demo — values aren't saved here. Set your real macro goals from the Macros tab after the tutorial.
            </Text>
          </View>

          <View style={[styles.buttonGroup, { marginTop: 16, marginBottom: 32 }]}>
            <Button label="Got it, continue →" onPress={onComplete} />
            <Button label="← Back to form" variant="secondary" onPress={() => setStep('form')} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        {/* Weight field */}
        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>CURRENT WEIGHT (EXAMPLE)</Text>
        <View
          style={[
            styles.group,
            { backgroundColor: theme.backgroundElement, borderWidth: 2, borderColor: tooltipStep === 0 ? Colors.accent : 'transparent' },
          ]}
          onLayout={(e) => setWeightBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
        >
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

        {/* Goal mode toggle + options */}
        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>GOAL</Text>
        <View
          style={[
            styles.modeToggle,
            { backgroundColor: theme.backgroundElement, borderWidth: 2, borderColor: tooltipStep === 1 ? Colors.accent : 'transparent' },
          ]}
          onLayout={(e) => setGoalBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
        >
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
              <Text style={[styles.rateNote, { color: rateWarning ? '#E53E3E' : theme.textSecondary }]}>
                {Math.abs(weeklyRate) < 0.05
                  ? 'This pace maintains your current weight.'
                  : `${Math.abs(weeklyRate).toFixed(2)} lbs/week ${weeklyRate > 0 ? 'lost' : 'gained'}`}
                {rateWarning ? `  ⚠ ${rateWarning}` : ''}
              </Text>
            )}
          </>
        )}

        {/* Activity level */}
        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>ACTIVITY LEVEL</Text>
        <View
          style={[
            styles.group,
            { backgroundColor: theme.backgroundElement, borderWidth: 2, borderColor: tooltipStep === 2 ? Colors.accent : 'transparent' },
          ]}
          onLayout={(e) => setActivityBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
        >
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
          <Button label="See example recommendation →" onPress={handleGetRecommendation} />
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
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 } as ViewStyle,
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
  dateValue: { fontSize: 15 } as TextStyle,
  chevron: { fontSize: 20, fontWeight: '300', marginLeft: 4 } as TextStyle,
  rateNote: { fontSize: 12, marginTop: 6, lineHeight: 16 } as TextStyle,
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, minHeight: 56 } as ViewStyle,
  activityLeft: { flex: 1, gap: 2 } as ViewStyle,
  activityLabel: { fontSize: 15, fontWeight: '500' } as TextStyle,
  activityDesc: { fontSize: 12 } as TextStyle,
  checkDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 } as ViewStyle,
  summaryCard: { borderRadius: BorderRadius.md, padding: 12, marginBottom: 4 } as ViewStyle,
  summaryRow: { fontSize: 13, lineHeight: 18 } as TextStyle,
  recCard: { borderRadius: BorderRadius.md, padding: 16, gap: 12 } as ViewStyle,
  recCalories: { fontSize: 18, fontWeight: '700' } as TextStyle,
  recMacroRow: { flexDirection: 'row', alignItems: 'center' } as ViewStyle,
  recMacroItem: { flex: 1, alignItems: 'center', gap: 2, position: 'relative' } as ViewStyle,
  recMacroDivider: { position: 'absolute', right: 0, width: 1, height: 32 } as ViewStyle,
  recMacroValue: { fontSize: 16, fontWeight: '700' } as TextStyle,
  recMacroLabel: { fontSize: 12, fontWeight: '500' } as TextStyle,
  recNote: { fontSize: 13, lineHeight: 18 } as TextStyle,
  applyRecBtn: { borderWidth: 1, borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center', marginTop: 4 } as ViewStyle,
  applyRecBtnLabel: { fontSize: 14, fontWeight: '600' } as TextStyle,
  demoNote: { borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.md, marginTop: Spacing.md } as ViewStyle,
  demoNoteText: { fontSize: FontSizes.sm, lineHeight: 20 } as TextStyle,
  buttonGroup: { gap: 8 } as ViewStyle,
});

import { useState } from 'react';
import { ScrollView, Text, TextInput, View, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import type { WeeklyQuestionnaire } from '@/services/week-planner-service';

const COOK_TIME_OPTIONS: Array<{ label: string; value: WeeklyQuestionnaire['cook_time'] }> = [
  { label: 'Quick (under 30 min)', value: 'quick' },
  { label: 'Moderate (30–60 min)', value: 'moderate' },
  { label: 'No preference', value: 'any' },
];

const PREP_STYLE_OPTIONS: Array<{ label: string; value: WeeklyQuestionnaire['prep_style'] }> = [
  { label: 'Cook fresh each day', value: 'fresh' },
  { label: 'Meal prep (batch cook)', value: 'batch' },
];

const BUDGET_TIER_OPTIONS: Array<{ label: string; value: NonNullable<WeeklyQuestionnaire['budget']['tier']> }> = [
  { label: 'No preference', value: 'none' },
  { label: 'Budget-friendly', value: 'budget' },
  { label: 'Splurge okay', value: 'splurge' },
];

const NOTES_MAX = 200;

interface PlanWeekQuestionnaireProps {
  submitting: boolean;
  onSubmit: (questionnaire: WeeklyQuestionnaire) => void;
}

export function PlanWeekQuestionnaire({ submitting, onSubmit }: PlanWeekQuestionnaireProps) {
  const theme = useTheme();

  const [daysCooking, setDaysCooking] = useState<number | null>(null);
  const [mealsPerDay, setMealsPerDay] = useState<number | null>(null);
  const [cookTime, setCookTime] = useState<WeeklyQuestionnaire['cook_time']>('any');
  const [prepStyle, setPrepStyle] = useState<WeeklyQuestionnaire['prep_style']>('fresh');
  const [budgetMode, setBudgetMode] = useState<'general' | 'specific'>('general');
  const [budgetTier, setBudgetTier] = useState<NonNullable<WeeklyQuestionnaire['budget']['tier']>>('none');
  const [weeklyBudget, setWeeklyBudget] = useState('');
  const [notes, setNotes] = useState('');

  const canSubmit = daysCooking != null && mealsPerDay != null && !submitting;

  const handleSubmit = () => {
    if (daysCooking == null || mealsPerDay == null) return;
    onSubmit({
      days_cooking: daysCooking,
      meals_per_day: mealsPerDay,
      cook_time: cookTime,
      prep_style: prepStyle,
      budget: budgetMode === 'specific'
        ? { mode: 'specific', weekly_amount: weeklyBudget ? Number(weeklyBudget) : undefined }
        : { mode: 'general', tier: budgetTier },
      notes: notes.trim(),
    });
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.question, { color: theme.text }]}>
        How many days will you be cooking at home this week?
      </Text>
      <View style={styles.dayRow}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
          <Pressable
            key={n}
            style={[
              styles.dayChip,
              {
                borderColor: daysCooking === n ? Colors.accent : theme.border,
                backgroundColor: daysCooking === n ? Colors.accent : theme.backgroundElement,
              },
            ]}
            onPress={() => setDaysCooking(n)}
            accessibilityRole="button"
            accessibilityLabel={`${n} day${n === 1 ? '' : 's'}`}
          >
            <Text style={[styles.dayChipText, { color: daysCooking === n ? '#FFFFFF' : theme.text }]}>{n}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.question, { color: theme.text, marginTop: Spacing.xl }]}>
        How many meals do you eat a day?
      </Text>
      <View style={styles.dayRow}>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <Pressable
            key={n}
            style={[
              styles.dayChip,
              {
                borderColor: mealsPerDay === n ? Colors.accent : theme.border,
                backgroundColor: mealsPerDay === n ? Colors.accent : theme.backgroundElement,
              },
            ]}
            onPress={() => setMealsPerDay(n)}
            accessibilityRole="button"
            accessibilityLabel={`${n} meal${n === 1 ? '' : 's'} per day`}
          >
            <Text style={[styles.dayChipText, { color: mealsPerDay === n ? '#FFFFFF' : theme.text }]}>{n}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.question, { color: theme.text, marginTop: Spacing.xl }]}>
        How much time do you want to spend per cooked meal?
      </Text>
      <View style={styles.chipRow}>
        {COOK_TIME_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[
              styles.chip,
              {
                borderColor: cookTime === opt.value ? Colors.accent : theme.border,
                backgroundColor: cookTime === opt.value ? Colors.accent : theme.backgroundElement,
              },
            ]}
            onPress={() => setCookTime(opt.value)}
          >
            <Text style={[styles.chipText, { color: cookTime === opt.value ? '#FFFFFF' : theme.text }]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.question, { color: theme.text, marginTop: Spacing.xl }]}>
        What's your prep style?
      </Text>
      <View style={styles.chipRow}>
        {PREP_STYLE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[
              styles.chip,
              {
                borderColor: prepStyle === opt.value ? Colors.accent : theme.border,
                backgroundColor: prepStyle === opt.value ? Colors.accent : theme.backgroundElement,
              },
            ]}
            onPress={() => setPrepStyle(opt.value)}
          >
            <Text style={[styles.chipText, { color: prepStyle === opt.value ? '#FFFFFF' : theme.text }]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.question, { color: theme.text, marginTop: Spacing.xl }]}>
        Budget (optional)
      </Text>
      <View style={[styles.modeToggle, { backgroundColor: theme.backgroundElement }]}>
        <Pressable
          style={[styles.modeBtn, budgetMode === 'general' && { backgroundColor: Colors.accent }]}
          onPress={() => setBudgetMode('general')}
        >
          <Text style={[styles.modeBtnText, { color: budgetMode === 'general' ? '#fff' : theme.textSecondary }]}>
            General
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeBtn, budgetMode === 'specific' && { backgroundColor: Colors.accent }]}
          onPress={() => setBudgetMode('specific')}
        >
          <Text style={[styles.modeBtnText, { color: budgetMode === 'specific' ? '#fff' : theme.textSecondary }]}>
            Specific amount
          </Text>
        </Pressable>
      </View>

      {budgetMode === 'general' ? (
        <View style={[styles.chipRow, { marginTop: Spacing.sm }]}>
          {BUDGET_TIER_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.chip,
                {
                  borderColor: budgetTier === opt.value ? Colors.accent : theme.border,
                  backgroundColor: budgetTier === opt.value ? Colors.accent : theme.backgroundElement,
                },
              ]}
              onPress={() => setBudgetTier(opt.value)}
            >
              <Text style={[styles.chipText, { color: budgetTier === opt.value ? '#FFFFFF' : theme.text }]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={[styles.budgetRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border, marginTop: Spacing.sm }]}>
          <Text style={[styles.budgetLabel, { color: theme.text }]}>Weekly food budget</Text>
          <View style={styles.budgetInputWrap}>
            <Text style={[styles.budgetDollar, { color: theme.textSecondary }]}>$</Text>
            <TextInput
              style={[styles.budgetInput, { color: theme.text }]}
              value={weeklyBudget}
              onChangeText={setWeeklyBudget}
              keyboardType="numeric"
              placeholder="150"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
        </View>
      )}

      <Text style={[styles.question, { color: theme.text, marginTop: Spacing.xl }]}>
        Anything specific? (optional)
      </Text>
      <TextInput
        style={[styles.notesInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
        placeholder="Cravings, ingredients to use up, things to avoid…"
        placeholderTextColor={theme.textSecondary}
        value={notes}
        onChangeText={(t) => setNotes(t.slice(0, NOTES_MAX))}
        multiline
        maxLength={NOTES_MAX}
        textAlignVertical="top"
      />
      <Text style={[styles.charCount, { color: theme.textSecondary }]}>{notes.length}/{NOTES_MAX}</Text>

      <Button
        label={submitting ? 'Getting suggestions…' : 'Get Suggestions'}
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={{ marginTop: Spacing.xl, marginBottom: Spacing.xxl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg } as ViewStyle,
  question: { fontSize: FontSizes.md, fontWeight: '700', marginBottom: Spacing.md } as TextStyle,
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm } as ViewStyle,
  dayChip: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  dayChipText: { fontSize: FontSizes.md, fontWeight: '700' } as TextStyle,
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm } as ViewStyle,
  chip: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.full, borderWidth: 1 } as ViewStyle,
  chipText: { fontSize: FontSizes.sm, fontWeight: '600' } as TextStyle,
  modeToggle: { flexDirection: 'row', borderRadius: BorderRadius.md, padding: 3, gap: 3 } as ViewStyle,
  modeBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, alignItems: 'center' } as ViewStyle,
  modeBtnText: { fontSize: FontSizes.sm, fontWeight: '600' } as TextStyle,
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  } as ViewStyle,
  budgetLabel: { fontSize: FontSizes.sm, fontWeight: '600' } as TextStyle,
  budgetInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 } as ViewStyle,
  budgetDollar: { fontSize: FontSizes.sm } as TextStyle,
  budgetInput: { fontSize: FontSizes.sm, minWidth: 50, textAlign: 'right', paddingVertical: 2 } as TextStyle,
  notesInput: {
    minHeight: 90,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: FontSizes.sm,
  } as TextStyle,
  charCount: { fontSize: FontSizes.xs, textAlign: 'right', marginTop: Spacing.xs } as TextStyle,
});

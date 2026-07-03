import { useState } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Spacing } from '@/constants/theme';
import { PlanWeekQuestionnaire } from '@/components/week-planner/PlanWeekQuestionnaire';
import { WeekSuggestions, type WeekSuggestionItem, type DailyMacroGoals } from '@/components/week-planner/WeekSuggestions';
import type { WeeklyQuestionnaire } from '@/services/week-planner-service';

type Step = 'questionnaire' | 'loading' | 'suggestions';

const FILLER_SUGGESTIONS: WeekSuggestionItem[] = [
  {
    id: 'tutorial-ps-1',
    day: 1,
    meal_label: 'Breakfast',
    items: [
      {
        name: 'Quest Protein Bar - Chocolate Chip Cookie Dough',
        type: 'buy',
        estimated_macros: { calories: 190, protein: 21, carbs: 22, fat: 8 },
        estimated_cost: 3,
      },
      {
        name: 'Premier Protein Shake - Chocolate',
        type: 'buy',
        estimated_macros: { calories: 160, protein: 30, carbs: 4, fat: 3 },
        estimated_cost: 3,
      },
    ],
    reason: 'A quick grab-and-go breakfast that hits your protein target without any prep.',
  },
  {
    id: 'tutorial-ps-2',
    day: 1,
    meal_label: 'Dinner',
    items: [
      {
        name: 'Sheet-Pan Lemon Herb Chicken with Roasted Vegetables',
        type: 'cook',
        estimated_macros: { calories: 520, protein: 45, carbs: 38, fat: 18 },
        estimated_cost: 6,
      },
    ],
    reason: 'One pan, under 30 minutes, and balances out the rest of your day\'s macros.',
  },
  {
    id: 'tutorial-ps-3',
    day: 2,
    meal_label: 'Breakfast',
    items: [
      {
        name: 'Quest Protein Bar - Chocolate Chip Cookie Dough',
        type: 'buy',
        estimated_macros: { calories: 190, protein: 21, carbs: 22, fat: 8 },
        estimated_cost: 3,
      },
      {
        name: 'Premier Protein Shake - Chocolate',
        type: 'buy',
        estimated_macros: { calories: 160, protein: 30, carbs: 4, fat: 3 },
        estimated_cost: 3,
      },
    ],
    reason: "Repeats yesterday's breakfast since it fit your batch-prep style.",
  },
  {
    id: 'tutorial-ps-4',
    day: 2,
    meal_label: 'Dinner',
    items: [
      {
        name: 'Sheet-Pan Lemon Herb Chicken with Roasted Vegetables (leftovers)',
        type: 'cook',
        estimated_macros: { calories: 520, protein: 45, carbs: 38, fat: 18 },
        estimated_cost: 0,
      },
    ],
    reason: 'Leftovers from Day 1 — no extra cooking needed.',
  },
];

const FILLER_GOALS: DailyMacroGoals = { calories: 2200, protein: 160, carbs: 220, fat: 70 };

export function PlanWeekPreview() {
  const [step, setStep] = useState<Step>('questionnaire');
  const [suggestions, setSuggestions] = useState<WeekSuggestionItem[]>(FILLER_SUGGESTIONS);

  const handleSubmit = (_questionnaire: WeeklyQuestionnaire) => {
    setStep('loading');
    setTimeout(() => {
      setSuggestions(FILLER_SUGGESTIONS);
      setStep('suggestions');
    }, 1500);
  };

  const handleAddToCalendar = (item: WeekSuggestionItem) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== item.id));
  };

  const handleSkip = (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddAll = () => {
    setSuggestions([]);
  };

  return (
    <View style={styles.container}>
      {step !== 'suggestions' ? (
        <View style={styles.bounded}>
          <PlanWeekQuestionnaire submitting={step === 'loading'} onSubmit={handleSubmit} />
        </View>
      ) : (
        <View style={styles.bounded}>
          <WeekSuggestions
            suggestions={suggestions}
            addingAll={false}
            dailyGoals={FILLER_GOALS}
            onAddToCalendar={handleAddToCalendar}
            onSkip={handleSkip}
            onAddAll={handleAddAll}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  } as ViewStyle,
  bounded: {
    height: 440,
  } as ViewStyle,
});

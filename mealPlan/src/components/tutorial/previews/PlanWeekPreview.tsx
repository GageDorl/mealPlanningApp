import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { PlanWeekQuestionnaire } from '@/components/week-planner/PlanWeekQuestionnaire';
import { WeekBoard, buildEmptyBoard, type PlannedSlot, type PlannedItem, type DailyMacroGoals } from '@/components/week-planner/WeekBoard';
import type { WeeklyQuestionnaire } from '@/services/week-planner-service';
import type { PantryStapleRow } from '@/services/grocery-service';

const FILLER_WEEK_START = new Date(2026, 5, 28); // a Sunday
const FILLER_GOALS: DailyMacroGoals = { calories: 2200, protein: 160, carbs: 220, fat: 70 };
const FILLER_PANTRY: PantryStapleRow[] = [
  { id: 'tutorial-pantry-1', user_id: 'tutorial', ingredient_name: 'eggs', quantity: 6, unit: null },
  { id: 'tutorial-pantry-2', user_id: 'tutorial', ingredient_name: 'rice', quantity: 2, unit: 'lb' },
];

const FILLER_AI_ITEMS: Record<string, PlannedItem[]> = {
  Breakfast: [
    { kind: 'ai', name: 'Quest Protein Bar - Chocolate Chip Cookie Dough', type: 'buy', restaurant: false, estimated_macros: { calories: 190, protein: 21, carbs: 22, fat: 8 }, estimated_cost: 3 },
    { kind: 'ai', name: 'Premier Protein Shake - Chocolate', type: 'buy', restaurant: false, estimated_macros: { calories: 160, protein: 30, carbs: 4, fat: 3 }, estimated_cost: 3 },
  ],
  Lunch: [
    { kind: 'ai', name: 'Chick-fil-A Grilled Chicken Sandwich', type: 'buy', restaurant: true, estimated_macros: { calories: 380, protein: 28, carbs: 44, fat: 12 }, estimated_cost: 8 },
  ],
  Dinner: [
    { kind: 'ai', name: 'Sheet-Pan Lemon Herb Chicken with Roasted Vegetables', type: 'cook', restaurant: false, estimated_macros: { calories: 520, protein: 45, carbs: 38, fat: 18 }, estimated_cost: 6 },
  ],
};

function makeFillerBoard(): PlannedSlot[] {
  const board = buildEmptyBoard(3);
  return board.map((slot) => {
    if (slot.day === 1 && FILLER_AI_ITEMS[slot.meal_label]) {
      return { ...slot, items: FILLER_AI_ITEMS[slot.meal_label], reason: 'A quick pick that fits your macros and prep-time preference.' };
    }
    return slot;
  });
}

type Mode = 'questionnaire' | 'loading' | 'board';

export function PlanWeekPreview() {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('board');
  const [slots, setSlots] = useState<PlannedSlot[]>(makeFillerBoard);
  const [committingSlotId, setCommittingSlotId] = useState<string | null>(null);

  const handleGetSuggestions = useCallback((_questionnaire: WeeklyQuestionnaire) => {
    setMode('loading');
    setTimeout(() => {
      setSlots((prev) => prev.map((s) => {
        if (s.day !== 2 || s.items.length > 0 || !FILLER_AI_ITEMS[s.meal_label]) return s;
        return { ...s, items: FILLER_AI_ITEMS[s.meal_label], reason: 'Repeats a nearby favorite since it fit your prep style.' };
      }));
      setMode('board');
    }, 1500);
  }, []);

  const handleAddItem = useCallback((slotId: string, item: PlannedItem) => {
    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, items: [...s.items, item] } : s)));
  }, []);

  const handleRemoveItem = useCallback((slotId: string, itemIndex: number) => {
    setSlots((prev) => prev.map((s) => {
      if (s.id !== slotId) return s;
      const items = s.items.filter((_, i) => i !== itemIndex);
      return { ...s, items, reason: items.length === 0 ? undefined : s.reason };
    }));
  }, []);

  // Demo only — marks the slot committed locally, does not touch the real calendar.
  const handleCommitSlot = useCallback((slotId: string) => {
    setCommittingSlotId(slotId);
    setTimeout(() => {
      setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, committed: true } : s)));
      setCommittingSlotId(null);
    }, 500);
  }, []);

  return (
    <View style={styles.container}>
      {mode === 'questionnaire' ? (
        <View style={styles.bounded}>
          <PlanWeekQuestionnaire submitting={false} mealsPerDay={3} pantryStaples={FILLER_PANTRY} onSubmit={handleGetSuggestions} />
        </View>
      ) : mode === 'loading' ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={Colors.accent} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Finding meals for your week…</Text>
        </View>
      ) : (
        <>
          <Pressable style={[styles.suggestBtn, { backgroundColor: Colors.accent }]} onPress={() => setMode('questionnaire')}>
            <Text style={styles.suggestBtnText}>Get Suggestions</Text>
          </Pressable>
          <View style={styles.bounded}>
            <WeekBoard
              weekStart={FILLER_WEEK_START}
              slots={slots}
              dailyGoals={FILLER_GOALS}
              committingSlotId={committingSlotId}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
              onCommitSlot={handleCommitSlot}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  } as ViewStyle,
  bounded: {
    height: 400,
  } as ViewStyle,
  suggestBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  } as ViewStyle,
  suggestBtnText: {
    color: '#fff',
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
  loadingBox: {
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  loadingText: {
    fontSize: FontSizes.sm,
  } as TextStyle,
});

import { useState } from 'react';
import { ScrollView, Text, View, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import type { WeeklyMealSuggestion } from '@/services/week-planner-service';

export interface WeekSuggestionItem extends WeeklyMealSuggestion {
  id: string;
}

export interface DailyMacroGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface WeekSuggestionsProps {
  suggestions: WeekSuggestionItem[];
  addingAll: boolean;
  dailyGoals?: DailyMacroGoals | null;
  onAddToCalendar: (suggestion: WeekSuggestionItem) => void;
  onSkip: (id: string) => void;
  onAddAll: () => void;
}

const MEAL_ORDER: Record<string, number> = { Breakfast: 0, Lunch: 1, Dinner: 2, Snack: 3 };

function MacroPill({ label, value, unit, goal, theme }: { label: string; value: number; unit: string; goal?: number | null; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[styles.macroPill, { backgroundColor: theme.backgroundSelected }]}>
      <Text style={[styles.macroPillValue, { color: theme.text }]}>
        {Math.round(value)}{unit}{goal != null ? `/${Math.round(goal)}${unit}` : ''}
      </Text>
      <Text style={[styles.macroPillLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

function sumDayMacros(daySuggestions: WeekSuggestionItem[]) {
  return daySuggestions.reduce(
    (acc, s) => {
      for (const item of s.items) {
        acc.calories += item.estimated_macros.calories;
        acc.protein += item.estimated_macros.protein;
        acc.carbs += item.estimated_macros.carbs;
        acc.fat += item.estimated_macros.fat;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function WeekSuggestions({ suggestions, addingAll, dailyGoals, onAddToCalendar, onSkip, onAddAll }: WeekSuggestionsProps) {
  const theme = useTheme();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const days = Array.from(new Set(suggestions.map((s) => s.day))).sort((a, b) => a - b);

  if (suggestions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          All suggestions handled. Tap "Plan Week" again for more.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Button label="Add All to Calendar" onPress={onAddAll} disabled={addingAll} style={{ marginBottom: Spacing.lg }} />

      {days.map((day) => {
        const daySuggestions = suggestions.filter((s) => s.day === day);
        const dayTotals = sumDayMacros(daySuggestions);
        return (
        <View key={day} style={styles.daySection}>
          <Text style={[styles.dayHeader, { color: theme.textSecondary }]}>Day {day}</Text>
          <View style={styles.dayTotalsRow}>
            <MacroPill label="cal" value={dayTotals.calories} unit="" goal={dailyGoals?.calories} theme={theme} />
            <MacroPill label="protein" value={dayTotals.protein} unit="g" goal={dailyGoals?.protein} theme={theme} />
            <MacroPill label="carbs" value={dayTotals.carbs} unit="g" goal={dailyGoals?.carbs} theme={theme} />
            <MacroPill label="fat" value={dayTotals.fat} unit="g" goal={dailyGoals?.fat} theme={theme} />
          </View>
          {daySuggestions
            .sort((a, b) => (MEAL_ORDER[a.meal_label] ?? 9) - (MEAL_ORDER[b.meal_label] ?? 9))
            .map((s) => {
              const isExpanded = expandedIds.has(s.id);
              const totalCalories = s.items.reduce((sum, i) => sum + i.estimated_macros.calories, 0);
              const totalCost = s.items.reduce((sum, i) => sum + i.estimated_cost, 0);
              const combinedName = s.items.map((i) => i.name).join('  +  ');
              const allCook = s.items.every((i) => i.type === 'cook');
              const allBuy = s.items.every((i) => i.type === 'buy');
              const headerIcon = allCook ? 'restaurant-outline' : allBuy ? 'cart-outline' : 'fast-food-outline';
              return (
                <View key={s.id} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                  <Pressable style={styles.row} onPress={() => toggleExpanded(s.id)}>
                    <Ionicons name={headerIcon} size={16} color={theme.textSecondary} style={styles.typeIcon} />
                    <View style={styles.rowMain}>
                      <View style={styles.rowTitleLine}>
                        <Text style={[styles.mealLabelText, { color: Colors.accent }]}>{s.meal_label}</Text>
                        <Text style={[styles.rowName, { color: theme.text }]} numberOfLines={1}>{combinedName}</Text>
                      </View>
                      <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
                        {Math.round(totalCalories)} cal · ${totalCost.toFixed(0)}
                      </Text>
                    </View>
                    <Pressable
                      hitSlop={8}
                      style={styles.iconBtn}
                      onPress={(e) => { e.stopPropagation(); onAddToCalendar(s); }}
                      accessibilityRole="button"
                      accessibilityLabel="Add to calendar"
                    >
                      <Ionicons name="checkmark-circle-outline" size={22} color={Colors.accent} />
                    </Pressable>
                    <Pressable
                      hitSlop={8}
                      style={styles.iconBtn}
                      onPress={(e) => { e.stopPropagation(); onSkip(s.id); }}
                      accessibilityRole="button"
                      accessibilityLabel="Skip"
                    >
                      <Ionicons name="close-circle-outline" size={22} color={theme.textSecondary} />
                    </Pressable>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                  </Pressable>

                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      {s.items.map((item, idx) => (
                        <View key={idx} style={[styles.itemRow, { borderTopColor: theme.border }, idx === 0 && styles.itemRowFirst]}>
                          <Ionicons
                            name={item.type === 'cook' ? 'restaurant-outline' : 'cart-outline'}
                            size={13}
                            color={theme.textSecondary}
                          />
                          <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                          <View style={styles.macroRow}>
                            <MacroPill label="cal" value={item.estimated_macros.calories} unit="" theme={theme} />
                            <MacroPill label="protein" value={item.estimated_macros.protein} unit="g" theme={theme} />
                            <MacroPill label="carbs" value={item.estimated_macros.carbs} unit="g" theme={theme} />
                            <MacroPill label="fat" value={item.estimated_macros.fat} unit="g" theme={theme} />
                          </View>
                          <Text style={[styles.itemCost, { color: theme.textSecondary }]}>${item.estimated_cost.toFixed(0)}</Text>
                        </View>
                      ))}
                      <Text style={[styles.reason, { color: theme.textSecondary }]}>{s.reason}</Text>
                    </View>
                  )}
                </View>
              );
            })}
        </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl } as ViewStyle,
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl } as ViewStyle,
  emptyText: { fontSize: FontSizes.sm, textAlign: 'center' } as TextStyle,
  daySection: { marginBottom: Spacing.md } as ViewStyle,
  dayHeader: { fontSize: FontSizes.xs, fontWeight: '700', letterSpacing: 0.8, marginBottom: Spacing.xs, textTransform: 'uppercase' } as TextStyle,
  dayTotalsRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', marginBottom: Spacing.sm } as ViewStyle,
  card: { borderRadius: BorderRadius.sm, marginBottom: Spacing.xs, overflow: 'hidden' } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    minHeight: 44,
  } as ViewStyle,
  typeIcon: { flexShrink: 0 } as TextStyle,
  rowMain: { flex: 1, minWidth: 0 } as ViewStyle,
  rowTitleLine: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs } as ViewStyle,
  mealLabelText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', flexShrink: 0 } as TextStyle,
  rowName: { fontSize: FontSizes.sm, fontWeight: '600', flexShrink: 1 } as TextStyle,
  rowSub: { fontSize: FontSizes.xs, marginTop: 1 } as TextStyle,
  iconBtn: { padding: 2 } as ViewStyle,
  expandedContent: { paddingHorizontal: Spacing.sm, paddingBottom: Spacing.sm, gap: Spacing.xs } as ViewStyle,
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap', paddingTop: Spacing.xs } as ViewStyle,
  itemRowFirst: { paddingTop: 0 } as ViewStyle,
  itemName: { fontSize: FontSizes.xs, fontWeight: '600', flexBasis: '100%' } as TextStyle,
  itemCost: { fontSize: FontSizes.xs, fontWeight: '600' } as TextStyle,
  macroRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' } as ViewStyle,
  macroPill: { paddingVertical: 4, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.sm, alignItems: 'center' } as ViewStyle,
  macroPillValue: { fontSize: FontSizes.xs, fontWeight: '700' } as TextStyle,
  macroPillLabel: { fontSize: 10, fontWeight: '600' } as TextStyle,
  reason: { fontSize: FontSizes.xs, fontStyle: 'italic', lineHeight: 16, marginTop: Spacing.xs } as TextStyle,
});

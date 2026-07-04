import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { RecipePickerModal } from '@/components/calendar/recipe-picker-modal';
import { AddFoodItemModal } from '@/components/week-planner/AddFoodItemModal';
import type { MealSlotFoodInput } from '@/services/meal-plan-service';
import type { Recipe } from '@/models/recipe';
import type { WeeklyMealItem } from '@/services/week-planner-service';

export type MealLabel = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export type PlannedItem =
  | ({ kind: 'ai' } & WeeklyMealItem)
  | { kind: 'recipe'; recipe: Recipe }
  | { kind: 'food'; food: MealSlotFoodInput };

export interface PlannedSlot {
  id: string;
  day: number; // 1-7, relative to the selected week's Sunday
  meal_label: MealLabel;
  items: PlannedItem[];
  reason?: string;
  committed: boolean;
}

export interface DailyMacroGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const MEAL_ORDER: Record<MealLabel, number> = { Breakfast: 0, Lunch: 1, Dinner: 2, Snack: 3 };

export function mealLabelsForCount(n: number): MealLabel[] {
  const base: MealLabel[] = n <= 1 ? ['Dinner'] : n === 2 ? ['Lunch', 'Dinner'] : ['Breakfast', 'Lunch', 'Dinner'];
  const extra = Math.max(0, n - base.length);
  return [...base, ...(Array(extra).fill('Snack') as MealLabel[])];
}

export function buildEmptyBoard(mealsPerDay: number): PlannedSlot[] {
  const labels = mealLabelsForCount(mealsPerDay);
  const slots: PlannedSlot[] = [];
  for (let day = 1; day <= 7; day++) {
    labels.forEach((label, idx) => {
      slots.push({ id: `${day}-${idx}`, day, meal_label: label, items: [], committed: false });
    });
  }
  return slots;
}

interface ItemDisplay {
  name: string;
  icon: 'restaurant-outline' | 'cart-outline';
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  cost: number | null;
}

function displayForItem(item: PlannedItem): ItemDisplay {
  if (item.kind === 'ai') {
    return {
      name: item.name,
      icon: item.type === 'cook' ? 'restaurant-outline' : 'cart-outline',
      calories: item.estimated_macros.calories,
      protein: item.estimated_macros.protein,
      carbs: item.estimated_macros.carbs,
      fat: item.estimated_macros.fat,
      cost: item.estimated_cost,
    };
  }
  if (item.kind === 'recipe') {
    return {
      name: item.recipe.title,
      icon: 'restaurant-outline',
      calories: item.recipe.calories_per_serving ?? null,
      protein: item.recipe.protein_per_serving ?? null,
      carbs: item.recipe.carbs_per_serving ?? null,
      fat: item.recipe.fat_per_serving ?? null,
      cost: null,
    };
  }
  return {
    name: item.food.food_name,
    icon: 'cart-outline',
    calories: item.food.calories ?? null,
    protein: item.food.protein ?? null,
    carbs: item.food.carbs ?? null,
    fat: item.food.fat ?? null,
    cost: null,
  };
}

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

function dateForBoardDay(weekStart: Date, day: number): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + (day - 1));
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

interface WeekBoardProps {
  weekStart: Date;
  slots: PlannedSlot[];
  dailyGoals?: DailyMacroGoals | null;
  committingSlotId: string | null;
  onAddItem: (slotId: string, item: PlannedItem) => void;
  onRemoveItem: (slotId: string, itemIndex: number) => void;
  onCommitSlot: (slotId: string) => void;
}

export function WeekBoard({ slots, weekStart, dailyGoals, committingSlotId, onAddItem, onRemoveItem, onCommitSlot }: WeekBoardProps) {
  const theme = useTheme();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [pickerTarget, setPickerTarget] = useState<{ slotId: string; kind: 'recipe' | 'food' } | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const days = Array.from(new Set(slots.map((s) => s.day))).sort((a, b) => a - b);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {days.map((day) => {
        const daySlots = slots
          .filter((s) => s.day === day)
          .sort((a, b) => MEAL_ORDER[a.meal_label] - MEAL_ORDER[b.meal_label]);
        const dayTotals = daySlots.reduce(
          (acc, s) => {
            for (const item of s.items) {
              const d = displayForItem(item);
              acc.calories += d.calories ?? 0;
              acc.protein += d.protein ?? 0;
              acc.carbs += d.carbs ?? 0;
              acc.fat += d.fat ?? 0;
            }
            return acc;
          },
          { calories: 0, protein: 0, carbs: 0, fat: 0 },
        );

        return (
          <View key={day} style={styles.daySection}>
            <Text style={[styles.dayHeader, { color: theme.textSecondary }]}>{dateForBoardDay(weekStart, day)}</Text>
            <View style={styles.dayTotalsRow}>
              <MacroPill label="cal" value={dayTotals.calories} unit="" goal={dailyGoals?.calories} theme={theme} />
              <MacroPill label="protein" value={dayTotals.protein} unit="g" goal={dailyGoals?.protein} theme={theme} />
              <MacroPill label="carbs" value={dayTotals.carbs} unit="g" goal={dailyGoals?.carbs} theme={theme} />
              <MacroPill label="fat" value={dayTotals.fat} unit="g" goal={dailyGoals?.fat} theme={theme} />
            </View>

            {daySlots.map((slot) => {
              if (slot.committed) {
                return (
                  <View key={`${slot.id}-committed`} style={[styles.card, styles.committedCard, { backgroundColor: theme.backgroundSelected }]}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                    <Text style={[styles.committedText, { color: theme.textSecondary }]} numberOfLines={1}>
                      {slot.meal_label} — added to your calendar
                    </Text>
                  </View>
                );
              }

              if (slot.items.length === 0) {
                return (
                  <View key={`${slot.id}-empty`} style={[styles.card, styles.emptyCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <Text style={[styles.mealLabelText, { color: Colors.accent }]}>{slot.meal_label}</Text>
                    <View style={styles.emptyActions}>
                      <Pressable
                        style={[styles.emptyActionBtn, { borderColor: theme.border }]}
                        onPress={() => setPickerTarget({ slotId: slot.id, kind: 'recipe' })}
                      >
                        <Ionicons name="restaurant-outline" size={14} color={theme.textSecondary} />
                        <Text style={[styles.emptyActionText, { color: theme.textSecondary }]}>Recipe</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.emptyActionBtn, { borderColor: theme.border }]}
                        onPress={() => setPickerTarget({ slotId: slot.id, kind: 'food' })}
                      >
                        <Ionicons name="cart-outline" size={14} color={theme.textSecondary} />
                        <Text style={[styles.emptyActionText, { color: theme.textSecondary }]}>Food Item</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              }

              const isExpanded = expandedIds.has(slot.id);
              const isCommitting = committingSlotId === slot.id;
              const displays = slot.items.map(displayForItem);
              const totalCalories = displays.reduce((sum, d) => sum + (d.calories ?? 0), 0);
              const combinedName = displays.map((d) => d.name).join('  +  ');
              const headerIcon = displays.every((d) => d.icon === 'restaurant-outline') ? 'restaurant-outline' : displays.every((d) => d.icon === 'cart-outline') ? 'cart-outline' : 'fast-food-outline';

              return (
                <View key={`${slot.id}-filled`} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                  <Pressable style={styles.row} onPress={() => toggleExpanded(slot.id)}>
                    <Ionicons name={headerIcon} size={16} color={theme.textSecondary} style={styles.typeIcon} />
                    <View style={styles.rowMain}>
                      <View style={styles.rowTitleLine}>
                        <Text style={[styles.mealLabelText, { color: Colors.accent }]}>{slot.meal_label}</Text>
                        <Text style={[styles.rowName, { color: theme.text }]} numberOfLines={1}>{combinedName}</Text>
                      </View>
                      <Text style={[styles.rowSub, { color: theme.textSecondary }]}>{Math.round(totalCalories)} cal</Text>
                    </View>
                    {isCommitting ? (
                      <ActivityIndicator size="small" color={Colors.accent} />
                    ) : (
                      <Pressable
                        hitSlop={8}
                        style={styles.iconBtn}
                        onPress={(e) => { e.stopPropagation(); onCommitSlot(slot.id); }}
                        accessibilityRole="button"
                        accessibilityLabel="Add to calendar"
                      >
                        <Ionicons name="checkmark-circle-outline" size={22} color={Colors.accent} />
                      </Pressable>
                    )}
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                  </Pressable>

                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      {slot.items.map((item, idx) => {
                        const d = displays[idx];
                        return (
                          <View key={idx} style={[styles.itemRow, { borderTopColor: theme.border }, idx === 0 && styles.itemRowFirst]}>
                            <Ionicons name={d.icon} size={13} color={theme.textSecondary} />
                            <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>{d.name}</Text>
                            <View style={styles.macroRow}>
                              {d.calories != null && <MacroPill label="cal" value={d.calories} unit="" theme={theme} />}
                              {d.protein != null && <MacroPill label="protein" value={d.protein} unit="g" theme={theme} />}
                              {d.carbs != null && <MacroPill label="carbs" value={d.carbs} unit="g" theme={theme} />}
                              {d.fat != null && <MacroPill label="fat" value={d.fat} unit="g" theme={theme} />}
                            </View>
                            <Pressable hitSlop={8} onPress={() => onRemoveItem(slot.id, idx)} accessibilityRole="button" accessibilityLabel="Remove item">
                              <Ionicons name="close-circle-outline" size={18} color={theme.textSecondary} />
                            </Pressable>
                          </View>
                        );
                      })}
                      {slot.reason && <Text style={[styles.reason, { color: theme.textSecondary }]}>{slot.reason}</Text>}
                      <View style={styles.addMoreRow}>
                        <Pressable
                          style={[styles.emptyActionBtn, { borderColor: theme.border }]}
                          onPress={() => setPickerTarget({ slotId: slot.id, kind: 'recipe' })}
                        >
                          <Ionicons name="restaurant-outline" size={14} color={theme.textSecondary} />
                          <Text style={[styles.emptyActionText, { color: theme.textSecondary }]}>+ Recipe</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.emptyActionBtn, { borderColor: theme.border }]}
                          onPress={() => setPickerTarget({ slotId: slot.id, kind: 'food' })}
                        >
                          <Ionicons name="cart-outline" size={14} color={theme.textSecondary} />
                          <Text style={[styles.emptyActionText, { color: theme.textSecondary }]}>+ Food Item</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        );
      })}

      <RecipePickerModal
        visible={pickerTarget?.kind === 'recipe'}
        onClose={() => setPickerTarget(null)}
        onSelect={(recipe) => {
          if (pickerTarget) onAddItem(pickerTarget.slotId, { kind: 'recipe', recipe });
          setPickerTarget(null);
        }}
      />
      <AddFoodItemModal
        visible={pickerTarget?.kind === 'food'}
        onClose={() => setPickerTarget(null)}
        onSelect={(food) => {
          if (pickerTarget) onAddItem(pickerTarget.slotId, { kind: 'food', food });
          setPickerTarget(null);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl } as ViewStyle,
  daySection: { marginBottom: Spacing.md } as ViewStyle,
  dayHeader: { fontSize: FontSizes.xs, fontWeight: '700', letterSpacing: 0.8, marginBottom: Spacing.xs, textTransform: 'uppercase' } as TextStyle,
  dayTotalsRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', marginBottom: Spacing.sm } as ViewStyle,
  card: { borderRadius: BorderRadius.sm, marginBottom: Spacing.xs, overflow: 'hidden' } as ViewStyle,
  committedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    minHeight: 40,
    opacity: 0.7,
  } as ViewStyle,
  committedText: { fontSize: FontSizes.xs, fontWeight: '600', flex: 1 } as TextStyle,
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    minHeight: 44,
  } as ViewStyle,
  emptyActions: { flexDirection: 'row', gap: Spacing.xs } as ViewStyle,
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
  } as ViewStyle,
  emptyActionText: { fontSize: FontSizes.xs, fontWeight: '600' } as TextStyle,
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
  macroRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', flex: 1 } as ViewStyle,
  macroPill: { paddingVertical: 4, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.sm, alignItems: 'center' } as ViewStyle,
  macroPillValue: { fontSize: FontSizes.xs, fontWeight: '700' } as TextStyle,
  macroPillLabel: { fontSize: 10, fontWeight: '600' } as TextStyle,
  reason: { fontSize: FontSizes.xs, fontStyle: 'italic', lineHeight: 16, marginTop: Spacing.xs } as TextStyle,
  addMoreRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs } as ViewStyle,
});

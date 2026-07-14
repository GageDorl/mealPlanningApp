import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions, type TextStyle, type ViewStyle } from 'react-native';
import { WoodTexture } from '@/components/WoodTexture';
import { useRouter } from 'expo-router';
import { usePowerSync, useQuery } from '@powersync/react-native';
import { Colors, Spacing, FontSizes, MaxContentWidth, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getCachedUserId } from '@/services/supabase';
import * as mealPlanService from '@/services/meal-plan-service';
import type { PantryStapleRow } from '@/services/grocery-service';
import { mapSearchResultToFoodInput, lookupIngredient } from '@/services/fatsecret';
import { fetchWeeklySuggestions, type WeeklyQuestionnaire } from '@/services/week-planner-service';
import { PlanWeekQuestionnaire } from '@/components/week-planner/PlanWeekQuestionnaire';
import { WeekBoard, buildEmptyBoard, type PlannedSlot, type PlannedItem, type DailyMacroGoals } from '@/components/week-planner/WeekBoard';
import { WeekPickerModal } from '@/components/calendar/week-picker-modal';

interface MacroGoalRow {
  macro_name: string;
  daily_target: number;
}

function getSunday(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isoDateForBoardDay(weekStart: Date, day: number): string {
  return isoDate(addDays(weekStart, day - 1));
}

function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const s = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const e = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${s} – ${e}`;
}

interface PsDb {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
  getAll<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

async function nextSlotDisplayOrder(db: PsDb, mealPlanId: string, date: string): Promise<number> {
  const rows = await db.getAll<{ display_order: number }>(
    'SELECT display_order FROM meal_slots WHERE meal_plan_id = ? AND date = ? ORDER BY display_order DESC LIMIT 1',
    [mealPlanId, date],
  );
  return (rows[0]?.display_order ?? -1) + 1;
}

// "buy"-type AI items get matched to a real food (personal library, community, or FatSecret —
// top search result) so macros are accurate; unmatched items fall back to Claude's estimate.
async function matchAiItemToFood(item: PlannedItem & { kind: 'ai' }, db: Parameters<typeof lookupIngredient>[2]): Promise<mealPlanService.MealSlotFoodInput> {
  // Restaurant/fast-food orders never belong on a grocery list; grocery-purchasable "buy"
  // items do. "cook" items have no ingredient breakdown, so they're excluded either way.
  const isGroceryItem = item.type === 'buy' && !item.restaurant;
  if (item.type === 'buy') {
    try {
      const response = await lookupIngredient(item.name, 1, db);
      const top = response.results[0];
      if (top) return { ...mapSearchResultToFoodInput(top), is_grocery_item: isGroceryItem };
    } catch {
      // fall through to AI estimate below
    }
  }
  return {
    food_name: item.name,
    brand_name: null,
    serving_size_amount: null,
    serving_size_unit: null,
    servings_planned: 1,
    calories: item.estimated_macros.calories,
    protein: item.estimated_macros.protein,
    carbs: item.estimated_macros.carbs,
    fat: item.estimated_macros.fat,
    source: 'ai_estimate',
    source_id: null,
    is_grocery_item: isGroceryItem,
  };
}

export default function PlanWeekScreen() {
  const router = useRouter();
  const theme = useTheme();
  const db = usePowerSync();
  const { width, height } = useWindowDimensions();
  const { profile } = useUserProfile();
  const userId = getCachedUserId() ?? '';

  const mealsPerDay = profile?.user.meals_per_day ?? 3;

  const { data: goalRows } = useQuery<MacroGoalRow>(
    'SELECT macro_name, daily_target FROM macro_goals WHERE user_id = ? AND is_active = 1',
    [userId],
  );

  // Live query (not a one-off fetch) so the questionnaire's pantry section — and the pantry
  // items sent with the suggestion request — reflect edits made while this screen is open.
  const { data: pantryStaples } = useQuery<PantryStapleRow>(
    'SELECT * FROM pantry_staples WHERE user_id = ? ORDER BY ingredient_name',
    [userId],
  );
  const dailyGoals = useMemo<DailyMacroGoals | null>(() => {
    if (goalRows.length === 0) return null;
    const map: Record<string, number> = {};
    for (const g of goalRows) map[g.macro_name] = g.daily_target;
    return { calories: map['calories'] ?? 0, protein: map['protein'] ?? 0, carbs: map['carbs'] ?? 0, fat: map['fat'] ?? 0 };
  }, [goalRows]);

  const [weekOffset, setWeekOffset] = useState(0);
  const [weekPickerVisible, setWeekPickerVisible] = useState(false);
  const weekStart = useMemo(() => getSunday(addDays(new Date(), weekOffset * 7)), [weekOffset]);

  const [slots, setSlots] = useState<PlannedSlot[]>(() => buildEmptyBoard(mealsPerDay));
  useEffect(() => {
    setSlots(buildEmptyBoard(mealsPerDay));
  }, [weekOffset, mealsPerDay]);

  const [suggestModalVisible, setSuggestModalVisible] = useState(false);
  const [submittingSuggestions, setSubmittingSuggestions] = useState(false);
  const [committingSlotId, setCommittingSlotId] = useState<string | null>(null);
  const [committingAll, setCommittingAll] = useState(false);
  const [commitAllProgress, setCommitAllProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGetSuggestions = async (questionnaire: WeeklyQuestionnaire) => {
    setSubmittingSuggestions(true);
    setError(null);
    try {
      // Read from the live local PowerSync query, not a fresh server round-trip — the user may
      // have just edited their pantry, and we want whatever's on-device right now, not a Postgres
      // read that could lag behind an edit that hasn't finished syncing up yet.
      const pantryItems = pantryStaples.map((p) => ({ name: p.ingredient_name, quantity: p.quantity, unit: p.unit }));
      const results = await fetchWeeklySuggestions(questionnaire, pantryItems);
      setSlots((prev) => {
        const next = [...prev];
        const usedIds = new Set<string>();
        for (const r of results) {
          const targetIdx = next.findIndex(
            (s) => s.day === r.day && s.meal_label === r.meal_label && s.items.length === 0 && !s.committed && !usedIds.has(s.id),
          );
          if (targetIdx === -1) continue;
          usedIds.add(next[targetIdx].id);
          next[targetIdx] = {
            ...next[targetIdx],
            items: r.items.map((i) => ({ kind: 'ai' as const, ...i })),
            reason: r.reason,
          };
        }
        return next;
      });
      setSuggestModalVisible(false);
    } catch (err) {
      setError((err as Error).message ?? 'Failed to get suggestions');
    } finally {
      setSubmittingSuggestions(false);
    }
  };

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

  // Writes a planned slot's items to the real calendar. Caller is responsible for updating
  // local `slots` state (marking committed) once this resolves.
  const commitPlannedSlot = useCallback(async (slot: PlannedSlot, mealPlanId: string) => {
    const targetDate = isoDateForBoardDay(weekStart, slot.day);
    const displayOrder = await nextSlotDisplayOrder(db, mealPlanId, targetDate);
    const newSlot = await mealPlanService.createSlot(db, {
      mealPlanId,
      label: slot.meal_label,
      date: targetDate,
      displayOrder,
      icon: null,
    });
    // Sequential, not Promise.all — addFoodToSlot reads the current max display_order
    // before inserting, so concurrent calls would race and collide on the same order.
    for (const item of slot.items) {
      if (item.kind === 'recipe') {
        await mealPlanService.addRecipeToSlot(db, newSlot.id, item.recipe.id);
      } else if (item.kind === 'food') {
        await mealPlanService.addFoodToSlot(db, newSlot.id, item.food);
      } else {
        const input = await matchAiItemToFood(item, db);
        await mealPlanService.addFoodToSlot(db, newSlot.id, input);
      }
    }
  }, [db, weekStart]);

  const handleCommitSlot = useCallback(async (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot || slot.items.length === 0 || slot.committed) return;
    if (!userId) { setError('Not signed in'); return; }
    setCommittingSlotId(slotId);
    setError(null);
    try {
      const mealPlanId = await mealPlanService.ensureMealPlan(db, userId, isoDate(weekStart));
      await commitPlannedSlot(slot, mealPlanId);
      setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, committed: true } : s)));
    } catch (err) {
      setError((err as Error).message ?? 'Failed to add to your calendar');
    } finally {
      setCommittingSlotId(null);
    }
  }, [slots, userId, db, weekStart, commitPlannedSlot]);

  const handleCommitAll = useCallback(async () => {
    const toCommit = slots.filter((s) => s.items.length > 0 && !s.committed);
    if (toCommit.length === 0) return;
    if (!userId) { setError('Not signed in'); return; }
    setCommittingAll(true);
    setCommitAllProgress({ done: 0, total: toCommit.length });
    setError(null);
    try {
      const mealPlanId = await mealPlanService.ensureMealPlan(db, userId, isoDate(weekStart));
      const committedIds: string[] = [];
      // Sequential — parallel createSlot calls for the same day would race on
      // nextSlotDisplayOrder and could collide on the same display_order.
      for (const [i, slot] of toCommit.entries()) {
        await commitPlannedSlot(slot, mealPlanId);
        committedIds.push(slot.id);
        setCommitAllProgress({ done: i + 1, total: toCommit.length });
      }
      setSlots((prev) => prev.map((s) => (committedIds.includes(s.id) ? { ...s, committed: true } : s)));
    } catch (err) {
      setError((err as Error).message ?? 'Failed to add meals to your calendar');
    } finally {
      setCommittingAll(false);
      setCommitAllProgress(null);
    }
  }, [slots, userId, db, weekStart, commitPlannedSlot]);

  const hasFillableWork = slots.some((s) => s.items.length > 0 && !s.committed);

  return (
    <View style={{ flex: 1 }}>
      <WoodTexture width={width} height={height} style={StyleSheet.absoluteFill} />
      <View style={[styles.root, { backgroundColor: 'transparent' }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Text style={[styles.backIcon, { color: Colors.accent }]}>‹</Text>
          </Pressable>
          <Pressable style={styles.headerCenter} onPress={() => setWeekPickerVisible(true)}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Plan Your Week</Text>
            <Text style={[styles.weekLabel, { color: Colors.accent }]}>{formatWeekRange(weekStart)} ▾</Text>
          </Pressable>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: Colors.accent }]}
            onPress={() => setSuggestModalVisible(true)}
          >
            <Text style={styles.actionBtnText}>Get Suggestions</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnSecondary, { borderColor: theme.border }, !hasFillableWork && styles.actionBtnDisabled]}
            onPress={handleCommitAll}
            disabled={!hasFillableWork || committingAll}
          >
            {committingAll ? (
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <Text style={[styles.actionBtnSecondaryText, { color: theme.text }]}>Add All to Calendar</Text>
            )}
          </Pressable>
        </View>

        {commitAllProgress && (
          <View style={styles.progressWrap}>
            <View style={[styles.progressTrack, { backgroundColor: theme.backgroundElement }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: Colors.accent, width: `${(commitAllProgress.done / commitAllProgress.total) * 100}%` },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.textSecondary }]}>
              Adding {commitAllProgress.done} of {commitAllProgress.total} meals…
            </Text>
          </View>
        )}

        {error && <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>}

        <WeekBoard
          weekStart={weekStart}
          slots={slots}
          dailyGoals={dailyGoals}
          committingSlotId={committingSlotId}
          onAddItem={handleAddItem}
          onRemoveItem={handleRemoveItem}
          onCommitSlot={handleCommitSlot}
        />
      </View>

      <WeekPickerModal
        visible={weekPickerVisible}
        weekOffset={weekOffset}
        onSelect={setWeekOffset}
        onClose={() => setWeekPickerVisible(false)}
      />

      <Modal visible={suggestModalVisible} transparent animationType="slide" onRequestClose={() => setSuggestModalVisible(false)}>
        <Pressable style={styles.suggestOverlay} onPress={() => setSuggestModalVisible(false)}>
          <Pressable style={[styles.suggestSheet, { backgroundColor: theme.background }]} onPress={() => {}}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
            <Text style={[styles.suggestTitle, { color: theme.text }]}>Get Suggestions</Text>
            {submittingSuggestions ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.accent} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Finding meals for your week…</Text>
              </View>
            ) : (
              <PlanWeekQuestionnaire
                submitting={submittingSuggestions}
                mealsPerDay={mealsPerDay}
                pantryStaples={pantryStaples}
                onSubmit={handleGetSuggestions}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  } as ViewStyle,
  backBtn: {
    width: 28,
    flexShrink: 0,
  } as ViewStyle,
  backIcon: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  } as TextStyle,
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  } as ViewStyle,
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  } as TextStyle,
  weekLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    marginTop: 2,
  } as TextStyle,
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  } as ViewStyle,
  actionBtn: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  } as ViewStyle,
  actionBtnSecondary: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  } as ViewStyle,
  actionBtnDisabled: {
    opacity: 0.5,
  } as ViewStyle,
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
  actionBtnSecondaryText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
  progressWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  } as ViewStyle,
  progressTrack: {
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  } as ViewStyle,
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  } as ViewStyle,
  progressText: {
    fontSize: FontSizes.xs,
    textAlign: 'center',
  } as TextStyle,
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xxl,
  } as ViewStyle,
  loadingText: {
    fontSize: FontSizes.sm,
  } as TextStyle,
  errorText: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  } as TextStyle,
  suggestOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  } as ViewStyle,
  suggestSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.sm,
    height: '85%',
  } as ViewStyle,
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  } as ViewStyle,
  suggestTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    textAlign: 'center',
    paddingBottom: Spacing.sm,
  } as TextStyle,
});

import { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { triggerSync } from '@/utils/trigger-sync';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { layout } from '@/styles/layout';
import { typography } from '@/styles/typography';
import { useMacros } from '@/hooks/use-macros';
import { ProgressRing } from '@/components/macros/progress-ring';
import { MacroProgressBar } from '@/components/macros/macro-progress-bar';
import { MealMacroBreakdown } from '@/components/macros/meal-macro-breakdown';
import { WeekSummaryStrip } from '@/components/macros/week-summary-strip';
import { MacroTrendChart } from '@/components/macros/macro-trend-chart';
import { WeightSection } from '@/components/macros/weight-section';
import { MacroAdjustmentCard } from '@/components/MacroAdjustmentCard';
import { DatePickerModal } from '@/components/ui/date-picker-modal';
import { getCachedUserId } from '@/services/supabase';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(date: Date): string {
  return `${DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export default function MacrosScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { selectedDate, dailyProgress, goalRows, error, goToPrevDay, goToNextDay, goToToday, goToDate, refresh, deleteMealSlot } = useMacros();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRemaining, setShowRemaining] = useState(false);
  const userId = getCachedUserId();

  const caloriesGoal = goalRows.find((r) => r.macro_name === 'calories');
  const macroGoals = goalRows.filter((r) => r.macro_name !== 'calories');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await triggerSync();
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const caloriesMacro = dailyProgress?.macros.find((m) => m.macro_name === 'calories');
  const otherMacros = dailyProgress?.macros.filter((m) => m.macro_name !== 'calories') ?? [];
  const today = isToday(selectedDate);

  return (
    <View style={[layout.screenContainer, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[layout.rowSpaceBetween, { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md }]}>
        <Pressable onPress={goToPrevDay} style={styles.navButton}>
          <Text style={[styles.navArrow, { color: Colors.accent }]}>‹</Text>
        </Pressable>

        <View style={styles.dateCenter}>
          <Pressable onPress={() => setPickerVisible(true)}>
            <Text style={[typography.headingLg, { color: theme.text }]}>{formatDate(selectedDate)}</Text>
          </Pressable>
          {!today && (
            <Pressable onPress={goToToday}>
              <Text style={[styles.todayBadge, { color: Colors.accent }]}>Today</Text>
            </Pressable>
          )}
        </View>

        <Pressable onPress={goToNextDay} style={styles.navButton}>
          <Text style={[styles.navArrow, { color: Colors.accent }]}>›</Text>
        </Pressable>
      </View>

      <WeekSummaryStrip selectedDate={selectedDate} goToDate={goToDate} />

      {error ? (
        <View style={layout.centered}>
          <Text style={[styles.statusText, { color: Colors.light.error }]}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={layout.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} colors={[Colors.accent]} />}
        >
          {/* Macro goals bar */}
          <Pressable
            onPress={() => router.push('/(tabs)/macros/macro-planner')}
            style={[styles.goalsBar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          >
            {caloriesGoal ? (
              <View style={styles.goalsBarInner}>
                <Text style={[styles.goalsCalories, { color: theme.text }]}>
                  {caloriesGoal.daily_target.toLocaleString()} kcal
                </Text>
                <View style={styles.goalsMacros}>
                  {macroGoals.map((g) => (
                    <Text key={g.macro_name} style={[styles.goalsMacroItem, { color: theme.textSecondary }]}>
                      {g.daily_target}{g.unit} {g.macro_name}
                    </Text>
                  ))}
                </View>
                <Text style={[styles.goalsChevron, { color: theme.textSecondary }]}>›</Text>
              </View>
            ) : (
              <View style={styles.goalsBarInner}>
                <Text style={[styles.goalsEmpty, { color: Colors.accent }]}>Set macro goals →</Text>
              </View>
            )}
          </Pressable>

          {/* Calories ring */}
          {caloriesMacro && (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Calories</Text>
                <Pressable
                  onPress={() => setShowRemaining((v) => !v)}
                  style={[styles.viewToggle, { borderColor: theme.border }, showRemaining ? { backgroundColor: theme.backgroundSelected } : { backgroundColor: theme.backgroundElement, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 2, elevation: 2 }]}
                >
                  <Text style={[styles.viewToggleText, { color: theme.textSecondary }]}>
                    {showRemaining ? 'Remaining' : 'Consumed'}
                  </Text>
                </Pressable>
              </View>
              <ProgressRing
                current={caloriesMacro.current}
                goal={caloriesMacro.goal}
                unit={caloriesMacro.unit}
                label="Calories"
                color={caloriesMacro.color}
                size={120}
                showRemaining={showRemaining}
              />
            </View>
          )}

          {/* Other macro progress bars */}
          {otherMacros.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Macros</Text>
              <View style={styles.barsContainer}>
                {otherMacros.map((macro) => (
                  <MacroProgressBar
                    key={macro.macro_name}
                    label={macro.label}
                    current={macro.current}
                    goal={macro.goal}
                    unit={macro.unit}
                    color={macro.color}
                    showRemaining={showRemaining}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Per-meal breakdown */}
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Meal Breakdown</Text>
            <MealMacroBreakdown entries={dailyProgress?.meal_breakdown ?? []} onDeletePlannedMeal={deleteMealSlot} />
          </View>

          {/* Weight logging */}
          {userId && (
            <WeightSection userId={userId} selectedDate={selectedDate} />
          )}

          {/* Macro trend chart */}
          {userId && (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Trends</Text>
              <MacroTrendChart userId={userId} />
            </View>
          )}

          {/* Adaptive macro adjustment — only visible when 7+ days of data exist */}
          {userId && (
            <MacroAdjustmentCard userId={userId} />
          )}
        </ScrollView>
      )}

      <DatePickerModal
        visible={pickerVisible}
        currentDate={selectedDate}
        onSelect={goToDate}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  navButton: {
    padding: Spacing.sm,
  } as ViewStyle,
  navArrow: {
    fontSize: 32,
    fontWeight: '300',
  } as TextStyle,
  dateCenter: {
    alignItems: 'center',
  } as ViewStyle,
  todayBadge: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    marginTop: 2,
  } as TextStyle,
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  } as ViewStyle,
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Spacing.md,
  } as ViewStyle,
  viewToggle: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
  } as ViewStyle,
  viewToggleText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  } as TextStyle,
  barsContainer: {
    width: '100%',
    gap: Spacing.md,
  } as ViewStyle,
  statusText: {
    fontSize: FontSizes.md,
  } as TextStyle,
  goalsBar: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  } as ViewStyle,
  goalsBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  } as ViewStyle,
  goalsCalories: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    flexShrink: 0,
  } as TextStyle,
  goalsMacros: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  } as ViewStyle,
  goalsMacroItem: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  } as TextStyle,
  goalsChevron: {
    fontSize: 18,
    fontWeight: '300',
    flexShrink: 0,
  } as TextStyle,
  goalsEmpty: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  } as TextStyle,
});

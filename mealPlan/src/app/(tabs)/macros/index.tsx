import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LoadingModal } from '@/components/ui/loading-modal';
import { Colors, FontSizes, MaxContentWidth, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useMacros } from '@/hooks/use-macros';
import { ProgressRing } from '@/components/macros/progress-ring';
import { MacroProgressBar } from '@/components/macros/macro-progress-bar';
import { MealMacroBreakdown } from '@/components/macros/meal-macro-breakdown';
import { WeekSummaryStrip } from '@/components/macros/week-summary-strip';
import { MacroTrendChart } from '@/components/macros/macro-trend-chart';
import { DatePickerModal } from '@/components/ui/date-picker-modal';

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
  const { selectedDate, dailyProgress, loading, error, goToPrevDay, goToNextDay, goToToday, goToDate, refresh, deleteMealSlot } = useMacros();
  const [pickerVisible, setPickerVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const caloriesMacro = dailyProgress?.macros.find((m) => m.macro_name === 'calories');
  const otherMacros = dailyProgress?.macros.filter((m) => m.macro_name !== 'calories') ?? [];
  const today = isToday(selectedDate);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goToPrevDay} style={styles.navButton}>
          <Text style={[styles.navArrow, { color: Colors.accent }]}>‹</Text>
        </Pressable>

        <View style={styles.dateCenter}>
          <Pressable onPress={() => setPickerVisible(true)}>
            <Text style={[styles.dateLabel, { color: theme.text }]}>{formatDate(selectedDate)}</Text>
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

      <LoadingModal visible={loading} message="Loading macros…" />
      {!loading && error ? (
        <View style={styles.center}>
          <Text style={[styles.statusText, { color: Colors.light.error }]}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Calories ring */}
          {caloriesMacro && (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <ProgressRing
                current={caloriesMacro.current}
                goal={caloriesMacro.goal}
                unit={caloriesMacro.unit}
                label="Calories"
                color={caloriesMacro.color}
                size={120}
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

          {/* Macro trend chart */}
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Trends</Text>
            <MacroTrendChart />
          </View>
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
  container: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    marginHorizontal: 'auto',
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  } as ViewStyle,
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
  dateLabel: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  } as TextStyle,
  todayBadge: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    marginTop: 2,
  } as TextStyle,
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  } as ViewStyle,
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  } as ViewStyle,
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  statusText: {
    fontSize: FontSizes.md,
  } as TextStyle,
});

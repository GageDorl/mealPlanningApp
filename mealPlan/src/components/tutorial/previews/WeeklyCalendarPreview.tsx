import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';

const MEAL_BLUE = '#4A90D9';

// Sun=0 … Sat=6 (matches real calendar)
const DAYS: { label: string; date: number; hasMeal: boolean; today?: boolean }[] = [
  { label: 'Sun', date: 22, hasMeal: false },
  { label: 'Mon', date: 23, hasMeal: true },
  { label: 'Tue', date: 24, hasMeal: true },
  { label: 'Wed', date: 25, hasMeal: true },
  { label: 'Thu', date: 26, hasMeal: true },
  { label: 'Fri', date: 27, hasMeal: true, today: true },
  { label: 'Sat', date: 28, hasMeal: false },
];

const HOURS = ['8 AM', '12 PM', '6 PM'] as const;

// Which days have an event at each hour row (by index)
const EVENTS: Record<string, number[]> = {
  '8 AM':  [1, 3, 5],       // Mon, Wed, Fri
  '12 PM': [1, 2, 4, 5],    // Mon, Tue, Thu, Fri
  '6 PM':  [2, 4, 5],       // Tue, Thu, Fri
};

export function WeeklyCalendarPreview() {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {/* Day header row */}
      <View style={[styles.headerRow, { borderBottomColor: theme.border }]}>
        <View style={styles.gutter} />
        {DAYS.map((d) => (
          <View
            key={d.label}
            style={[styles.dayCell, d.today && { backgroundColor: Colors.accent, borderRadius: BorderRadius.sm }]}
          >
            <Text style={[styles.dayName, { color: d.today ? '#fff' : theme.textSecondary }]}>
              {d.label}
            </Text>
            <Text style={[styles.dayNum, { color: d.today ? '#fff' : theme.text }]}>
              {d.date}
            </Text>
            {!d.today && d.hasMeal && (
              <View style={[styles.mealDot, { backgroundColor: Colors.accent }]} />
            )}
          </View>
        ))}
      </View>

      {/* Time grid */}
      {HOURS.map((hour) => (
        <View key={hour} style={[styles.timeRow, { borderBottomColor: theme.border }]}>
          <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>{hour}</Text>
          {DAYS.map((d, i) => (
            <View key={d.label} style={styles.dayCol}>
              {EVENTS[hour].includes(i) && (
                <View
                  style={[
                    styles.eventBlock,
                    {
                      backgroundColor: `${MEAL_BLUE}55`,
                      borderLeftColor: MEAL_BLUE,
                    },
                  ]}
                />
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  } as ViewStyle,
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: Spacing.xs,
    marginBottom: 2,
    alignItems: 'flex-end',
  } as ViewStyle,
  gutter: {
    width: 32,
  } as ViewStyle,
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 3,
    gap: 1,
  } as ViewStyle,
  dayName: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  } as TextStyle,
  dayNum: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
  } as TextStyle,
  mealDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  } as ViewStyle,
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    height: 40,
  } as ViewStyle,
  timeLabel: {
    width: 32,
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'right',
    paddingRight: 4,
  } as TextStyle,
  dayCol: {
    flex: 1,
    alignSelf: 'stretch',
    paddingHorizontal: 1,
    paddingVertical: 3,
    justifyContent: 'center',
  } as ViewStyle,
  eventBlock: {
    flex: 1,
    borderLeftWidth: 2,
    borderRadius: BorderRadius.sm,
    minHeight: 22,
  } as ViewStyle,
});

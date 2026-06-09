import { Pressable, View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface CalendarPreviewCardProps {
  onPress: () => void;
}

export function CalendarPreviewCard({ onPress }: CalendarPreviewCardProps) {
  const theme = useTheme();
  const today = new Date();
  const dayLabel = DAY_LABELS[today.getDay()];
  const monthLabel = MONTH_LABELS[today.getMonth()];
  const dayNum = today.getDate();

  const upcomingDays = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i + 1);
    return DAY_LABELS[d.getDay()];
  });

  return (
    <Pressable
      style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      onPress={onPress}
    >
      <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Calendar</Text>

      <View style={styles.dateBlock}>
        <Text style={[styles.dayLabel, { color: Colors.accent }]}>{dayLabel}</Text>
        <Text style={[styles.dayNum, { color: theme.text }]}>{dayNum}</Text>
        <Text style={[styles.monthYear, { color: theme.textSecondary }]}>
          {monthLabel} {today.getFullYear()}
        </Text>
      </View>

      <View style={styles.upcomingRow}>
        {upcomingDays.map((d, i) => (
          <View key={i} style={[styles.upcomingDay, { backgroundColor: theme.backgroundSelected }]}>
            <Text style={[styles.upcomingDayText, { color: theme.textSecondary }]}>{d}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.sm,
    overflow: 'hidden',
  } as ViewStyle,
  cardTitle: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  } as TextStyle,
  dateBlock: {
    alignItems: 'flex-start',
    gap: 2,
  } as ViewStyle,
  dayLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
  dayNum: {
    fontSize: FontSizes.hero,
    fontWeight: '700',
    lineHeight: 38,
  } as TextStyle,
  monthYear: {
    fontSize: FontSizes.xs,
  } as TextStyle,
  upcomingRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  } as ViewStyle,
  upcomingDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  } as ViewStyle,
  upcomingDayText: {
    fontSize: 10,
    fontWeight: '600',
  } as TextStyle,
});

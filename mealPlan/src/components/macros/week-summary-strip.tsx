import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { supabase } from '@/services/supabase';
import { getHistoricalProgress, type DailyMacroProgress } from '@/services/macro-service';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const DAY_ABBREVS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface Props {
  selectedDate: Date;
  goToDate: (date: Date) => void;
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(12, 0, 0, 0);
  return d;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type ChipStatus = 'green' | 'amber' | 'red' | 'grey';

function chipStatus(progress: DailyMacroProgress | undefined): ChipStatus {
  if (!progress) return 'grey';
  const cal = progress.macros.find((m) => m.macro_name === 'calories');
  if (!cal || cal.current === 0) return 'grey';
  if (cal.current > cal.goal * 1.1) return 'red';
  if (cal.current >= cal.goal * 0.9) return 'green';
  return 'amber';
}

export function WeekSummaryStrip({ selectedDate, goToDate }: Props) {
  const theme = useTheme();
  const [weekData, setWeekData] = useState<DailyMacroProgress[]>([]);

  const weekStart = getMondayOf(selectedDate);
  const weekStartKey = dateKey(weekStart);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return;
      const endDate = new Date(weekStart);
      endDate.setDate(endDate.getDate() + 6);
      const data = await getHistoricalProgress(userId, weekStartKey, dateKey(endDate)).catch(() => []);
      if (!cancelled) setWeekData(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [weekStartKey]);

  const statusColor: Record<ChipStatus, string> = {
    green: theme.success,
    amber: theme.warning,
    red: theme.error,
    grey: theme.border,
  };

  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <View style={[styles.strip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {days.map((day, i) => {
        const key = dateKey(day);
        const progress = weekData.find((p) => p.date === key);
        const status = chipStatus(progress);
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, today);

        return (
          <Pressable key={key} style={[styles.chip, isSelected && styles.chipSelected]} onPress={() => goToDate(day)}>
            <Text style={[styles.dayLabel, { color: isSelected ? Colors.accent : theme.textSecondary }]}>
              {DAY_ABBREVS[i]}
            </Text>
            <Text
              style={[
                styles.dateNum,
                { color: isSelected ? Colors.accent : theme.text },
                isToday && { fontWeight: '700' },
              ]}
            >
              {day.getDate()}
            </Text>
            <View style={[styles.dot, { backgroundColor: statusColor[status] }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  chip: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
    minWidth: 36,
    gap: 2,
  } as ViewStyle,
  chipSelected: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderRadius: BorderRadius.sm,
  } as ViewStyle,
  dayLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  } as TextStyle,
  dateNum: {
    fontSize: FontSizes.sm,
    fontWeight: '400',
  } as TextStyle,
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  } as ViewStyle,
});

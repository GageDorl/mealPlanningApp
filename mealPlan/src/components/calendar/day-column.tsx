import { memo } from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MealSlotCard } from './meal-slot-card';
import { FoodLogCard } from './food-log-card';
import type { MealSlotWithRecipe } from '@/services/meal-plan-service';
import type { FoodLogWithItems } from '@/services/food-log-service';
import type { CalendarEvent } from '@/services/calendar.types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const START_HOUR = 0;
export const END_HOUR = 23;
export const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
export const DEFAULT_HOUR_HEIGHT = 52;
export const MIN_HOUR_HEIGHT = 32;
export const MAX_HOUR_HEIGHT = 96;
export const HOUR_HEIGHT = DEFAULT_HOUR_HEIGHT;
export const GRID_HEIGHT = HOURS.length * DEFAULT_HOUR_HEIGHT;
export const DEFAULT_SLOT_DURATION = 60;

function formatHour(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h} ${suffix}`;
}

export function formatMinutes24(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function parseTimeToMinutes(time: string | undefined | null): number | null {
  if (!time) return null;
  const parts = time.split(':');
  if (parts.length < 2) return null;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

export function minutesToY(minutes: number, hourHeight = DEFAULT_HOUR_HEIGHT): number {
  return ((minutes - START_HOUR * 60) / 60) * hourHeight;
}

export function clampMinutes(minutes: number): number {
  return Math.max(START_HOUR * 60, Math.min((END_HOUR + 1) * 60, minutes));
}

// Static memoized hour lines — only re-renders if the theme color strings change.
const HourGrid = memo(function HourGrid({ borderColor, textColor, hourHeight }: { borderColor: string; textColor: string; hourHeight: number }) {
  return (
    <>
      {HOURS.map((hour) => (
        <View key={hour} style={[styles.hourRow, { borderBottomColor: borderColor, height: hourHeight }]}>
          <Text style={[styles.hourLabel, { color: textColor }]}>{formatHour(hour)}</Text>
        </View>
      ))}
    </>
  );
});

/** Pinned day header rendered above the scroll area. */
export function DayHeader({ dayIndex, date, isToday }: { dayIndex: number; date: string; isToday: boolean; isNarrow?: boolean }) {
  const theme = useTheme();
  const dayNum = parseInt(date.split('-')[2], 10);
  return (
    <View style={styles.headerCol}>
      <View style={[styles.header, { backgroundColor: theme.backgroundElement }]}>
        <View style={[styles.headerBadge, isToday && styles.headerBadgeToday]}>
          <Text style={[styles.dayLabel, { color: theme.textSecondary }, isToday && styles.dayLabelToday]}>
            {DAY_LABELS[dayIndex]}
          </Text>
          <Text style={[styles.dayNumber, { color: theme.text }, isToday && styles.dayNumberToday]}>
            {dayNum}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** All-day events + untimed meal slots + untimed food logs row above the scroll area. */
export function AllDayCell({
  events,
  untimedSlots = [],
  untimedFoodLogs = [],
  onEventPress,
  onAssignRecipe,
  onDeleteSlot,
  onDeleteFoodLog,
  onFoodLogPress,
}: {
  events: CalendarEvent[];
  untimedSlots?: MealSlotWithRecipe[];
  untimedFoodLogs?: FoodLogWithItems[];
  onEventPress?: (event: CalendarEvent) => void;
  onAssignRecipe?: (slotId: string) => void;
  onDeleteSlot?: (slotId: string) => void;
  onDeleteFoodLog?: (id: string) => void;
  onFoodLogPress?: (log: FoodLogWithItems) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.allDayCell, { borderBottomColor: theme.border, borderRightColor: theme.border }]}>
      {events.map((event) => (
        <Pressable key={event.id} style={styles.allDayChip} onPress={() => onEventPress?.(event)}>
          <Text numberOfLines={1} style={styles.allDayChipText}>{event.title}</Text>
        </Pressable>
      ))}
      {untimedSlots.map((slot) => (
        <MealSlotCard
          key={slot.id}
          slot={slot}
          compact
          onPress={() => {}}
          onAssignRecipe={() => onAssignRecipe?.(slot.id)}
          onDelete={() => onDeleteSlot?.(slot.id)}
        />
      ))}
      {untimedFoodLogs.map((log) => (
        <FoodLogCard
          key={log.id}
          log={log}
          compact
          onPress={() => onFoodLogPress?.(log)}
          onDelete={() => onDeleteFoodLog?.(log.id)}
        />
      ))}
    </View>
  );
}

/**
 * Static time-grid background column. Only receives theme color strings — never
 * changes on week navigation — so React.memo skips all re-renders on week change.
 * Events and tap targets live in WeekEventsOverlay, rendered as a sibling.
 */
export const DayColumn = memo(function DayColumn({
  bgColor,
  borderColor,
  textColor,
  hourHeight = DEFAULT_HOUR_HEIGHT,
}: {
  bgColor: string;
  borderColor: string;
  textColor: string;
  hourHeight?: number;
}) {
  const gridHeight = HOURS.length * hourHeight;

  return (
    <View style={[styles.column, { backgroundColor: bgColor }]}> 
      <View style={{ height: gridHeight }}>
        <HourGrid borderColor={borderColor} textColor={textColor} hourHeight={hourHeight} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  headerCol: {
    flex: 1,
    minWidth: 120,
  } as ViewStyle,
  column: {
    flex: 1,
    minWidth: 120,
  } as ViewStyle,
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  } as ViewStyle,
  headerBadge: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: '100%',
  } as ViewStyle,
  headerBadgeToday: {
    backgroundColor: Colors.accent,
  } as ViewStyle,
  dayLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  } as TextStyle,
  dayLabelToday: {
    color: '#FFFFFF',
  } as TextStyle,
  dayNumber: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  } as TextStyle,
  dayNumberToday: {
    color: '#FFFFFF',
  } as TextStyle,
  hourRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.xs,
    justifyContent: 'flex-start',
  } as ViewStyle,
  hourLabel: {
    fontSize: 9,
    fontWeight: '500',
    paddingTop: 2,
  } as TextStyle,
  allDayCell: {
    flex: 1,
    minWidth: 120,
    minHeight: 24,
    padding: Spacing.xs,
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  allDayChip: {
    backgroundColor: 'rgba(74, 144, 217, 0.15)',
    borderLeftWidth: 2,
    borderLeftColor: '#4A90D9',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
  } as ViewStyle,
  allDayChipText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#4A90D9',
  } as TextStyle,
});

import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MealSlotCard } from './meal-slot-card';
import { ExternalEventBlock } from './external-event-block';
import type { MealSlotWithRecipe } from '@/services/meal-plan-service';
import type { CalendarEvent } from '@/services/calendar.types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Hours shown in the time grid (full day). */
export const START_HOUR = 0;
export const END_HOUR = 23;
export const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
export const HOUR_HEIGHT = 52;

function formatHour(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h} ${suffix}`;
}

function formatHour24(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function formatMinutes24(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function parseTimeToMinutes(time: string | undefined | null): number | null {
  if (!time) return null;
  const parts = time.split(':');
  if (parts.length < 2) return null;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/** Convert a minutes-from-midnight value to a pixel offset from the top of the grid. */
function minutesToY(minutes: number): number {
  return ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
}

function clampMinutes(minutes: number): number {
  return Math.max(START_HOUR * 60, Math.min((END_HOUR + 1) * 60, minutes));
}

const GRID_HEIGHT = HOURS.length * HOUR_HEIGHT;
const DEFAULT_SLOT_DURATION = 60; // minutes
const QUARTER_HOUR_MINUTES = [0, 15, 30, 45] as const;

interface DayColumnProps {
  dayIndex: number;
  date: string;
  slots: MealSlotWithRecipe[];
  externalEvents: CalendarEvent[];
  onAddSlot: (time: string) => void;
  onSlotPress: (slotId: string) => void;
  onAssignRecipe: (slotId: string) => void;
  isToday: boolean;
  isNarrow?: boolean;
}

/** Pinned day header — rendered above the scroll area. */
export function DayHeader({ dayIndex, date, isToday, isNarrow }: Pick<DayColumnProps, 'dayIndex' | 'date' | 'isToday' | 'isNarrow'>) {
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

/** Time-grid body of a day — rendered inside the shared scroll area. */
export function DayColumn({
  dayIndex,
  date,
  slots,
  externalEvents,
  onAddSlot,
  onSlotPress,
  onAssignRecipe,
  isToday,
  isNarrow,
}: DayColumnProps) {
  const theme = useTheme();

  // Current time tracking for the "now" indicator
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, [isToday]);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Separate timed vs untimed items
  const timedSlots = slots.filter((s) => parseTimeToMinutes(s.time) != null);
  const untimed = slots.filter((s) => parseTimeToMinutes(s.time) == null);
  const allDayEvents = externalEvents.filter((e) => e.isAllDay);
  const timedEvents = externalEvents.filter((e) => !e.isAllDay);

  const showNowLine = isToday && currentMinutes >= START_HOUR * 60 && currentMinutes <= (END_HOUR + 1) * 60;

  const handleQuarterPress = (hour: number, minuteOffset: number) => {
    const totalMinutes = clampMinutes(hour * 60 + minuteOffset);
    onAddSlot(formatMinutes24(totalMinutes));
  };

  return (
    <View style={[styles.column, { backgroundColor: theme.backgroundElement }]}>
      {/* All-day events & un-timed slots above the grid */}
      {(allDayEvents.length > 0 || untimed.length > 0) && (
        <View style={styles.untimedSection}>
          {allDayEvents.map((event) => (
            <ExternalEventBlock key={event.id} event={event} />
          ))}
          {untimed.map((slot) => (
            <MealSlotCard
              key={slot.id}
              slot={slot}
              onPress={() => onSlotPress(slot.id)}
              onAssignRecipe={() => onAssignRecipe(slot.id)}
            />
          ))}
        </View>
      )}

      {/* Fixed-height time grid */}
      <View style={[styles.grid, { height: GRID_HEIGHT }]}>
        {/* Background hour rows (tappable) */}
        {HOURS.map((hour) => (
          <View key={hour} style={[styles.hourRow, { borderBottomColor: theme.border }]}>
            <View style={styles.quarterTapTargets}>
              {QUARTER_HOUR_MINUTES.map((minuteOffset) => (
                <Pressable
                  key={`${hour}-${minuteOffset}`}
                  style={styles.quarterTapTarget}
                  onPress={() => handleQuarterPress(hour, minuteOffset)}
                />
              ))}
            </View>
            <Text style={[styles.hourLabel, { color: theme.textSecondary }]}>
              {formatHour(hour)}
            </Text>
          </View>
        ))}

        {/* Now indicator */}
        {showNowLine && (
          <View style={[styles.nowLine, { top: minutesToY(currentMinutes) }]}>
            <View style={styles.nowDot} />
            <View style={styles.nowRule} />
          </View>
        )}

        {/* Absolutely-positioned external events */}
        {timedEvents.map((event) => {
          const startMin = event.startDate.getHours() * 60 + event.startDate.getMinutes();
          const endMin = event.endDate.getHours() * 60 + event.endDate.getMinutes();
          const clippedStart = clampMinutes(startMin);
          const clippedEnd = clampMinutes(Math.max(endMin, startMin + 30));
          const visibleDuration = Math.max(clippedEnd - clippedStart, 30);
          const top = minutesToY(clippedStart);
          const height = (visibleDuration / 60) * HOUR_HEIGHT;

          if (clippedEnd <= clippedStart) {
            return null;
          }

          return (
            <View key={event.id} style={[styles.absoluteItem, { top, height, left: 30, right: 2 }]}>
              <ExternalEventBlock event={event} compact={height < 56} />
            </View>
          );
        })}

        {/* Absolutely-positioned meal slots */}
        {timedSlots.map((slot) => {
          const startMin = parseTimeToMinutes(slot.time)!;
          const clippedStart = clampMinutes(startMin);
          const clippedEnd = clampMinutes(startMin + DEFAULT_SLOT_DURATION);
          const visibleDuration = Math.max(clippedEnd - clippedStart, 30);
          const top = minutesToY(clippedStart);
          const height = (visibleDuration / 60) * HOUR_HEIGHT;

          if (clippedEnd <= clippedStart) {
            return null;
          }

          return (
            <View key={slot.id} style={[styles.absoluteItem, { top, height, left: 30, right: 2 }]}>
              <MealSlotCard
                slot={slot}
                compact={height < 56}
                onPress={() => onSlotPress(slot.id)}
                onAssignRecipe={() => onAssignRecipe(slot.id)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

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
  untimedSection: {
    padding: Spacing.xs,
    gap: Spacing.xs,
  } as ViewStyle,
  grid: {
    position: 'relative',
  } as ViewStyle,
  hourRow: {
    height: HOUR_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.xs,
    justifyContent: 'flex-start',
    position: 'relative',
  } as ViewStyle,
  quarterTapTargets: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  } as ViewStyle,
  quarterTapTarget: {
    flex: 1,
  } as ViewStyle,
  hourLabel: {
    fontSize: 9,
    fontWeight: '500',
    paddingTop: 2,
    zIndex: 1,
  } as TextStyle,
  absoluteItem: {
    position: 'absolute',
  } as ViewStyle,
  nowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  } as ViewStyle,
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  } as ViewStyle,
  nowRule: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.accent,
  } as ViewStyle,
});

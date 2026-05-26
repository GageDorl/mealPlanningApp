import { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';
import { ExternalEventBlock } from './external-event-block';
import { MealSlotCard } from './meal-slot-card';
import {
  minutesToY, parseTimeToMinutes, formatMinutes24, clampMinutes,
  DEFAULT_HOUR_HEIGHT, START_HOUR, END_HOUR, GRID_HEIGHT, DEFAULT_SLOT_DURATION,
} from './day-column';
import type { MealSlotWithRecipe } from '@/services/meal-plan-service';
import type { CalendarEvent } from '@/services/calendar.types';

export interface DayData {
  date: string;
  isToday: boolean;
  timedEvents: CalendarEvent[];
  timedSlots: MealSlotWithRecipe[];
}

interface WeekEventsOverlayProps {
  days: DayData[];
  isCurrentWeek: boolean;
  hourHeight?: number;
  gridHeight?: number;
  onAddSlot: (date: string, time: string) => void;
  onAssignRecipe: (slotId: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onEventPress: (event: CalendarEvent) => void;
}

/**
 * Absolutely-positioned overlay that sits on top of the static DayColumn backgrounds.
 * Re-renders on week/data change while the backgrounds stay frozen.
 */
export function WeekEventsOverlay({
  days,
  isCurrentWeek,
  hourHeight = DEFAULT_HOUR_HEIGHT,
  gridHeight = GRID_HEIGHT,
  onAddSlot,
  onAssignRecipe,
  onDeleteSlot,
  onEventPress,
}: WeekEventsOverlayProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isCurrentWeek) return;
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, [isCurrentWeek]);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay, styles.boxNonePointerEvents]}>
      {days.map((day) => (
        <DayEventsColumn
          key={day.date}
          day={day}
          nowMinutes={isCurrentWeek && day.isToday ? nowMinutes : null}
          hourHeight={hourHeight}
          gridHeight={gridHeight}
          onAddSlot={onAddSlot}
          onAssignRecipe={onAssignRecipe}
          onDeleteSlot={onDeleteSlot}
          onEventPress={onEventPress}
        />
      ))}
    </View>
  );
}

function DayEventsColumn({
  day,
  nowMinutes,
  hourHeight,
  gridHeight,
  onAddSlot,
  onAssignRecipe,
  onDeleteSlot,
  onEventPress,
}: {
  day: DayData;
  nowMinutes: number | null;
  hourHeight: number;
  gridHeight: number;
  onAddSlot: (date: string, time: string) => void;
  onAssignRecipe: (slotId: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onEventPress: (event: CalendarEvent) => void;
}) {
  return (
    <View style={[styles.dayCol, { height: gridHeight }, styles.boxNonePointerEvents]}>
      {/* Single Pressable replaces 96 quarter-hour targets — time computed from locationY */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={(e) => {
          // On web, nativeEvent is a DOM PointerEvent — locationY is undefined, use offsetY instead.
          const y = Platform.OS === 'web'
            ? (e.nativeEvent as unknown as { offsetY: number }).offsetY
            : e.nativeEvent.locationY;
          const mins = Math.round((START_HOUR * 60 + (y / hourHeight) * 60) / 15) * 15;
          onAddSlot(day.date, formatMinutes24(clampMinutes(mins)));
        }}
      />

      {day.timedEvents.map((event) => {
        const startMin = event.startDate.getHours() * 60 + event.startDate.getMinutes();
        const durationMin = (event.endDate.getTime() - event.startDate.getTime()) / 60000;
        const cs = clampMinutes(startMin);
        const ce = clampMinutes(startMin + Math.max(durationMin, 30));
        if (ce <= cs) return null;
        const top = minutesToY(cs, hourHeight);
        const height = ((ce - cs) / 60) * hourHeight;
        return (
          <View key={event.id} style={[styles.absoluteItem, { top, height, left: 30, right: 2 }]}>
            <ExternalEventBlock event={event} compact={height < 56} onPress={() => onEventPress(event)} />
          </View>
        );
      })}

      {day.timedSlots.map((slot) => {
        const startMin = parseTimeToMinutes(slot.time_of_day)!;
        const cs = clampMinutes(startMin);
        const ce = clampMinutes(startMin + DEFAULT_SLOT_DURATION);
        if (ce <= cs) return null;
        const top = minutesToY(cs, hourHeight);
        const height = ((ce - cs) / 60) * hourHeight;
        return (
          <View key={slot.id} style={[styles.absoluteItem, { top, height, left: 30, right: 2 }]}>
            <MealSlotCard
              slot={slot}
              compact={height < 56}
              onPress={() => {}}
              onAssignRecipe={() => onAssignRecipe(slot.id)}
              onDelete={() => onDeleteSlot(slot.id)}
            />
          </View>
        );
      })}

      {nowMinutes !== null && nowMinutes >= START_HOUR * 60 && nowMinutes <= (END_HOUR + 1) * 60 && (
        <View style={[styles.nowLine, { top: minutesToY(nowMinutes, hourHeight) }]}>
          <View style={styles.nowDot} />
          <View style={styles.nowRule} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flexDirection: 'row',
    gap: 2,
  } as ViewStyle,
  boxNonePointerEvents: {
    pointerEvents: 'box-none',
  } as ViewStyle,
  dayCol: {
    flex: 1,
    position: 'relative',
  } as ViewStyle,
  absoluteItem: {
    position: 'absolute',
    overflow: 'hidden',
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

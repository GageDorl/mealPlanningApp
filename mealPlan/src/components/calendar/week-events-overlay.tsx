import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { View, Pressable, StyleSheet, Platform, Text, type ViewStyle, type TextStyle } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Colors } from '@/constants/theme';
import { ExternalEventBlock } from './external-event-block';
import { MealSlotCard } from './meal-slot-card';
import { FoodLogCard } from './food-log-card';
import {
  minutesToY, parseTimeToMinutes, formatMinutes24, clampMinutes,
  DEFAULT_HOUR_HEIGHT, START_HOUR, END_HOUR, GRID_HEIGHT, DEFAULT_SLOT_DURATION,
} from './day-column';
import type { MealSlotWithRecipe } from '@/services/meal-plan-service';
import type { FoodLogWithItems } from '@/services/food-log-service';
import type { CalendarEvent } from '@/services/calendar.types';

// Pixels that Prepd cards shift down when a Google event is behind them,
// exposing enough of the Google event header to be readable and tappable.
const CARD_FAN_OFFSET = 10;

function formatDragTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}:${String(m).padStart(2, '0')} ${suffix}`;
}

function DraggableFoodLog({
  log,
  top,
  height,
  zIndex,
  compact,
  isDragging,
  hourHeight,
  onPress,
  onDelete,
  onDragStart,
  onDragUpdate,
  onDragEnd,
}: {
  log: FoodLogWithItems;
  top: number;
  height: number;
  zIndex: number;
  compact: boolean;
  isDragging: boolean;
  hourHeight: number;
  onPress: () => void;
  onDelete: () => void;
  onDragStart: (logId: string, currentMin: number) => void;
  onDragUpdate: (logId: string, currentMin: number) => void;
  onDragEnd: (logId: string, finalMin: number | null) => void;
}) {
  const startMin = parseTimeToMinutes(log.time_of_day)!;
  const dragMinRef = useRef(startMin);

  const gesture = useMemo(() =>
    Gesture.Pan()
      .runOnJS(true)
      .activateAfterLongPress(350)
      .onBegin(() => {
        dragMinRef.current = startMin;
      })
      .onStart(() => {
        onDragStart(log.id, startMin);
      })
      .onUpdate((e) => {
        const rawDelta = (e.translationY / hourHeight) * 60;
        const snapped = Math.round(rawDelta / 15) * 15;
        const newMin = clampMinutes(startMin + snapped);
        dragMinRef.current = newMin;
        onDragUpdate(log.id, newMin);
      })
      .onFinalize((_e, success) => {
        onDragEnd(log.id, success ? dragMinRef.current : null);
      }),
    [log.id, startMin, hourHeight, onDragStart, onDragUpdate, onDragEnd],
  );

  return (
    <View style={[styles.absoluteItem, { top, height, left: 30, right: 2, zIndex, opacity: isDragging ? 0.3 : 1 }]}>
      <GestureDetector gesture={gesture}>
        <View style={{ flex: 1 }}>
          <FoodLogCard log={log} compact={compact} onPress={onPress} onDelete={onDelete} />
        </View>
      </GestureDetector>
    </View>
  );
}

export interface DayData {
  date: string;
  isToday: boolean;
  timedEvents: CalendarEvent[];
  timedSlots: MealSlotWithRecipe[];
  timedFoodLogs: FoodLogWithItems[];
  untimedFoodLogs: FoodLogWithItems[];
}

interface WeekEventsOverlayProps {
  days: DayData[];
  isCurrentWeek: boolean;
  hourHeight?: number;
  gridHeight?: number;
  onAddSlot: (date: string, time: string) => void;
  onAssignRecipe: (slotId: string) => void;
  onSlotPress: (slot: MealSlotWithRecipe) => void;
  onDeleteSlot: (slotId: string) => void;
  onDeleteFoodLog: (id: string) => void;
  onEventPress: (event: CalendarEvent) => void;
  onFoodLogPress: (log: FoodLogWithItems) => void;
  onUpdateFoodLogTime: (logId: string, newTime: string) => void;
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
  onSlotPress,
  onDeleteSlot,
  onDeleteFoodLog,
  onEventPress,
  onFoodLogPress,
  onUpdateFoodLogTime,
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
          onSlotPress={onSlotPress}
          onDeleteSlot={onDeleteSlot}
          onDeleteFoodLog={onDeleteFoodLog}
          onEventPress={onEventPress}
          onFoodLogPress={onFoodLogPress}
          onUpdateFoodLogTime={onUpdateFoodLogTime}
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
  onSlotPress,
  onDeleteSlot,
  onDeleteFoodLog,
  onEventPress,
  onFoodLogPress,
  onUpdateFoodLogTime,
}: {
  day: DayData;
  nowMinutes: number | null;
  hourHeight: number;
  gridHeight: number;
  onAddSlot: (date: string, time: string) => void;
  onAssignRecipe: (slotId: string) => void;
  onSlotPress: (slot: MealSlotWithRecipe) => void;
  onDeleteSlot: (slotId: string) => void;
  onDeleteFoodLog: (id: string) => void;
  onEventPress: (event: CalendarEvent) => void;
  onFoodLogPress: (log: FoodLogWithItems) => void;
  onUpdateFoodLogTime: (logId: string, newTime: string) => void;
}) {
  const [dragInfo, setDragInfo] = useState<{ logId: string; currentMin: number } | null>(null);
  // ID of the Google event the user has tapped to bring to the front
  const [elevatedEventId, setElevatedEventId] = useState<string | null>(null);

  // Precompute clamped Google event ranges once per render for overlap checks
  const gcalRanges = useMemo(() =>
    day.timedEvents.map(e => ({
      id: e.id,
      start: e.startDate.getHours() * 60 + e.startDate.getMinutes(),
      end: e.startDate.getHours() * 60 + e.startDate.getMinutes() +
           Math.max((e.endDate.getTime() - e.startDate.getTime()) / 60000, 30),
    })),
    [day.timedEvents],
  );

  // Google event IDs whose time range overlaps at least one Prepd item
  const gcalConflictSet = useMemo(() => {
    const prependRanges = [
      ...day.timedSlots.map(s => {
        const start = parseTimeToMinutes(s.time_of_day) ?? 0;
        return { start, end: start + DEFAULT_SLOT_DURATION };
      }),
      ...day.timedFoodLogs.map(l => {
        const start = parseTimeToMinutes(l.time_of_day) ?? 0;
        return { start, end: start + DEFAULT_SLOT_DURATION };
      }),
    ];
    return new Set(
      gcalRanges
        .filter(g => prependRanges.some(p => g.start < p.end && g.end > p.start))
        .map(g => g.id),
    );
  }, [gcalRanges, day.timedSlots, day.timedFoodLogs]);

  // Prepd item IDs (slots + food logs) whose time range overlaps at least one Google event
  const prependConflictSet = useMemo(() => {
    const ids = new Set<string>();
    const check = (id: string, time_of_day: string | null | undefined) => {
      if (!time_of_day) return;
      const start = parseTimeToMinutes(time_of_day) ?? 0;
      const end = start + DEFAULT_SLOT_DURATION;
      if (gcalRanges.some(g => start < g.end && end > g.start)) ids.add(id);
    };
    day.timedSlots.forEach(s => check(s.id, s.time_of_day));
    day.timedFoodLogs.forEach(l => check(l.id, l.time_of_day));
    return ids;
  }, [gcalRanges, day.timedSlots, day.timedFoodLogs]);

  const handleDragStart = useCallback((logId: string, currentMin: number) => {
    setDragInfo({ logId, currentMin });
  }, []);

  const handleDragUpdate = useCallback((logId: string, currentMin: number) => {
    setDragInfo({ logId, currentMin });
  }, []);

  const handleDragEnd = useCallback((logId: string, finalMin: number | null) => {
    if (finalMin !== null) {
      onUpdateFoodLogTime(logId, formatMinutes24(finalMin));
    }
    setDragInfo(null);
  }, [onUpdateFoodLogTime]);

  const draggingLog = dragInfo ? day.timedFoodLogs.find((l) => l.id === dragInfo.logId) ?? null : null;
  const ghostHeight = (DEFAULT_SLOT_DURATION / 60) * hourHeight;
  const ghostTop = dragInfo ? minutesToY(clampMinutes(dragInfo.currentMin), hourHeight) : 0;
  const chipTop = dragInfo ? Math.max(0, ghostTop - 20) : 0;

  return (
    <View style={[styles.dayCol, { height: gridHeight }, styles.boxNonePointerEvents]}>
      {/* Single Pressable replaces 96 quarter-hour targets — time computed from locationY */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={(e) => {
          if (dragInfo) return;
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
        const hasConflict = gcalConflictSet.has(event.id);
        const isElevated = elevatedEventId === event.id;
        // Conflicted events start behind Prepd items (z:1); tapping brings them to z:5
        const zIndex = hasConflict ? (isElevated ? 5 : 1) : 2;
        return (
          <View key={event.id} style={[styles.absoluteItem, { top, height, left: 30, right: 2, zIndex }]}>
            <ExternalEventBlock
              event={event}
              compact={height < 56}
              onPress={hasConflict
                ? () => setElevatedEventId(isElevated ? null : event.id)
                : () => onEventPress(event)
              }
            />
          </View>
        );
      })}

      {day.timedSlots.map((slot) => {
        const startMin = parseTimeToMinutes(slot.time_of_day)!;
        const cs = clampMinutes(startMin);
        const ce = clampMinutes(startMin + DEFAULT_SLOT_DURATION);
        if (ce <= cs) return null;
        const baseTop = minutesToY(cs, hourHeight);
        const baseHeight = ((ce - cs) / 60) * hourHeight;
        // Fan down when a Google event is behind this slot so its header peeks above
        const fanned = prependConflictSet.has(slot.id);
        const top = fanned ? baseTop + CARD_FAN_OFFSET : baseTop;
        const height = fanned ? baseHeight - CARD_FAN_OFFSET : baseHeight;
        return (
          <View key={slot.id} style={[styles.absoluteItem, { top, height, left: 30, right: 2, zIndex: 3 }]}>
            <MealSlotCard
              slot={slot}
              compact={height < 56}
              onPress={() => onSlotPress(slot)}
              onAssignRecipe={() => onAssignRecipe(slot.id)}
              onDelete={() => onDeleteSlot(slot.id)}
            />
          </View>
        );
      })}

      {day.timedFoodLogs.map((log) => {
        const startMin = parseTimeToMinutes(log.time_of_day)!;
        const cs = clampMinutes(startMin);
        const ce = clampMinutes(startMin + DEFAULT_SLOT_DURATION);
        if (ce <= cs) return null;
        const baseTop = minutesToY(cs, hourHeight);
        const baseHeight = ((ce - cs) / 60) * hourHeight;
        const fanned = prependConflictSet.has(log.id);
        const top = fanned ? baseTop + CARD_FAN_OFFSET : baseTop;
        const height = fanned ? baseHeight - CARD_FAN_OFFSET : baseHeight;
        return (
          <DraggableFoodLog
            key={log.id}
            log={log}
            top={top}
            height={height}
            zIndex={4}
            compact={height < 56}
            isDragging={dragInfo?.logId === log.id}
            hourHeight={hourHeight}
            onPress={() => onFoodLogPress(log)}
            onDelete={() => onDeleteFoodLog(log.id)}
            onDragStart={handleDragStart}
            onDragUpdate={handleDragUpdate}
            onDragEnd={handleDragEnd}
          />
        );
      })}

      {/* Drag ghost — rendered above all events, no pointer events */}
      {draggingLog && dragInfo && (
        <>
          <View style={[styles.dragChip, { top: chipTop, left: 30 }]} pointerEvents="none">
            <Text style={styles.dragChipText}>{formatDragTime(dragInfo.currentMin)}</Text>
          </View>
          <View
            style={[styles.absoluteItem, styles.dragGhost, { top: ghostTop, height: ghostHeight, left: 30, right: 2 }]}
            pointerEvents="none"
          >
            <FoodLogCard log={draggingLog} compact={ghostHeight < 56} onPress={() => {}} onDelete={() => {}} />
          </View>
        </>
      )}

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
  dragGhost: {
    zIndex: 99,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 12px rgba(0,0,0,0.22)' }
      : {
          shadowColor: '#000',
          shadowOpacity: 0.22,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }),
  } as ViewStyle,
  dragChip: {
    position: 'absolute',
    zIndex: 100,
  } as ViewStyle,
  dragChipText: {
    backgroundColor: '#50C878',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  } as TextStyle,
});

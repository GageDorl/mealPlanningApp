import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { usePowerSync } from '@powersync/react-native';
import { View, Text, ScrollView, RefreshControl, Pressable, Platform, ActivityIndicator, useWindowDimensions, StyleSheet, Animated, type ViewStyle, type TextStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { triggerSync } from '@/utils/trigger-sync';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useMealPlan } from '@/hooks/use-meal-plan';
import { useCalendar } from '@/hooks/use-calendar';
import { useFoodLog } from '@/hooks/use-food-log';
import {
  DayColumn,
  DayHeader,
  AllDayCell,
  START_HOUR,
  END_HOUR,
  DEFAULT_HOUR_HEIGHT,
  MIN_HOUR_HEIGHT,
  MAX_HOUR_HEIGHT,
  parseTimeToMinutes,
} from '@/components/calendar/day-column';
import { WeekEventsOverlay, type DayData } from '@/components/calendar/week-events-overlay';
import { AddMealSlotModal } from '@/components/calendar/add-meal-slot-modal';
import { RecipePickerModal } from '@/components/calendar/recipe-picker-modal';
import { CalendarPickerModal } from '@/components/calendar/calendar-picker-modal';
import { EventDetailModal } from '@/components/calendar/event-detail-modal';
import { MealSlotDetailModal } from '@/components/calendar/meal-slot-detail-modal';
import { FoodLogDetailModal } from '@/components/calendar/food-log-detail-modal';
import { updateExternalEventId } from '@/services/meal-plan-service';
import { deleteMealEvent } from '@/services/calendar';
import { WeekPickerModal } from '@/components/calendar/week-picker-modal';
import type { CalendarEvent } from '@/services/calendar.types';
import type { Recipe } from '@/models/recipe';

const DAY_GAP = 2;
const MOBILE_DAY_WIDTH = 130;
const MOBILE_CALENDAR_WIDTH = MOBILE_DAY_WIDTH * 7 + DAY_GAP * 6;

function getSunday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateToString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: string): boolean {
  return dateToString(a) === b;
}

export default function WeeklyPlannerScreen() {
  const db = usePowerSync();
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekPickerVisible, setWeekPickerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [hourHeight, setHourHeight] = useState(DEFAULT_HOUR_HEIGHT);
  const gridHeight = (END_HOUR - START_HOUR + 1) * hourHeight;
  const isNarrow = windowWidth > 0 && windowWidth < 7 * 130;

  const today = new Date();
  const currentWeekStart = getSunday(addDays(today, weekOffset * 7));
  const currentWeekEnd = addDays(currentWeekStart, 7);

  const { weekPlan, createSlot, updateSlot, addRecipeToSlot, removeRecipeFromSlot, updateSlotRecipeServings, deleteSlot, refresh } = useMealPlan(currentWeekStart);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const { weekLogs, userId: currentUserId, createFoodLog, deleteFoodLog, deleteFoodLogItem, updateFoodLogItem, updateFoodLog, addItemsToFoodLog } = useFoodLog(currentWeekStart);
  const {
    connected, events, googleEventsRefreshing, connectError, loadError,
    availableCalendars, selectedCalendarIds, connectedCalendarTitle,
    connect, selectCalendars, loadEvents, createMealEvent,
  } = useCalendar();

  // Calendar picker modal state
  const [calPickerVisible, setCalPickerVisible] = useState(false);

  // Auto-show picker when connected but no calendar selected yet
  useEffect(() => {
    if (connected && availableCalendars.length > 0 && selectedCalendarIds.length === 0) {
      setCalPickerVisible(true);
    }
  }, [connected, availableCalendars.length, selectedCalendarIds.length]);

  // Event detail modal state
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Add-slot modal state
  const [addSlotVisible, setAddSlotVisible] = useState(false);
  const [addSlotDate, setAddSlotDate] = useState('');
  const [addSlotTime, setAddSlotTime] = useState<string | undefined>(undefined);

  // Recipe picker modal state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);

  // Meal slot detail modal state
  const [selectedSlot, setSelectedSlot] = useState<import('@/services/meal-plan-service').MealSlotWithRecipe | null>(null);

  // Food log detail modal state
  const [selectedLog, setSelectedLog] = useState<import('@/services/food-log-service').FoodLogWithItems | null>(null);

  // Narrow path: 2D pan state
  const panOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const panCurrentXY = useRef({ x: 0, y: 0 });
  const panStartXY = useRef({ x: 0, y: 0 });
  const isClampingRef = useRef(false);

  // Wide path: vertical scroll ref
  const verticalScrollRef = useRef<ScrollView>(null);

  const hourHeightRef = useRef(hourHeight);
  const viewportHeightRef = useRef(viewportHeight);
  viewportHeightRef.current = viewportHeight;
  const pinchStartHeightRef = useRef(hourHeight);
  const pinchPreviewScaleRef = useRef(new Animated.Value(1));
  const pendingPinchHeightRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    hourHeightRef.current = hourHeight;

    // Clear the preview scale only after the committed zoom height is applied,
    // which avoids a one-frame snap back to the old layout on mobile.
    if (pendingPinchHeightRef.current !== null) {
      const target = pendingPinchHeightRef.current;
      const current = hourHeight;

      if (target === current) {
        pinchPreviewScaleRef.current.setValue(1);
        pendingPinchHeightRef.current = null;
      }
    }

    // Re-clamp pan.y to the new grid height bounds. The addListener effect
    // won't fire unless panOffset changes, so we force-clamp here after commit.
    const newGridHeight = (END_HOUR - START_HOUR + 1) * hourHeight;
    const newMaxY = Math.min(0, viewportHeightRef.current - newGridHeight);
    const cy = Math.max(newMaxY, Math.min(0, panCurrentXY.current.y));
    if (cy !== panCurrentXY.current.y) {
      panCurrentXY.current = { x: panCurrentXY.current.x, y: cy };
      panOffset.setValue({ x: panCurrentXY.current.x, y: cy });
    }
  }, [hourHeight]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await triggerSync();
    if (connected) {
      try { await loadEvents(currentWeekStart, currentWeekEnd); } catch {}
    }
    setRefreshing(false);
  }, [connected, loadEvents, currentWeekStart, currentWeekEnd]);

  const changeWeek = useCallback((delta: number) => setWeekOffset((o) => o + delta), []);

  const swipeGesture = useMemo(() =>
    Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-12, 12])
      .failOffsetY([-10, 10])
      .onEnd((e) => {
        if (e.translationX < -50) changeWeek(1);
        else if (e.translationX > 50) changeWeek(-1);
      }),
    [changeWeek]
  );

  const pinchZoomGesture = useMemo(() =>
    Gesture.Pinch()
      .runOnJS(true)
      .onBegin(() => {
        // Only lock scroll when a real pinch is recognized.
        pinchStartHeightRef.current = hourHeightRef.current;
      })
      .onUpdate((e) => {
        const nextHeight = Math.max(
          MIN_HOUR_HEIGHT,
          Math.min(MAX_HOUR_HEIGHT, pinchStartHeightRef.current * e.scale)
        );
        pinchPreviewScaleRef.current.setValue(nextHeight / pinchStartHeightRef.current);
        // Clamp pan.y during preview so the grid's visual bottom stays in the viewport.
        // The preview transform pins the top edge and shrinks the bottom upward, so
        // visual bottom = pan.y + hours * nextHeight. Clamp when this would go off-screen.
        const visualGridHeight = (END_HOUR - START_HOUR + 1) * nextHeight;
        const newMaxY = Math.min(0, viewportHeightRef.current - visualGridHeight);
        const cy = Math.max(newMaxY, Math.min(0, panCurrentXY.current.y));
        if (cy !== panCurrentXY.current.y) {
          panCurrentXY.current = { x: panCurrentXY.current.x, y: cy };
          panOffset.setValue({ x: panCurrentXY.current.x, y: cy });
        }
      })
      .onEnd((e) => {
        const nextHeight = Math.max(
          MIN_HOUR_HEIGHT,
          Math.min(MAX_HOUR_HEIGHT, pinchStartHeightRef.current * e.scale)
        );
        const committedHeight = Math.round(nextHeight);
        pendingPinchHeightRef.current = committedHeight;
        setHourHeight(committedHeight);
      })
      .onFinalize(() => {
        if (pendingPinchHeightRef.current === null) {
          pinchPreviewScaleRef.current.setValue(1);
        }
      }),
    []
  );

  const pinchTranslateY = Animated.multiply(
    Animated.add(pinchPreviewScaleRef.current, -1),
    gridHeight / 2
  );

  const pinchPreviewTransform = {
    transform: [
      { translateY: pinchTranslateY },
      { scaleY: pinchPreviewScaleRef.current },
    ],
  };

  // Pan bounds for narrow path
  const maxTranslateX = Math.min(0, viewportWidth - MOBILE_CALENDAR_WIDTH);
  const maxTranslateY = Math.min(0, viewportHeight - gridHeight);

  const panGesture = useMemo(() =>
    Gesture.Pan()
      .runOnJS(true)
      .minPointers(1)
      .maxPointers(1)
      .onBegin(() => {
        panOffset.stopAnimation();
        panStartXY.current = { x: panCurrentXY.current.x, y: panCurrentXY.current.y };
      })
      .onUpdate((e) => {
        const nx = Math.max(maxTranslateX, Math.min(0, panStartXY.current.x + e.translationX));
        const ny = Math.max(maxTranslateY, Math.min(0, panStartXY.current.y + e.translationY));
        panCurrentXY.current = { x: nx, y: ny };
        panOffset.setValue({ x: nx, y: ny });
      })
      .onEnd((e) => {
        Animated.decay(panOffset, {
          velocity: { x: e.velocityX / 1000, y: e.velocityY / 1000 },
          deceleration: 0.997,
          useNativeDriver: false,
        }).start();
      }),
    [maxTranslateX, maxTranslateY]
  );

  // Pinch wins over pan (2 fingers beats 1 finger via maxPointers(1) on panGesture)
  const composedGesture = useMemo(
    () => Gesture.Race(pinchZoomGesture, panGesture),
    [pinchZoomGesture, panGesture]
  );

  // Keep panCurrentXY in sync; hard-clamp panOffset itself if decay drifts out of bounds.
  // Guard against re-entrancy: AnimatedValueXY.setValue fires the joint callback once per
  // component (x then y), so calling setValue inside the listener would loop infinitely.
  useEffect(() => {
    const id = panOffset.addListener(({ x, y }) => {
      const cx = Math.max(maxTranslateX, Math.min(0, x));
      const cy = Math.max(maxTranslateY, Math.min(0, y));
      panCurrentXY.current = { x: cx, y: cy };
      if (!isClampingRef.current && (x !== cx || y !== cy)) {
        isClampingRef.current = true;
        panOffset.stopAnimation();
        panOffset.setValue({ x: cx, y: cy });
        isClampingRef.current = false;
      }
    });
    return () => panOffset.removeListener(id);
  }, [maxTranslateX, maxTranslateY]);

  const scrollToNow = (animated = true) => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const nowOffset = ((nowMinutes - START_HOUR * 60) / 60) * hourHeight;

    if (isNarrow) {
      const targetNX = Math.max(maxTranslateX, Math.min(0,
        -(now.getDay() * (MOBILE_DAY_WIDTH + DAY_GAP) - Spacing.sm)));
      const targetNY = Math.max(maxTranslateY, Math.min(0, -(Math.max(nowOffset - hourHeight, 0))));
      panCurrentXY.current = { x: targetNX, y: targetNY };
      if (animated) {
        Animated.spring(panOffset, {
          toValue: { x: targetNX, y: targetNY },
          useNativeDriver: false,
          bounciness: 0,
          speed: 14,
        }).start();
      } else {
        panOffset.setValue({ x: targetNX, y: targetNY });
      }
    } else {
      const targetY = Math.max(nowOffset - hourHeight, 0);
      verticalScrollRef.current?.scrollTo({ y: targetY, animated });
    }
  };

  // Reset pan on week change and auto-scroll to now
  useEffect(() => {
    panOffset.stopAnimation();
    panOffset.setValue({ x: 0, y: 0 });
    panCurrentXY.current = { x: 0, y: 0 };
    const timer = setTimeout(() => {
      if (weekOffset === 0) scrollToNow(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [weekOffset]);

  useEffect(() => {
    if (connected) {
      loadEvents(currentWeekStart, currentWeekEnd);
    }
  }, [connected, currentWeekStart.toISOString(), selectedCalendarIds.join(',')]);

  const weekLabel = `${currentWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${currentWeekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

  const handleAddSlot = useCallback((dayDate: string, time?: string) => {
    setAddSlotDate(dayDate);
    setAddSlotTime(time);
    setAddSlotVisible(true);
  }, []);

  const handleCreateSlot = async (label: string, time?: string, recipe?: Recipe, icon?: string | null) => {
    const daySlots = weekPlan?.slots.filter((s) => s.date === addSlotDate) ?? [];
    const slotId = await createSlot({
      label,
      date: addSlotDate,
      time,
      displayOrder: daySlots.length,
      icon,
    });
    if (recipe && slotId) {
      await addRecipeToSlot(slotId, recipe.id);
      if (connected) {
        const eventId = await createMealEvent({
          title: recipe.title,
          date: addSlotDate,
          timeOfDay: time || null,
          slotId,
        });
        if (eventId) await updateExternalEventId(db, slotId, eventId);
      }
    }
  };

  const handleAssignRecipe = useCallback((slotId: string) => {
    setActiveSlotId(slotId);
    setPickerVisible(true);
  }, []);

  const handleRecipeSelected = async (recipe: Recipe) => {
    const slotId = activeSlotId;
    if (!slotId) return;
    await addRecipeToSlot(slotId, recipe.id);

    // Calendar write-back (T071)
    if (connected) {
      const slot = weekPlan?.slots.find((s) => s.id === slotId);
      if (slot) {
        const eventId = await createMealEvent({
          title: recipe.title,
          date: slot.date,
          timeOfDay: slot.time_of_day || null,
          slotId,
        });
        if (eventId) await updateExternalEventId(db, slotId, eventId);
      }
    }
  };

  const handleDeleteSlot = useCallback(async (slotId: string) => {
    const slot = weekPlan?.slots.find((s) => s.id === slotId);
    if (connected && slot?.external_event_id) {
      await deleteMealEvent(slot.external_event_id);
    }
    await deleteSlot(slotId);
  }, [deleteSlot, connected, weekPlan]);

  const handleSlotPress = useCallback((slot: import('@/services/meal-plan-service').MealSlotWithRecipe) => {
    if (slot.recipes.length > 0) setSelectedSlot(slot);
    else handleAssignRecipe(slot.id);
  }, [handleAssignRecipe]);

  const handleAddRecipeToSlot = useCallback(() => {
    if (!selectedSlot) return;
    setActiveSlotId(selectedSlot.id);
    setSelectedSlot(null);
    setPickerVisible(true);
  }, [selectedSlot]);

  const handleRemoveRecipeFromSlot = useCallback(async (slotRecipeId: string) => {
    await removeRecipeFromSlot(slotRecipeId);
    setSelectedSlot((prev) =>
      prev ? { ...prev, recipes: prev.recipes.filter((r) => r.id !== slotRecipeId) } : null
    );
  }, [removeRecipeFromSlot]);

  const handleSaveRecipeServings = useCallback(async (slotRecipeId: string, servings: number | null) => {
    await updateSlotRecipeServings(slotRecipeId, servings);
  }, [updateSlotRecipeServings]);

  const handleFoodLogPress = useCallback((log: import('@/services/food-log-service').FoodLogWithItems) => {
    setSelectedLog(log);
  }, []);

  const handleDeleteFoodLogItem = useCallback(async (logId: string, itemId: string) => {
    await deleteFoodLogItem(logId, itemId);
    setSelectedLog((prev) => {
      if (!prev || prev.id !== logId) return prev;
      const remaining = prev.items.filter((i) => i.id !== itemId);
      return remaining.length > 0 ? { ...prev, items: remaining } : null;
    });
  }, [deleteFoodLogItem]);

  const handleUpdateFoodLogItem = useCallback(async (logId: string, itemId: string, patch: Parameters<typeof updateFoodLogItem>[2]) => {
    await updateFoodLogItem(logId, itemId, patch);
    setSelectedLog((prev) => {
      if (!prev || prev.id !== logId) return prev;
      return { ...prev, items: prev.items.map((i) => i.id === itemId ? { ...i, ...patch } : i) };
    });
  }, [updateFoodLogItem]);

  const handleLogFood = useCallback(async (date: string, params: { label: string | null; timeOfDay: string | null; items: any[]; icon?: string | null }) => {
    await createFoodLog(date, params.label, params.timeOfDay, params.items, params.icon);
  }, [createFoodLog]);

  const handleDeleteFoodLog = useCallback(async (id: string) => {
    await deleteFoodLog(id);
  }, [deleteFoodLog]);

  const handleUpdateFoodLogTime = useCallback(async (logId: string, newTime: string | null) => {
    await updateFoodLog(logId, { time_of_day: newTime });
    setSelectedLog((prev) => prev?.id === logId ? { ...prev, time_of_day: newTime } : prev);
  }, [updateFoodLog]);

  const handleUpdateSlot = useCallback(async (slotId: string, patch: { label?: string; time_of_day?: string | null; icon?: string | null }) => {
    await updateSlot(slotId, patch);
    setSelectedSlot((prev) => prev?.id === slotId ? { ...prev, ...patch } : prev);
  }, [updateSlot]);

  const handleUpdateFoodLog = useCallback(async (logId: string, patch: { label?: string | null; icon?: string | null }) => {
    await updateFoodLog(logId, patch);
    setSelectedLog((prev) => prev?.id === logId ? { ...prev, ...patch } : prev);
  }, [updateFoodLog]);

  const handleAddItemsToLog = useCallback(async (logId: string, items: import('@/services/food-log-service').FoodLogItemInput[]) => {
    const newItems = await addItemsToFoodLog(logId, items);
    setSelectedLog((prev) => {
      if (!prev || prev.id !== logId) return prev;
      return { ...prev, items: [...prev.items, ...newItems] };
    });
  }, [addItemsToFoodLog]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const dayDate = addDays(currentWeekStart, i);
    const dayStr = dateToString(dayDate);
    const daySlots = weekPlan?.slots.filter((s) => s.date === dayStr) ?? [];
    const dayEvents = events.filter((e) => isSameDay(e.startDate, dayStr));
    const dayLogs = weekLogs.filter((l) => l.date === dayStr);
    const isToday = dateToString(today) === dayStr;
    return {
      dayIndex: i,
      date: dayStr,
      isToday,
      timedSlots: daySlots.filter((s) => parseTimeToMinutes(s.time_of_day) != null),
      untimedSlots: daySlots.filter((s) => parseTimeToMinutes(s.time_of_day) == null),
      timedEvents: dayEvents.filter((e) => !e.isAllDay),
      allDayEvents: dayEvents.filter((e) => e.isAllDay),
      timedFoodLogs: dayLogs.filter((l) => parseTimeToMinutes(l.time_of_day) != null),
      untimedFoodLogs: dayLogs.filter((l) => parseTimeToMinutes(l.time_of_day) == null),
    };
  }) satisfies DayData[];

  const hasTopItems = days.some((d) => d.allDayEvents.length > 0 || d.untimedSlots.length > 0 || d.untimedFoodLogs.length > 0);

  const isCurrentWeek = weekOffset === 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header — swipe left/right on native; arrow buttons handle web */}
      {Platform.OS !== 'web' ? (
        <GestureDetector gesture={swipeGesture}>
          <View style={styles.header}>
            <Pressable onPress={() => setWeekOffset((o) => o - 1)}>
              <Text style={[styles.navArrow, { color: Colors.accent }]}>‹</Text>
            </Pressable>
            <View style={styles.headerCenter}>
              <Pressable onPress={() => setWeekPickerVisible(true)}>
                <Text style={[styles.weekLabel, { color: theme.text }]}>{weekLabel} ▾</Text>
              </Pressable>
              {weekOffset !== 0 && (
                <Pressable onPress={() => setWeekOffset(0)}>
                  <Text style={[styles.todayLink, { color: Colors.accent }]}>Today</Text>
                </Pressable>
              )}
            </View>
            <Pressable onPress={() => setWeekOffset((o) => o + 1)}>
              <Text style={[styles.navArrow, { color: Colors.accent }]}>›</Text>
            </Pressable>
          </View>
        </GestureDetector>
      ) : (
        <View style={styles.header}>
          <Pressable onPress={() => setWeekOffset((o) => o - 1)}>
            <Text style={[styles.navArrow, { color: Colors.accent }]}>‹</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Pressable onPress={() => setWeekPickerVisible(true)}>
              <Text style={[styles.weekLabel, { color: theme.text }]}>{weekLabel} ▾</Text>
            </Pressable>
            {weekOffset !== 0 && (
              <Pressable onPress={() => setWeekOffset(0)}>
                <Text style={[styles.todayLink, { color: Colors.accent }]}>Today</Text>
              </Pressable>
            )}
          </View>
          <Pressable onPress={() => setWeekOffset((o) => o + 1)}>
            <Text style={[styles.navArrow, { color: Colors.accent }]}>›</Text>
          </Pressable>
        </View>
      )}

      {/* Calendar connect / connected banner */}
      <View style={styles.connectRow}>
        {connected ? (
          <View style={styles.connectedBadge}>
            {googleEventsRefreshing ? (
              <ActivityIndicator size="small" color={theme.textSecondary} />
            ) : (
              <View style={[styles.connectedDot, { backgroundColor: theme.success }]} />
            )}
            <Pressable style={styles.connectedTitleRow} onPress={() => setCalPickerVisible(true)}>
              <Text style={[styles.connectedText, { color: theme.textSecondary }]}>
                {googleEventsRefreshing ? 'Refreshing…' : connectedCalendarTitle}
              </Text>
              {!googleEventsRefreshing && (
                <Text style={[styles.changeCalendarText, { color: Colors.accent }]}>▾</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <>
            <Pressable style={styles.connectBanner} onPress={connect} accessibilityRole="button" accessibilityLabel="Connect your calendar">
              <Text style={styles.connectText}>Connect Calendar</Text>
            </Pressable>
            {(loadError || connectError) ? (
              <Text style={[styles.connectErrorText, { color: theme.textSecondary }]}>{loadError ?? connectError}</Text>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.calendarShell}>
        {isNarrow ? (
          // Narrow/mobile path: single pan area, no nested ScrollViews
          <View
            style={{ flex: 1, overflow: 'hidden' }}
            onLayout={(e) => setViewportWidth(e.nativeEvent.layout.width)}
          >
            {/* Day headers — translate X only (sticky vertically) */}
            <Animated.View
              style={{
                width: MOBILE_CALENDAR_WIDTH,
                transform: [{ translateX: panOffset.x }],
              }}
            >
              <View style={styles.dayHeaderRow}>
                {days.map((day) => (
                  <DayHeader key={day.date} dayIndex={day.dayIndex} date={day.date} isToday={day.isToday} isNarrow />
                ))}
              </View>
            </Animated.View>

            {/* All-day row — translate X only */}
            {hasTopItems && (
              <Animated.View
                style={{
                  width: MOBILE_CALENDAR_WIDTH,
                  transform: [{ translateX: panOffset.x }],
                }}
              >
                <View style={styles.dayHeaderRow}>
                  {days.map((day) => (
                    <AllDayCell
                      key={day.date}
                      events={day.allDayEvents}
                      untimedSlots={day.untimedSlots}
                      untimedFoodLogs={day.untimedFoodLogs}
                      onEventPress={setSelectedEvent}
                      onAssignRecipe={handleAssignRecipe}
                      onDeleteSlot={handleDeleteSlot}
                      onDeleteFoodLog={handleDeleteFoodLog}
                      onFoodLogPress={handleFoodLogPress}
                    />
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Scrollable grid — pan X and Y, pinch zoom */}
            <GestureDetector gesture={composedGesture}>
              <View
                style={{ flex: 1, overflow: 'hidden' }}
                onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
              >
                <Animated.View
                  style={{
                    width: MOBILE_CALENDAR_WIDTH,
                    transform: [{ translateX: panOffset.x }, { translateY: panOffset.y }],
                  }}
                >
                  <Animated.View
                    style={[{ height: gridHeight, width: MOBILE_CALENDAR_WIDTH, flexDirection: 'row', gap: DAY_GAP }, pinchPreviewTransform]}
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <DayColumn
                        key={i}
                        bgColor={theme.backgroundElement}
                        borderColor={theme.border}
                        textColor={theme.textSecondary}
                        hourHeight={hourHeight}
                      />
                    ))}
                    <WeekEventsOverlay
                      days={days}
                      isCurrentWeek={isCurrentWeek}
                      hourHeight={hourHeight}
                      gridHeight={gridHeight}
                      onAddSlot={handleAddSlot}
                      onAssignRecipe={handleAssignRecipe}
                      onSlotPress={handleSlotPress}
                      onDeleteSlot={handleDeleteSlot}
                      onDeleteFoodLog={handleDeleteFoodLog}
                      onEventPress={setSelectedEvent}
                      onFoodLogPress={handleFoodLogPress}
                      onUpdateFoodLogTime={handleUpdateFoodLogTime}
                    />
                  </Animated.View>
                </Animated.View>
              </View>
            </GestureDetector>
          </View>
        ) : (
          // Wide/web path: unchanged vertical ScrollView
          <>
            <View style={styles.dayHeaderRow}>
              {days.map((day) => (
                <DayHeader key={day.date} dayIndex={day.dayIndex} date={day.date} isToday={day.isToday} />
              ))}
            </View>

            {hasTopItems && (
              <View style={styles.dayHeaderRow}>
                {days.map((day) => (
                  <AllDayCell
                    key={day.date}
                    events={day.allDayEvents}
                    untimedSlots={day.untimedSlots}
                    untimedFoodLogs={day.untimedFoodLogs}
                    onEventPress={setSelectedEvent}
                    onAssignRecipe={handleAssignRecipe}
                    onDeleteSlot={handleDeleteSlot}
                    onDeleteFoodLog={handleDeleteFoodLog}
                    onFoodLogPress={handleFoodLogPress}
                  />
                ))}
              </View>
            )}

            <GestureDetector gesture={pinchZoomGesture}>
              <ScrollView
                ref={verticalScrollRef}
                style={styles.scrollArea}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={Colors.accent}
                    colors={[Colors.accent]}
                  />
                }
                onLayout={(event) => {
                  const { height } = event.nativeEvent.layout;
                  setViewportHeight(height);
                }}
                scrollEventThrottle={16}
              >
                <Animated.View style={[styles.weekGrid, styles.weekGridWeb, { height: gridHeight }, pinchPreviewTransform]}>
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <DayColumn
                      key={i}
                      bgColor={theme.backgroundElement}
                      borderColor={theme.border}
                      textColor={theme.textSecondary}
                      hourHeight={hourHeight}
                    />
                  ))}
                  <WeekEventsOverlay
                    days={days}
                    isCurrentWeek={isCurrentWeek}
                    hourHeight={hourHeight}
                    gridHeight={gridHeight}
                    onAddSlot={handleAddSlot}
                    onAssignRecipe={handleAssignRecipe}
                    onSlotPress={handleSlotPress}
                    onDeleteSlot={handleDeleteSlot}
                    onDeleteFoodLog={handleDeleteFoodLog}
                    onEventPress={setSelectedEvent}
                    onFoodLogPress={handleFoodLogPress}
                    onUpdateFoodLogTime={handleUpdateFoodLogTime}
                  />
                </Animated.View>
              </ScrollView>
            </GestureDetector>
          </>
        )}
      </View>

      <Pressable style={styles.addButton} onPress={() => handleAddSlot(dateToString(today))}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      {/* Modals */}
      <AddMealSlotModal
        visible={addSlotVisible}
        date={addSlotDate}
        initialTime={addSlotTime}
        userId={currentUserId}
        onClose={() => setAddSlotVisible(false)}
        onAdd={handleCreateSlot}
        onLogFood={handleLogFood}
      />

      <RecipePickerModal
        visible={pickerVisible}
        onClose={() => {
          setPickerVisible(false);
          setActiveSlotId(null);
        }}
        onSelect={handleRecipeSelected}
      />

      <CalendarPickerModal
        visible={calPickerVisible}
        calendars={availableCalendars}
        selectedIds={selectedCalendarIds}
        onDone={(ids) => { selectCalendars(ids); setCalPickerVisible(false); }}
      />

      <MealSlotDetailModal
        slot={selectedSlot}
        onClose={() => setSelectedSlot(null)}
        onAddRecipe={handleAddRecipeToSlot}
        onRemoveRecipe={handleRemoveRecipeFromSlot}
        onSaveRecipeServings={handleSaveRecipeServings}
        onUpdateSlot={handleUpdateSlot}
      />

      <FoodLogDetailModal
        log={selectedLog}
        userId={currentUserId}
        onClose={() => setSelectedLog(null)}
        onDeleteLog={(logId) => { deleteFoodLog(logId); setSelectedLog(null); }}
        onDeleteItem={handleDeleteFoodLogItem}
        onUpdateItem={handleUpdateFoodLogItem}
        onAddItems={handleAddItemsToLog}
        onUpdateTime={handleUpdateFoodLogTime}
        onUpdateLog={handleUpdateFoodLog}
      />

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      <WeekPickerModal
        visible={weekPickerVisible}
        weekOffset={weekOffset}
        onSelect={setWeekOffset}
        onClose={() => setWeekPickerVisible(false)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  } as ViewStyle,
  headerCenter: {
    alignItems: 'center',
  } as ViewStyle,
  weekLabel: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  } as TextStyle,
  todayLink: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginTop: 2,
  } as TextStyle,
  navArrow: {
    fontSize: 32,
    fontWeight: '300',
    paddingHorizontal: Spacing.sm,
  } as TextStyle,
  dayHeaderRow: {
    flexDirection: 'row',
    gap: 2,
  } as ViewStyle,
  calendarShell: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  } as ViewStyle,
  connectRow: {
    flexDirection: 'column',
    alignSelf: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  } as ViewStyle,
  connectBanner: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
  } as ViewStyle,
  connectText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  } as TextStyle,
  connectErrorText: {
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
    textAlign: 'center',
  } as TextStyle,
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  } as ViewStyle,
  connectedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  } as ViewStyle,
  connectedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  } as ViewStyle,
  connectedText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
  changeCalendarText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
  scrollArea: {
    flex: 1,
  } as ViewStyle,
  scrollContentWeb: {
    flex: 1,
  } as ViewStyle,
  weekGrid: {
    flexDirection: 'row',
    gap: 2,
    minWidth: '100%',
  } as ViewStyle,
  weekGridWeb: {
    flex: 1,
  } as ViewStyle,
  addButton: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.full,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 3px 8px rgba(0,0,0,0.18)' }
      : {
          shadowColor: '#000000',
          shadowOpacity: 0.18,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }),
  } as ViewStyle,
});

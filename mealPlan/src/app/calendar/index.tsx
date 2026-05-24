import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Platform, ActivityIndicator, useWindowDimensions, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useMealPlan } from '@/hooks/use-meal-plan';
import { useCalendar } from '@/hooks/use-calendar';
import { DayColumn, DayHeader, AllDayCell, START_HOUR, HOUR_HEIGHT } from '@/components/calendar/day-column';
import { AddMealSlotModal } from '@/components/calendar/add-meal-slot-modal';
import { RecipePickerModal } from '@/components/calendar/recipe-picker-modal';
import { CalendarPickerModal } from '@/components/calendar/calendar-picker-modal';
import { EventDetailModal } from '@/components/calendar/event-detail-modal';
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
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [weekOffset, setWeekOffset] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollX, setScrollX] = useState(0);
  const [horizontalViewportWidth, setHorizontalViewportWidth] = useState(0);
  const isNarrow = windowWidth > 0 && windowWidth < 7 * 130;

  const today = new Date();
  const currentWeekStart = getSunday(addDays(today, weekOffset * 7));
  const currentWeekEnd = addDays(currentWeekStart, 7);

  const { weekPlan, loading, createSlot, assignRecipe, deleteSlot, refresh } = useMealPlan(currentWeekStart);
  const {
    connected, events, loading: calendarLoading, connectError, loadError,
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

  const verticalScrollRef = useRef<ScrollView>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);

  const scrollToNow = (animated = true) => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const nowOffset = ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const targetY = Math.max(nowOffset - HOUR_HEIGHT, 0);
    const currentDayIndex = now.getDay();
    const targetX = Math.max(currentDayIndex * (MOBILE_DAY_WIDTH + DAY_GAP) - Spacing.sm, 0);

    if (isNarrow) {
      horizontalScrollRef.current?.scrollTo({ x: targetX, animated });
    }

    verticalScrollRef.current?.scrollTo({ y: targetY, animated });
  };

  // Auto-scroll all columns to current time on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToNow(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [weekOffset]);

  useEffect(() => {
    if (connected) {
      loadEvents(currentWeekStart, currentWeekEnd);
    }
  }, [connected, currentWeekStart.toISOString(), selectedCalendarIds.join(',')]);

  const weekLabel = `${currentWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${currentWeekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

  const handleAddSlot = (dayDate: string, time?: string) => {
    setAddSlotDate(dayDate);
    setAddSlotTime(time);
    setAddSlotVisible(true);
  };

  const handleCreateSlot = async (label: string, time?: string) => {
    const daySlots = weekPlan?.slots.filter((s) => s.date === addSlotDate) ?? [];
    await createSlot({
      label,
      date: addSlotDate,
      time,
      displayOrder: daySlots.length,
    });
  };

  const handleAssignRecipe = (slotId: string) => {
    setActiveSlotId(slotId);
    setPickerVisible(true);
  };

  const handleRecipeSelected = async (recipe: Recipe) => {
    if (!activeSlotId) return;
    await assignRecipe(activeSlotId, recipe.id);

    // Calendar write-back (T071)
    if (connected) {
      const slot = weekPlan?.slots.find((s) => s.id === activeSlotId);
      if (slot) {
        await createMealEvent({
          title: recipe.title,
          date: slot.date,
          timeOfDay: slot.time_of_day || null,
          slotId: activeSlotId,
        });
      }
    }
  };

  const handleDeleteSlot = useCallback(async (slotId: string) => {
    await deleteSlot(slotId);
  }, [deleteSlot]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const dayDate = addDays(currentWeekStart, i);
    const dayStr = dateToString(dayDate);
    const daySlots = weekPlan?.slots.filter((s) => s.date === dayStr) ?? [];
    const dayEvents = events.filter((e) => isSameDay(e.startDate, dayStr));
    const isToday = dateToString(today) === dayStr;

    return { dayIndex: i, date: dayStr, slots: daySlots, events: dayEvents, isToday };
  });

  const hasAllDayEvents = days.some((d) => d.events.some((e) => e.isAllDay));

  const now = new Date();
  const isCurrentWeek = weekOffset === 0;
  const nowIndicatorY = ((now.getHours() * 60 + now.getMinutes() - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const currentDayIndex = now.getDay();
  const currentDayLeft = currentDayIndex * (MOBILE_DAY_WIDTH + DAY_GAP);
  const currentDayRight = currentDayLeft + MOBILE_DAY_WIDTH;
  const nowOffscreenTop = nowIndicatorY < scrollY + 16;
  const nowOffscreenBottom = nowIndicatorY > scrollY + viewportHeight - 16;
  const nowOffscreenLeft = isNarrow && horizontalViewportWidth > 0 && currentDayLeft < scrollX + 16;
  const nowOffscreenRight = isNarrow && horizontalViewportWidth > 0 && currentDayRight > scrollX + horizontalViewportWidth - 16;
  const showScrollToNow = isCurrentWeek && viewportHeight > 0 && (
    nowOffscreenTop || nowOffscreenBottom || nowOffscreenLeft || nowOffscreenRight
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setWeekOffset((o) => o - 1)}>
          <Text style={[styles.navArrow, { color: Colors.accent }]}>‹</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={[styles.weekLabel, { color: theme.text }]}>{weekLabel}</Text>
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

      {/* Calendar connect / connected banner */}
      <View style={styles.connectRow}>
        {connected ? (
          <View style={styles.connectedBadge}>
            {calendarLoading ? (
              <ActivityIndicator size="small" color={theme.textSecondary} />
            ) : (
              <View style={[styles.connectedDot, { backgroundColor: theme.success }]} />
            )}
            <Text style={[styles.connectedText, { color: theme.textSecondary }]}>
              {calendarLoading ? 'Loading events…' : `${connectedCalendarTitle} connected`}
            </Text>
            {!calendarLoading && availableCalendars.length > 1 && (
              <Pressable onPress={() => setCalPickerVisible(true)}>
                <Text style={[styles.changeCalendarText, { color: Colors.accent }]}>Change</Text>
              </Pressable>
            )}
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
          <ScrollView
            ref={horizontalScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onLayout={(event) => setHorizontalViewportWidth(event.nativeEvent.layout.width)}
            onScroll={(event) => setScrollX(event.nativeEvent.contentOffset.x)}
            scrollEventThrottle={16}
            contentContainerStyle={styles.mobileCalendarContent}
          >
            <View style={styles.mobileCalendarInner}>
              <View style={styles.dayHeaderRow}>
                {days.map((day) => (
                  <DayHeader key={day.date} dayIndex={day.dayIndex} date={day.date} isToday={day.isToday} isNarrow />
                ))}
              </View>

              {hasAllDayEvents && (
                <View style={styles.dayHeaderRow}>
                  {days.map((day) => (
                    <AllDayCell key={day.date} events={day.events.filter((e) => e.isAllDay)} onEventPress={setSelectedEvent} />
                  ))}
                </View>
              )}

              <ScrollView
                ref={verticalScrollRef}
                style={styles.scrollArea}
                showsVerticalScrollIndicator={false}
                onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
                onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
                scrollEventThrottle={16}
              >
                <View style={styles.weekGrid}>
                  {days.map((day) => (
                    <DayColumn
                      key={day.date}
                      dayIndex={day.dayIndex}
                      date={day.date}
                      slots={day.slots}
                      externalEvents={day.events.filter((e) => !e.isAllDay)}
                      onAddSlot={(time: string) => handleAddSlot(day.date, time)}
                      onSlotPress={() => {}}
                      onDeleteSlot={handleDeleteSlot}
                      onAssignRecipe={handleAssignRecipe}
                      onEventPress={setSelectedEvent}
                      isToday={day.isToday}
                      isNarrow
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          </ScrollView>
        ) : (
          <>
            <View style={styles.dayHeaderRow}>
              {days.map((day) => (
                <DayHeader key={day.date} dayIndex={day.dayIndex} date={day.date} isToday={day.isToday} />
              ))}
            </View>

            {hasAllDayEvents && (
              <View style={styles.dayHeaderRow}>
                {days.map((day) => (
                  <AllDayCell key={day.date} events={day.events.filter((e) => e.isAllDay)} />
                ))}
              </View>
            )}

            <ScrollView
              ref={verticalScrollRef}
              style={styles.scrollArea}
              showsVerticalScrollIndicator={false}
              onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
              onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
              scrollEventThrottle={16}
            >
              <View style={[styles.weekGrid, styles.weekGridWeb]}>
                {days.map((day) => (
                  <DayColumn
                    key={day.date}
                    dayIndex={day.dayIndex}
                    date={day.date}
                    slots={day.slots}
                    externalEvents={day.events.filter((e) => !e.isAllDay)}
                    onAddSlot={(time: string) => handleAddSlot(day.date, time)}
                    onSlotPress={() => {}}
                    onDeleteSlot={handleDeleteSlot}
                    onAssignRecipe={handleAssignRecipe}
                    isToday={day.isToday}
                  />
                ))}
              </View>
            </ScrollView>
          </>
        )}
      </View>

      {showScrollToNow && (
        <Pressable style={styles.scrollToNowButton} onPress={() => scrollToNow()}>
          <Text style={styles.scrollToNowText}>Now</Text>
        </Pressable>
      )}

      {/* Modals */}
      <AddMealSlotModal
        visible={addSlotVisible}
        date={addSlotDate}
        initialTime={addSlotTime}
        onClose={() => setAddSlotVisible(false)}
        onAdd={handleCreateSlot}
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

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === 'web' ? { minHeight: '100vh' } : {}),
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
  mobileCalendarContent: {
    width: MOBILE_CALENDAR_WIDTH,
  } as ViewStyle,
  mobileCalendarInner: {
    flex: 1,
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
  connectedText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  } as TextStyle,
  changeCalendarText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    marginLeft: Spacing.xs,
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
  scrollToNowButton: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  } as ViewStyle,
  scrollToNowText: {
    color: '#FFFFFF',
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
});

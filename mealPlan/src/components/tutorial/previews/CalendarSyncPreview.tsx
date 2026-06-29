import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Colors, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { MealSlotCard } from '@/components/calendar/meal-slot-card';
import { ExternalEventBlock } from '@/components/calendar/external-event-block';
import type { MealSlotWithRecipe } from '@/services/meal-plan-service';
import type { CalendarEvent } from '@/services/calendar.types';
import type { Recipe } from '@/models/recipe';

const NOOP = () => {};

// Mini grid constants — same math as WeekEventsOverlay but compressed
const HOUR_HEIGHT = 30;          // real calendar uses 52; shrink for preview
const START_HOUR = 8;            // show 8 AM – 3 PM (7 hours = 210px)
const VISIBLE_HOURS = [8, 9, 10, 11, 12, 13, 14];

function minutesToTop(h: number, m: number): number {
  return ((h - START_HOUR) + m / 60) * HOUR_HEIGHT;
}
const SLOT_HEIGHT = HOUR_HEIGHT; // 60-min slots

// Day headers (Sun=0 … Sat=6, matches real app)
// Show Thu 26, Fri 27 (today), Sat 28
const DAYS = [
  { dayIndex: 4, date: '2026-06-26', label: 'Thu', dateNum: 26, isToday: false },
  { dayIndex: 5, date: '2026-06-27', label: 'Fri', dateNum: 27, isToday: true },
  { dayIndex: 6, date: '2026-06-28', label: 'Sat', dateNum: 28, isToday: false },
];

// Filler recipe
const mkRecipe = (title: string, kcal: number): Recipe => ({
  id: title,
  user_id: null,
  title,
  source_type: 'user_created',
  servings: 1,
  is_favorited: false,
  is_offline_available: false,
  calories_per_serving: kcal,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const mkSlot = (id: string, label: string, timeH: number, timeM: number, recipe: Recipe): MealSlotWithRecipe & { _top: number } => ({
  id,
  meal_plan_id: 'mp1',
  label,
  date: '2026-06-27',
  time_of_day: `${String(timeH).padStart(2, '0')}:${String(timeM).padStart(2, '0')}`,
  display_order: 0,
  icon: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  recipes: [{ id: `${id}-r`, meal_slot_id: id, recipe_id: recipe.id, servings_eaten: null, display_order: 0, recipe }],
  _top: minutesToTop(timeH, timeM),
});

const mkEvent = (id: string, title: string, startH: number, endH: number): CalendarEvent & { _top: number; _height: number } => ({
  id,
  title,
  startDate: new Date(2026, 5, 27, startH, 0),
  endDate: new Date(2026, 5, 27, endH, 0),
  calendarId: 'cal1',
  isAllDay: false,
  _top: minutesToTop(startH, 0),
  _height: (endH - startH) * HOUR_HEIGHT,
});

// Per-day data
const THU_SLOTS = [mkSlot('thu-lunch', 'Lunch', 12, 0, mkRecipe('Chicken Bowl', 520))];
const THU_EVENTS: (CalendarEvent & { _top: number; _height: number })[] = [];

const FRI_SLOTS = [mkSlot('fri-lunch', 'Lunch', 12, 30, mkRecipe('Salmon Salad', 390))];
const FRI_EVENTS = [mkEvent('fri-standup', 'Team Standup', 9, 10)];

const SAT_SLOTS: (MealSlotWithRecipe & { _top: number })[] = [];
const SAT_EVENTS = [mkEvent('sat-doctor', 'Doctor Appt', 13, 14)];

const DAY_DATA = [
  { day: DAYS[0], slots: THU_SLOTS, events: THU_EVENTS },
  { day: DAYS[1], slots: FRI_SLOTS, events: FRI_EVENTS },
  { day: DAYS[2], slots: SAT_SLOTS, events: SAT_EVENTS },
];

const GRID_HEIGHT = VISIBLE_HOURS.length * HOUR_HEIGHT;

export function CalendarSyncPreview() {
  const theme = useTheme();

  return (
    <View style={styles.wrapper}>
      {/* Day header row */}
      <View style={[styles.headerRow, { borderBottomColor: theme.border }]}>
        <View style={styles.timeGutter} />
        {DAYS.map((d) => (
          <View
            key={d.label}
            style={[
              styles.dayHeader,
              { backgroundColor: theme.backgroundElement },
              d.isToday && { backgroundColor: Colors.accent },
            ]}
          >
            <Text style={[styles.dayName, { color: d.isToday ? '#fff' : theme.textSecondary }]}>
              {d.label}
            </Text>
            <Text style={[styles.dayNum, { color: d.isToday ? '#fff' : theme.text }]}>
              {d.dateNum}
            </Text>
          </View>
        ))}
      </View>

      {/* Grid body */}
      <View style={[styles.gridBody, { height: GRID_HEIGHT }]}>
        {/* Time gutter — hour labels */}
        <View style={styles.timeGutter}>
          {VISIBLE_HOURS.map((h) => (
            <View key={h} style={[styles.hourCell, { height: HOUR_HEIGHT, borderBottomColor: theme.border }]}>
              <Text style={[styles.hourLabel, { color: theme.textSecondary }]}>
                {h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
              </Text>
            </View>
          ))}
        </View>

        {/* Day columns */}
        {DAY_DATA.map(({ day, slots, events }) => (
          <View
            key={day.label}
            style={[styles.dayCol, { borderLeftColor: theme.border }]}
          >
            {/* Hour grid lines */}
            {VISIBLE_HOURS.map((h) => (
              <View key={h} style={[styles.hourLine, { height: HOUR_HEIGHT, borderBottomColor: theme.border }]} />
            ))}

            {/* External events (calendar) — positioned absolutely */}
            {events.map((ev) => (
              <View
                key={ev.id}
                style={[styles.absItem, { top: ev._top, height: ev._height }]}
              >
                <ExternalEventBlock event={ev} compact={ev._height < 48} />
              </View>
            ))}

            {/* Meal slots — positioned absolutely */}
            {slots.map((slot) => (
              <View
                key={slot.id}
                style={[styles.absItem, { top: slot._top, height: SLOT_HEIGHT }]}
              >
                <MealSlotCard
                  slot={slot}
                  compact={SLOT_HEIGHT < 48}
                  onPress={NOOP}
                  onAssignRecipe={NOOP}
                  onDelete={NOOP}
                />
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={[styles.legend, { borderTopColor: theme.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: 'rgba(74,144,217,0.4)', borderLeftColor: '#4A90D9' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Meal slot</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: 'rgba(74,144,217,0.25)', borderLeftColor: '#4A90D9' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Calendar event</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 0,
  } as ViewStyle,
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  timeGutter: {
    width: 36,
  } as ViewStyle,
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: 2,
    borderRadius: BorderRadius.sm,
    margin: 2,
  } as ViewStyle,
  dayName: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  } as TextStyle,
  dayNum: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  } as TextStyle,
  gridBody: {
    flexDirection: 'row',
  } as ViewStyle,
  hourCell: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'flex-start',
    paddingTop: 2,
  } as ViewStyle,
  hourLabel: {
    fontSize: 8,
    fontWeight: '500',
    textAlign: 'right',
    paddingRight: 4,
  } as TextStyle,
  dayCol: {
    flex: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    position: 'relative',
  } as ViewStyle,
  hourLine: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as ViewStyle,
  absItem: {
    position: 'absolute',
    left: 2,
    right: 2,
  } as ViewStyle,
  legend: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.xs,
  } as ViewStyle,
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  } as ViewStyle,
  swatch: {
    width: 22,
    height: 12,
    borderRadius: 3,
    borderLeftWidth: 3,
  } as ViewStyle,
  legendText: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  } as TextStyle,
});

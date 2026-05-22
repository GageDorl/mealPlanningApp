import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import type { CalendarEvent, MealEventInput } from './calendar.types';

export type { CalendarEvent, MealEventInput };

async function requestPermissions(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

async function getDefaultCalendarId(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.filter((c) => c.allowsModifications);

  if (Platform.OS === 'ios') {
    const defaultCal = writable.find((c) => c.source?.name === 'Default');
    return defaultCal?.id ?? writable[0]?.id ?? null;
  }

  const primary = writable.find((c) => c.isPrimary);
  return primary?.id ?? writable[0]?.id ?? null;
}

export async function connect(): Promise<{ granted: boolean }> {
  const granted = await requestPermissions();
  return { granted };
}

export async function getEvents(start: Date, end: Date): Promise<CalendarEvent[]> {
  const granted = await requestPermissions();
  if (!granted) return [];

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const calendarIds = calendars.map((c) => c.id);

  const events = await Calendar.getEventsAsync(calendarIds, start, end);

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    startDate: new Date(e.startDate),
    endDate: new Date(e.endDate),
    calendarId: e.calendarId,
    isAllDay: e.allDay ?? false,
  }));
}

export async function createMealEvent(input: MealEventInput): Promise<string | null> {
  const granted = await requestPermissions();
  if (!granted) return null;

  const calendarId = await getDefaultCalendarId();
  if (!calendarId) return null;

  const startDate = new Date(input.date);
  if (input.timeOfDay) {
    const [hours, minutes] = input.timeOfDay.split(':').map(Number);
    startDate.setHours(hours, minutes, 0, 0);
  } else {
    startDate.setHours(12, 0, 0, 0);
  }

  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + 30);

  const eventId = await Calendar.createEventAsync(calendarId, {
    title: `Prepd: ${input.title}`,
    startDate,
    endDate,
    notes: `Meal slot: ${input.slotId}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  return eventId;
}

export async function deleteMealEvent(eventId: string): Promise<void> {
  try {
    await Calendar.deleteEventAsync(eventId);
  } catch {
    // Event may have already been deleted externally
  }
}

export async function disconnect(): Promise<void> {
  // Native calendar permissions can't be revoked programmatically;
  // user must go to device settings. This is a no-op on native.
}

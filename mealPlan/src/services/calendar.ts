import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';
import type { CalendarEvent, CalendarInfo, MealEventInput } from './calendar.types';

export type { CalendarEvent, CalendarInfo, MealEventInput };

const PREFS_KEY = '@prepd/calendar_prefs';

interface CalendarPrefs {
  disconnected: boolean;
  selectedCalendarIds: string[];
  prepdCalendarId?: string;
  calendarExportEnabled: boolean;
}

async function loadPrefs(): Promise<CalendarPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw) as CalendarPrefs;
  } catch {}
  return { disconnected: false, selectedCalendarIds: [], calendarExportEnabled: true };
}

async function savePrefs(prefs: Partial<CalendarPrefs>): Promise<void> {
  try {
    const current = await loadPrefs();
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
  } catch {}
}

async function requestPermissions(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

async function getOrCreatePrepdCalendar(): Promise<string | null> {
  try {
    const prefs = await loadPrefs();
    const all = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

    if (prefs.prepdCalendarId && all.find((c) => c.id === prefs.prepdCalendarId)) {
      return prefs.prepdCalendarId;
    }

    const existing = all.find((c) => c.title === 'Prepd' && c.allowsModifications);
    if (existing) {
      await savePrefs({ prepdCalendarId: existing.id });
      return existing.id;
    }

    const writable = all.filter((c) => c.allowsModifications);
    const base =
      Platform.OS === 'ios'
        ? (writable.find((c) => c.source?.isLocalAccount) ?? writable[0])
        : (writable.find((c) => c.isPrimary) ?? writable[0]);

    if (!base?.source) return null;

    const calendarId = await Calendar.createCalendarAsync({
      title: 'Prepd',
      color: '#FF6B35',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: base.source.id,
      source: base.source,
      name: 'prepd',
      ownerAccount: base.source.name ?? 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });

    await savePrefs({ prepdCalendarId: calendarId });
    return calendarId;
  } catch (e) {
    console.error('[calendar] getOrCreatePrepdCalendar failed:', e);
    return null;
  }
}

async function getWritableCalendarId(): Promise<string | null> {
  const { selectedCalendarIds } = await loadPrefs();
  if (selectedCalendarIds.length > 0) return selectedCalendarIds[0];

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.filter((c) => c.allowsModifications);

  if (Platform.OS === 'ios') {
    const defaultCal = writable.find((c) => c.source?.name === 'Default');
    return defaultCal?.id ?? writable[0]?.id ?? null;
  }

  const primary = writable.find((c) => c.isPrimary);
  return primary?.id ?? writable[0]?.id ?? null;
}

export async function getAvailableCalendars(): Promise<CalendarInfo[]> {
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    return calendars.map((c) => ({
      id: c.id,
      title: c.title,
      source: c.source?.name ?? c.source?.type ?? '',
    }));
  } catch {
    return [];
  }
}

export async function getSelectedCalendarIds(): Promise<string[]> {
  const prefs = await loadPrefs();
  return prefs.selectedCalendarIds;
}

export async function setSelectedCalendarIds(ids: string[]): Promise<void> {
  await savePrefs({ selectedCalendarIds: ids });
}

export function isConnected(): boolean {
  return false;
}

export async function restoreSession(): Promise<boolean> {
  const prefs = await loadPrefs();
  if (prefs.disconnected) return false;
  const { status } = await Calendar.getCalendarPermissionsAsync();
  return status === 'granted';
}

export async function connect(): Promise<{ granted: boolean }> {
  const granted = await requestPermissions();
  if (granted) {
    await savePrefs({ disconnected: false });
  }
  return { granted };
}

export async function getEvents(start: Date, end: Date): Promise<CalendarEvent[]> {
  const granted = await requestPermissions();
  if (!granted) return [];

  const { selectedCalendarIds } = await loadPrefs();

  let calendarIds: string[];
  if (selectedCalendarIds.length > 0) {
    calendarIds = selectedCalendarIds;
  } else {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    calendarIds = calendars.map((c) => c.id);
  }

  const events = await Calendar.getEventsAsync(calendarIds, start, end);

  return events.map((e) => {
    const isAllDay = e.allDay ?? false;
    const parseDate = (raw: string | Date): Date => {
      const d = new Date(raw as string);
      if (!isAllDay) return d;
      // All-day events are stored as midnight UTC; use UTC date components so
      // the calendar day is correct in any local timezone.
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0);
    };
    return {
      id: e.id,
      title: e.title,
      startDate: parseDate(e.startDate),
      endDate: parseDate(e.endDate),
      calendarId: e.calendarId,
      isAllDay,
    };
  });
}

export async function getCalendarExportEnabled(): Promise<boolean> {
  const prefs = await loadPrefs();
  return prefs.calendarExportEnabled;
}

export async function setCalendarExportEnabled(enabled: boolean): Promise<void> {
  await savePrefs({ calendarExportEnabled: enabled });
}

export async function createMealEvent(input: MealEventInput): Promise<string | null> {
  const { calendarExportEnabled } = await loadPrefs();
  if (!calendarExportEnabled) return null;

  const granted = await requestPermissions();
  if (!granted) return null;

  const calendarId = (await getOrCreatePrepdCalendar()) ?? (await getWritableCalendarId());
  if (!calendarId) return null;

  const [y, m, d] = input.date.split('-').map(Number);
  const startDate = new Date(y, m - 1, d);
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
  await savePrefs({ disconnected: true, selectedCalendarIds: [] });
}

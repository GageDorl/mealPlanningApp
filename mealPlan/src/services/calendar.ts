import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import env from '@/constants/env';
import type { CalendarEvent, CalendarInfo, MealEventInput } from './calendar.types';

export type { CalendarEvent, CalendarInfo, MealEventInput };

const CONNECTED_KEY = '@prepd/calendar_connected';
const EXPORT_ENABLED_KEY = '@prepd/calendar_export_enabled';
const PREPD_CALENDAR_ID_KEY = '@prepd/prepd_calendar_id';

// Synchronous cache populated by restoreSession() / connect() / disconnect()
let _connected = false;

async function callFunction(name: string, body: object) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const detail = await (error as any).context?.json?.().catch(() => null);
    throw new Error(detail?.error ?? error.message);
  }
  return data;
}

export async function getAvailableCalendars(): Promise<CalendarInfo[]> {
  return [];
}

export async function getSelectedCalendarIds(): Promise<string[]> {
  return [];
}

export async function setSelectedCalendarIds(_ids: string[]): Promise<void> {}

export function isConnected(): boolean {
  return _connected;
}

export async function restoreSession(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(CONNECTED_KEY);
    if (stored !== 'true') return false;

    const result = await callFunction('recal-calendar', { action: 'isConnected' });
    if (result?.connected) {
      _connected = true;
      return true;
    }

    // Token gone server-side — clear local flag
    await AsyncStorage.removeItem(CONNECTED_KEY);
    _connected = false;
    return false;
  } catch {
    return false;
  }
}

const MOBILE_CALLBACK_URL = `${env.SUPABASE_URL}/functions/v1/google-oauth-mobile-callback`;

export async function connect(): Promise<{ granted: boolean }> {
  try {
    const { url } = await callFunction('google-oauth-link', { redirectUrl: MOBILE_CALLBACK_URL });
    if (!url) return { granted: false };

    // Edge Function handles the code exchange and redirects to prepd:// with ?success=true
    const result = await WebBrowser.openAuthSessionAsync(url, 'prepd://auth/calendar-callback');
    if (result.type !== 'success' || !result.url) return { granted: false };

    const params = new URL(result.url).searchParams;
    if (params.get('success') !== 'true') return { granted: false };

    await AsyncStorage.setItem(CONNECTED_KEY, 'true');
    _connected = true;
    return { granted: true };
  } catch (e) {
    console.error('[calendar] connect failed:', e);
    return { granted: false };
  }
}

export async function getCalendarExportEnabled(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(EXPORT_ENABLED_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

export async function setCalendarExportEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(EXPORT_ENABLED_KEY, String(enabled));
  } catch {}
}

export async function getEvents(start: Date, end: Date): Promise<CalendarEvent[]> {
  if (!_connected) return [];

  try {
    const raw = await callFunction('recal-calendar', {
      action: 'getEvents',
      start: start.toISOString(),
      end: end.toISOString(),
    });
    const events: any[] = Array.isArray(raw) ? raw : [];
    return events.map((e) => ({
      ...e,
      startDate: new Date(e.startDate),
      endDate: new Date(e.endDate),
    }));
  } catch {
    return [];
  }
}

async function getOrCreatePrepdCalendar(): Promise<string | null> {
  try {
    const cached = await AsyncStorage.getItem(PREPD_CALENDAR_ID_KEY);
    if (cached) return cached;

    const result = await callFunction('recal-calendar', { action: 'getOrCreatePrepdCalendar' });
    const id: string | null = result?.calendarId ?? null;
    if (id) await AsyncStorage.setItem(PREPD_CALENDAR_ID_KEY, id);
    return id;
  } catch (e) {
    console.error('[calendar] getOrCreatePrepdCalendar failed:', e);
    return null;
  }
}

export async function createMealEvent(input: MealEventInput): Promise<string | null> {
  const exportEnabled = await getCalendarExportEnabled();
  if (!exportEnabled || !_connected) return null;

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

  try {
    const calendarId = await getOrCreatePrepdCalendar();
    const result = await callFunction('recal-calendar', {
      action: 'createEvent',
      title: `Prepd: ${input.title}`,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      slotId: input.slotId,
      ...(calendarId ? { calendarId } : {}),
    });
    return result?.id ?? null;
  } catch (e) {
    console.error('[calendar] createMealEvent failed:', e);
    return null;
  }
}

export async function deleteMealEvent(eventId: string): Promise<void> {
  if (!_connected) return;

  try {
    const calendarId = await AsyncStorage.getItem(PREPD_CALENDAR_ID_KEY);
    await callFunction('recal-calendar', {
      action: 'deleteEvent',
      eventId,
      ...(calendarId ? { calendarId } : {}),
    });
  } catch {
    // Best effort
  }
}

export async function disconnect(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(CONNECTED_KEY),
      AsyncStorage.removeItem(PREPD_CALENDAR_ID_KEY),
    ]);
  } catch {}

  _connected = false;

  try {
    await callFunction('recal-calendar', { action: 'revokeConnection' });
  } catch {
    // Best effort — local state is already cleared
  }
}

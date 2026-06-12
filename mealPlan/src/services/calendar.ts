import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import env from '@/constants/env';
import type { CalendarEvent, CalendarInfo, CachedEventData, MealEventInput } from './calendar.types';

export type { CalendarEvent, CalendarInfo, CachedEventData, MealEventInput };

const CONNECTED_KEY = '@prepd/calendar_connected';
const EXPORT_ENABLED_KEY = '@prepd/calendar_export_enabled';
const SELECTED_CALENDARS_KEY = '@prepd/calendar_selected_ids';
const EVENTS_CACHE_PREFIX = 'prepd_gcal_';

let _connected = false;

// --- Internal helpers ---

async function callFunction(name: string, body: object) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const detail = await (error as any).context?.json?.().catch(() => null);
    throw new Error(detail?.error ?? error.message);
  }
  return data;
}

// --- Connection ---

export function isConnected(): boolean {
  return _connected;
}

export async function restoreSession(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(CONNECTED_KEY);

    if (stored === 'true') {
      _connected = true;
      return true;
    }

    // Web: after the first OAuth connection CONNECTED_KEY isn't cached yet — check the
    // API. Guard with a session check so we don't cold-start the edge function on
    // every page load for users who have never connected.
    if (Platform.OS === 'web') {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const result = await callFunction('google-calendar', { action: 'isConnected' });
        if (result?.connected) {
          await AsyncStorage.setItem(CONNECTED_KEY, 'true');
          _connected = true;
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

const MOBILE_CALLBACK_URL = `${env.SUPABASE_URL}/functions/v1/google-oauth-mobile-callback`;

export async function connect(): Promise<{ granted: boolean }> {
  try {
    if (Platform.OS === 'web') {
      const origin = (globalThis as any).window?.location?.origin ?? '';
      const redirectUrl = `${origin}/auth/calendar-callback`;
      const { url } = await callFunction('google-oauth-link', { redirectUrl });
      if (!url) return { granted: false };
      (globalThis as any).window.location.href = url;
      return { granted: false }; // unreachable — page redirects
    }

    const { url } = await callFunction('google-oauth-link', { redirectUrl: MOBILE_CALLBACK_URL });
    if (!url) return { granted: false };

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

export async function disconnect(): Promise<void> {
  _connected = false;

  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const keysToRemove = [
      CONNECTED_KEY,
      SELECTED_CALENDARS_KEY,
      ...allKeys.filter((k) => k.startsWith(EVENTS_CACHE_PREFIX)),
    ];
    await Promise.all(keysToRemove.map((k) => AsyncStorage.removeItem(k)));
  } catch {}

  try {
    await callFunction('google-calendar', { action: 'revokeConnection' });
  } catch {
    // Best effort — local state already cleared
  }
}

// --- Calendar selection ---

export async function getAvailableCalendars(): Promise<CalendarInfo[]> {
  try {
    const result = await callFunction('google-calendar', { action: 'listCalendars' });
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

export async function getSelectedCalendarIds(): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(SELECTED_CALENDARS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function setSelectedCalendarIds(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SELECTED_CALENDARS_KEY, JSON.stringify(ids));
  } catch {}
}

// --- Export toggle ---

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

// --- Event caching ---

export async function getCachedEvents(weekStart: string): Promise<CachedEventData | null> {
  try {
    const raw = await AsyncStorage.getItem(`${EVENTS_CACHE_PREFIX}${weekStart}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      events: parsed.events.map((e: any) => ({
        ...e,
        startDate: new Date(e.startDate),
        endDate: new Date(e.endDate),
      })),
      fetchedAt: parsed.fetchedAt,
    };
  } catch {
    return null;
  }
}

export async function setCachedEvents(weekStart: string, events: CalendarEvent[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${EVENTS_CACHE_PREFIX}${weekStart}`,
      JSON.stringify({ events, fetchedAt: Date.now() }),
    );
  } catch {}
}

// --- Fetching events ---

export async function getEvents(start: Date, end: Date): Promise<CalendarEvent[]> {
  if (!_connected) return [];

  const selectedIds = await getSelectedCalendarIds();

  try {
    const raw = await callFunction('google-calendar', {
      action: 'getEvents',
      calendarIds: selectedIds,
      start: start.toISOString(),
      end: end.toISOString(),
    });
    const items: any[] = Array.isArray(raw) ? raw : [];
    return items.map((e) => ({
      ...e,
      startDate: new Date(e.startDate),
      endDate: new Date(e.endDate),
    }));
  } catch {
    return [];
  }
}

// --- Meal event export ---

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
    const result = await callFunction('google-calendar', {
      action: 'createEvent',
      title: `Prepd: ${input.title}`,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      slotId: input.slotId,
    });
    return result?.id ?? null;
  } catch (e) {
    console.error('[calendar] createMealEvent failed:', e);
    return null;
  }
}

export async function deleteMealEvent(eventId: string, calendarId?: string): Promise<void> {
  if (!_connected) return;

  try {
    await callFunction('google-calendar', {
      action: 'deleteEvent',
      eventId,
      ...(calendarId ? { calendarId } : {}),
    });
  } catch {
    // Best effort
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase, getCachedUserId } from './supabase';
import { getCalendarPrefs, setCalendarPrefs } from './user-service';
import env from '@/constants/env';
import type { CalendarEvent, CalendarInfo, CachedEventData, MealEventInput } from './calendar.types';

interface PsDb {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

export type { CalendarEvent, CalendarInfo, CachedEventData, MealEventInput };

const CONNECTED_KEY = '@bento/calendar_connected';
const EXPORT_ENABLED_KEY = '@bento/calendar_export_enabled';
const SELECTED_CALENDARS_KEY = '@bento/calendar_selected_ids';
const BENTO_CALENDAR_KEY = '@bento/bento_calendar_id';
const EVENTS_CACHE_PREFIX = 'bento_gcal_';

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

// --- Bento export calendar ---

async function getPrepCalendarId(): Promise<string> {
  try {
    const cached = await AsyncStorage.getItem(BENTO_CALENDAR_KEY);
    if (cached) return cached;
    const result = await callFunction('google-calendar', { action: 'ensurePrepCalendar' });
    const id: string = result?.calendarId ?? 'primary';
    if (id !== 'primary') await AsyncStorage.setItem(BENTO_CALENDAR_KEY, id);
    return id;
  } catch {
    return 'primary';
  }
}

// --- Connection ---

export function isConnected(): boolean {
  return _connected;
}

export async function restoreSession(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(CONNECTED_KEY);

    if (stored === 'true') {
      // Verify there's an active session — stale flag from a previous sign-out
      // would otherwise mark a new (or no) session as connected.
      if (!getCachedUserId()) {
        await AsyncStorage.removeItem(CONNECTED_KEY);
        return false;
      }
      _connected = true;
      return true;
    }

    // No local cache — check calendar_tokens DB. Covers first login after connecting
    // on another device (DB is the cross-device source of truth).
    const userId = getCachedUserId();
    if (userId) {
      const { data } = await supabase
        .from('calendar_tokens')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) {
        await AsyncStorage.setItem(CONNECTED_KEY, 'true');
        _connected = true;
        return true;
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
      if ((globalThis as any).window?.location) (globalThis as any).window.location.href = url;
      return { granted: false }; // unreachable — page redirects
    }

    const { url } = await callFunction('google-oauth-link', { redirectUrl: MOBILE_CALLBACK_URL });
    if (!url) return { granted: false };

    const result = await WebBrowser.openAuthSessionAsync(url, 'bento://auth/calendar-callback');
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
      BENTO_CALENDAR_KEY,
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
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
      // Corrupted cache (stored a string instead of array) — evict and re-fetch from DB
      await AsyncStorage.removeItem(SELECTED_CALENDARS_KEY);
    }

    // Cache miss — fall back to DB (covers first login on a new device)
    const userId = getCachedUserId();
    if (userId) {
      const prefs = await getCalendarPrefs(userId);
      if (prefs.selected_calendar_ids.length > 0) {
        await AsyncStorage.setItem(SELECTED_CALENDARS_KEY, JSON.stringify(prefs.selected_calendar_ids));
        return prefs.selected_calendar_ids;
      }
    }
    return [];
  } catch {
    return [];
  }
}

export async function setSelectedCalendarIds(db: PsDb, ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SELECTED_CALENDARS_KEY, JSON.stringify(ids));
  } catch {}
  const userId = getCachedUserId();
  if (userId) await setCalendarPrefs(db, userId, { selected_calendar_ids: ids });
}

// --- Export toggle ---

export async function getCalendarExportEnabled(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(EXPORT_ENABLED_KEY);
    if (stored !== null) return stored === 'true';

    // Cache miss — fall back to DB
    const userId = getCachedUserId();
    if (userId) {
      const prefs = await getCalendarPrefs(userId);
      await AsyncStorage.setItem(EXPORT_ENABLED_KEY, String(prefs.calendar_export_enabled));
      return prefs.calendar_export_enabled;
    }
    return false;
  } catch {
    return false;
  }
}

export async function setCalendarExportEnabled(db: PsDb, enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(EXPORT_ENABLED_KEY, String(enabled));
  } catch {}
  const userId = getCachedUserId();
  if (userId) await setCalendarPrefs(db, userId, { calendar_export_enabled: enabled });
}

// --- Event caching ---

export async function getCachedEvents(weekStart: string): Promise<CachedEventData | null> {
  try {
    const { getCached } = await import('./local-cache-service');
    const raw = await getCached<{ events: any[]; fetchedAt: number }>('cached_calendar_events', weekStart);
    if (!raw) return null;
    return {
      events: raw.events.map((e) => ({
        ...e,
        startDate: new Date(e.startDate),
        endDate: new Date(e.endDate),
      })),
      fetchedAt: raw.fetchedAt,
    };
  } catch {
    return null;
  }
}

export async function setCachedEvents(weekStart: string, events: CalendarEvent[]): Promise<void> {
  try {
    const { setCached } = await import('./local-cache-service');
    await setCached('cached_calendar_events', weekStart, { events, fetchedAt: Date.now() });
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
    const calendarId = await getPrepCalendarId();
    const result = await callFunction('google-calendar', {
      action: 'createEvent',
      calendarId,
      title: `Bento: ${input.title}`,
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
    const targetCalendarId = calendarId ?? await getPrepCalendarId();
    await callFunction('google-calendar', {
      action: 'deleteEvent',
      eventId,
      calendarId: targetCalendarId,
    });
  } catch {
    // Best effort
  }
}

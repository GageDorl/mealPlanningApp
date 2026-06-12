import { supabase } from './supabase';
import type { CalendarEvent, CalendarInfo, MealEventInput } from './calendar.types';

export type { CalendarEvent, CalendarInfo, MealEventInput };

export async function getAvailableCalendars(): Promise<CalendarInfo[]> { return []; }
export async function getSelectedCalendarIds(): Promise<string[]> { return []; }
export async function setSelectedCalendarIds(_ids: string[]): Promise<void> {}

const CONNECTED_KEY = 'prepd_calendar_connected';
const EXPORT_ENABLED_KEY = 'prepd_calendar_export_enabled';
const PREPD_CALENDAR_ID_KEY = 'prepd_calendar_id';

export function getCalendarExportEnabled(): Promise<boolean> {
  try {
    const stored = localStorage.getItem(EXPORT_ENABLED_KEY);
    return Promise.resolve(stored === 'true');
  } catch {
    return Promise.resolve(false);
  }
}

export function setCalendarExportEnabled(enabled: boolean): Promise<void> {
  try { localStorage.setItem(EXPORT_ENABLED_KEY, String(enabled)); } catch {}
  return Promise.resolve();
}

async function callFunction(name: string, body: object) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const detail = await (error as any).context?.json?.().catch(() => null);
    throw new Error(detail?.error ?? error.message);
  }
  return data;
}

export function isConnected(): boolean {
  try { return localStorage.getItem(CONNECTED_KEY) === 'true'; } catch { return false; }
}

export async function restoreSession(): Promise<boolean> {
  if (isConnected()) return true;

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return false;

  try {
    const result = await callFunction('recal-calendar', { action: 'isConnected' });
    if (result?.connected) {
      try { localStorage.setItem(CONNECTED_KEY, 'true'); } catch {}
      return true;
    }
  } catch {
    // Network or Edge Function error — treat as not connected
  }

  return false;
}

export async function connect(): Promise<{ granted: boolean }> {
  const redirectUrl = `${window.location.origin}/auth/calendar-callback`;
  const { url } = await callFunction('google-oauth-link', { redirectUrl });
  if (!url) return { granted: false };
  window.location.href = url;
  return { granted: false }; // unreachable — page redirects
}

async function getOrCreatePrepdCalendar(): Promise<string | null> {
  try {
    const cached = localStorage.getItem(PREPD_CALENDAR_ID_KEY);
    if (cached) return cached;
    const result = await callFunction('recal-calendar', { action: 'getOrCreatePrepdCalendar' });
    const id: string | null = result?.calendarId ?? null;
    if (id) localStorage.setItem(PREPD_CALENDAR_ID_KEY, id);
    return id;
  } catch (e) {
    console.error('[calendar] getOrCreatePrepdCalendar failed:', e);
    return null;
  }
}

export async function getEvents(start: Date, end: Date): Promise<CalendarEvent[]> {
  if (!isConnected()) return [];

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

export async function createMealEvent(input: MealEventInput): Promise<string | null> {
  const exportEnabled = await getCalendarExportEnabled();
  if (!exportEnabled || !isConnected()) return null;

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
  if (!isConnected()) return;

  try {
    const calendarId = localStorage.getItem(PREPD_CALENDAR_ID_KEY);
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
    localStorage.removeItem(CONNECTED_KEY);
    localStorage.removeItem(PREPD_CALENDAR_ID_KEY);
  } catch {}

  try {
    await callFunction('recal-calendar', { action: 'revokeConnection' });
  } catch {
    // Best effort — local state is already cleared
  }
}

import { supabase } from './supabase';
import type { CalendarEvent, CalendarInfo, MealEventInput } from './calendar.types';

export type { CalendarEvent, CalendarInfo, MealEventInput };

export async function getAvailableCalendars(): Promise<CalendarInfo[]> { return []; }
export async function getSelectedCalendarIds(): Promise<string[]> { return []; }
export async function setSelectedCalendarIds(_ids: string[]): Promise<void> {}

const CONNECTED_KEY = 'prepd_calendar_connected';

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
  // Fast path: localStorage cache avoids a network call on every mount
  if (isConnected()) return true;

  // Auth required — can't check Recal without a session
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
  const { url } = await callFunction('recal-oauth-link', { provider: 'google', redirectUrl });
  if (!url) return { granted: false };
  window.location.href = url;
  return { granted: false }; // unreachable — page redirects
}

function parseEventDate(raw: any): Date {
  if (raw?.dateTime) return new Date(raw.dateTime);
  if (raw?.date) {
    const [y, m, d] = (raw.date as string).split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(raw);
}

export async function getEvents(start: Date, end: Date): Promise<CalendarEvent[]> {
  if (!isConnected()) {
    console.log('[calendar] getEvents: not connected (localStorage check failed)');
    return [];
  }

  const raw = await callFunction('recal-calendar', {
    action: 'getEvents',
    start: start.toISOString(),
    end: end.toISOString(),
  });

  const events = Array.isArray(raw) ? raw : (raw?.events ?? raw?.items ?? []);

  return events.map((e: any) => {
    const startRaw = e.start ?? e.original?.start;
    const endRaw = e.end ?? e.original?.end;
    const isAllDay = e.isAllDay ?? (startRaw?.date != null && startRaw?.dateTime == null);
    return {
      id: e.id,
      title: e.subject ?? e.title ?? e.summary ?? '(No title)',
      startDate: parseEventDate(startRaw),
      endDate: parseEventDate(endRaw),
      calendarId: e.calendarId ?? 'primary',
      isAllDay,
    };
  });
}

export async function createMealEvent(input: MealEventInput): Promise<string | null> {
  if (!isConnected()) return null;

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
    const result = await callFunction('recal-calendar', {
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

export async function deleteMealEvent(eventId: string): Promise<void> {
  if (!isConnected()) return;

  try {
    await callFunction('recal-calendar', { action: 'deleteEvent', eventId });
  } catch {
    // Best effort
  }
}

export async function disconnect(): Promise<void> {
  try { localStorage.removeItem(CONNECTED_KEY); } catch {}

  try {
    await callFunction('recal-calendar', { action: 'revokeConnection', provider: 'google' });
  } catch {
    // Best effort — local state is already cleared
  }
}

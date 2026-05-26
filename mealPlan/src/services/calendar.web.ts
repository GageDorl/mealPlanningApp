import { supabase } from './supabase';
import type { CalendarEvent, MealEventInput } from './calendar.types';

export type { CalendarEvent, MealEventInput };

const CONNECTED_KEY = 'prepd_calendar_connected';

async function callFunction(name: string, body: object) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(error.message);
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

export async function getEvents(start: Date, end: Date): Promise<CalendarEvent[]> {
  if (!isConnected()) return [];

  try {
    const events = await callFunction('recal-calendar', {
      action: 'getEvents',
      start: start.toISOString(),
      end: end.toISOString(),
    });

    return (Array.isArray(events) ? events : []).map((e: any) => ({
      id: e.id,
      title: e.subject ?? e.title ?? e.summary ?? '(No title)',
      startDate: new Date(e.start),
      endDate: new Date(e.end),
      calendarId: e.calendarId ?? 'primary',
      isAllDay: e.isAllDay ?? false,
    }));
  } catch {
    return [];
  }
}

export async function createMealEvent(input: MealEventInput): Promise<string | null> {
  if (!isConnected()) return null;

  const startDate = new Date(input.date);
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

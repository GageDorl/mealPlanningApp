import env from '@/constants/env';
import type { CalendarEvent, MealEventInput } from './calendar.types';

export type { CalendarEvent, MealEventInput };

const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

let accessToken: string | null = null;

export async function connect(): Promise<{ granted: boolean }> {
  try {
    const redirectUri = window.location.origin;
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID_WEB);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('prompt', 'consent');

    // Open OAuth popup
    const popup = window.open(authUrl.toString(), 'google-auth', 'width=500,height=600');
    if (!popup) return { granted: false };

    const token = await new Promise<string | null>((resolve) => {
      const interval = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(interval);
            resolve(null);
            return;
          }
          const hash = popup.location.hash;
          if (hash) {
            const params = new URLSearchParams(hash.substring(1));
            const token = params.get('access_token');
            if (token) {
              clearInterval(interval);
              popup.close();
              resolve(token);
            }
          }
        } catch {
          // Cross-origin — popup hasn't redirected yet
        }
      }, 500);
    });

    if (token) {
      accessToken = token;
      return { granted: true };
    }
    return { granted: false };
  } catch {
    return { granted: false };
  }
}

async function fetchCalendarApi(path: string, options: RequestInit = {}): Promise<any> {
  if (!accessToken) throw new Error('Not connected to Google Calendar');

  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Calendar API error: ${response.status} ${error}`);
  }

  return response.json();
}

export async function getEvents(start: Date, end: Date): Promise<CalendarEvent[]> {
  if (!accessToken) return [];

  try {
    const data = await fetchCalendarApi(
      `/calendars/primary/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime`
    );

    return (data.items ?? []).map((event: any) => ({
      id: event.id,
      title: event.summary ?? '(No title)',
      startDate: new Date(event.start?.dateTime ?? event.start?.date),
      endDate: new Date(event.end?.dateTime ?? event.end?.date),
      calendarId: 'primary',
      isAllDay: !event.start?.dateTime,
    }));
  } catch {
    return [];
  }
}

export async function createMealEvent(input: MealEventInput): Promise<string | null> {
  if (!accessToken) return null;

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
    const data = await fetchCalendarApi('/calendars/primary/events', {
      method: 'POST',
      body: JSON.stringify({
        summary: `Prepd: ${input.title}`,
        description: `Meal slot: ${input.slotId}`,
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
      }),
    });

    return data.id ?? null;
  } catch {
    return null;
  }
}

export async function deleteMealEvent(eventId: string): Promise<void> {
  if (!accessToken) return;

  try {
    await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    // Event may have already been deleted
  }
}

export async function disconnect(): Promise<void> {
  if (accessToken) {
    try {
      await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${accessToken}`, {
        method: 'POST',
      });
    } catch {
      // Best effort
    }
    accessToken = null;
  }
}

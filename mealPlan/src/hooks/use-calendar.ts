import { useCallback, useEffect, useRef, useState } from 'react';
import type { CalendarEvent, CalendarInfo } from '@/services/calendar.types';
import * as calendarService from '@/services/calendar';

function toWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7)); // rewind to Monday
  return d.toISOString().slice(0, 10);
}

export function useCalendar() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [googleEventsRefreshing, setGoogleEventsRefreshing] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [availableCalendars, setAvailableCalendars] = useState<CalendarInfo[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [calendarExportEnabled, setCalendarExportEnabledState] = useState(false);

  // Incremented on each loadEvents call so responses from previous weeks are discarded
  const refreshSeqRef = useRef(0);

  const loadCalendarMeta = useCallback(async () => {
    const [ids, cals] = await Promise.all([
      calendarService.getSelectedCalendarIds(),
      calendarService.getAvailableCalendars(),
    ]);
    setSelectedCalendarIds(ids);
    setAvailableCalendars(cals);
  }, []);

  useEffect(() => {
    calendarService.getCalendarExportEnabled().then(setCalendarExportEnabledState);
    calendarService.restoreSession().then((restored) => {
      if (restored) {
        setConnected(true);
        loadCalendarMeta(); // fire and forget — don't block initial render
      }
    });
  }, [loadCalendarMeta]);

  const connect = useCallback(async () => {
    setConnectError(null);
    try {
      const result = await calendarService.connect();
      if (result.granted) {
        setConnected(true);
        loadCalendarMeta();
      }
      return result.granted;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setConnectError(
        msg.includes('authenticated')
          ? 'Sign in to your account first, then connect your calendar.'
          : msg,
      );
      return false;
    }
  }, [loadCalendarMeta]);

  const selectCalendars = useCallback(async (ids: string[]) => {
    await calendarService.setSelectedCalendarIds(ids);
    setSelectedCalendarIds(ids);
  }, []);

  const loadEvents = useCallback(
    async (start: Date, end: Date) => {
      if (!connected) return;

      const weekStart = toWeekStart(start);
      const seq = ++refreshSeqRef.current;

      // Phase 1: serve cached events immediately — no loading state needed
      const cached = await calendarService.getCachedEvents(weekStart);
      if (seq !== refreshSeqRef.current) return;
      if (cached) setEvents(cached.events);

      // Phase 2: background refresh
      setGoogleEventsRefreshing(true);
      setLoadError(null);

      try {
        const fresh = await calendarService.getEvents(start, end);
        if (seq !== refreshSeqRef.current) return; // week changed — discard

        setEvents(fresh);
        calendarService.setCachedEvents(weekStart, fresh); // fire and forget
      } catch {
        if (seq !== refreshSeqRef.current) return;
        setLoadError('Could not refresh calendar events.');
      } finally {
        if (seq === refreshSeqRef.current) {
          setGoogleEventsRefreshing(false);
        }
      }
    },
    [connected],
  );

  const createMealEvent = useCallback(
    async (input: { title: string; date: string; timeOfDay: string | null; slotId: string }) => {
      if (!connected || !calendarExportEnabled) return null;
      return calendarService.createMealEvent(input);
    },
    [connected, calendarExportEnabled],
  );

  const deleteMealEvent = useCallback(
    async (eventId: string, calendarId?: string) => {
      await calendarService.deleteMealEvent(eventId, calendarId);
    },
    [],
  );

  const setExportEnabled = useCallback(async (enabled: boolean) => {
    await calendarService.setCalendarExportEnabled(enabled);
    setCalendarExportEnabledState(enabled);
  }, []);

  const disconnect = useCallback(async () => {
    await calendarService.disconnect();
    setConnected(false);
    setEvents([]);
    setAvailableCalendars([]);
    setSelectedCalendarIds([]);
  }, []);

  const connectedCalendarTitle = (() => {
    if (!connected) return null;
    if (selectedCalendarIds.length === 0) return 'All calendars';
    if (selectedCalendarIds.length > 1) return `${selectedCalendarIds.length} calendars`;
    const cal = availableCalendars.find((c) => c.id === selectedCalendarIds[0]);
    return cal?.title ?? 'Calendar';
  })();

  return {
    connected,
    events,
    googleEventsRefreshing,
    connectError,
    loadError,
    availableCalendars,
    selectedCalendarIds,
    connectedCalendarTitle,
    calendarExportEnabled,
    connect,
    selectCalendars,
    loadEvents,
    createMealEvent,
    deleteMealEvent,
    setExportEnabled,
    disconnect,
  };
}

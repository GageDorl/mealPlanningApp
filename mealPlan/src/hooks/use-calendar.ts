import { useCallback, useEffect, useState } from 'react';
import type { CalendarEvent, CalendarInfo } from '@/services/calendar.types';
import * as calendarService from '@/services/calendar';

export function useCalendar() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [availableCalendars, setAvailableCalendars] = useState<CalendarInfo[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [calendarExportEnabled, setCalendarExportEnabledState] = useState(true);

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
    calendarService.restoreSession().then(async (restored) => {
      if (restored) {
        setConnected(true);
        await loadCalendarMeta();
      }
    });
  }, []);

  const connect = useCallback(async () => {
    setConnectError(null);
    try {
      const result = await calendarService.connect();
      if (result.granted) {
        setConnected(true);
        await loadCalendarMeta();
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

  const loadEvents = useCallback(async (start: Date, end: Date) => {
    if (!connected) return;
    setLoading(true);
    setLoadError(null);
    try {
      const calendarEvents = await calendarService.getEvents(start, end);
      setEvents(calendarEvents);
    } catch (e) {
      setEvents([]);
      setLoadError('Could not load calendar events. Your connection may have expired.');
      setConnected(false);
      await calendarService.disconnect();
    } finally {
      setLoading(false);
    }
  }, [connected]);

  const createMealEvent = useCallback(
    async (input: { title: string; date: string; timeOfDay: string | null; slotId: string }) => {
      if (!connected) return null;
      return calendarService.createMealEvent(input);
    },
    [connected],
  );

  const deleteMealEvent = useCallback(
    async (eventId: string) => {
      await calendarService.deleteMealEvent(eventId);
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
    if (selectedCalendarIds.length === 0) return 'Calendar';
    if (selectedCalendarIds.length > 1) return `${selectedCalendarIds.length} calendars`;
    const cal = availableCalendars.find((c) => c.id === selectedCalendarIds[0]);
    return cal?.title ?? 'Calendar';
  })();

  return {
    connected,
    events,
    loading,
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

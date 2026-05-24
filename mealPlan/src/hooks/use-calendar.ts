import { useCallback, useEffect, useState } from 'react';
import type { CalendarEvent } from '@/services/calendar.types';
import * as calendarService from '@/services/calendar';

export function useCalendar() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    calendarService.restoreSession().then((restored) => {
      if (restored) setConnected(true);
    });
  }, []);

  const connect = useCallback(async () => {
    setConnectError(null);
    try {
      const result = await calendarService.connect();
      setConnected(result.granted);
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

  const disconnect = useCallback(async () => {
    await calendarService.disconnect();
    setConnected(false);
    setEvents([]);
  }, []);

  return {
    connected,
    events,
    loading,
    connectError,
    loadError,
    connect,
    loadEvents,
    createMealEvent,
    deleteMealEvent,
    disconnect,
  };
}

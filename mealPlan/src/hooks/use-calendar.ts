import { useCallback, useEffect, useState } from 'react';
import type { CalendarEvent } from '@/services/calendar.types';
import * as calendarService from '@/services/calendar';

export function useCalendar() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const connect = useCallback(async () => {
    const result = await calendarService.connect();
    setConnected(result.granted);
    return result.granted;
  }, []);

  const loadEvents = useCallback(async (start: Date, end: Date) => {
    if (!connected) return;
    setLoading(true);
    try {
      const calendarEvents = await calendarService.getEvents(start, end);
      setEvents(calendarEvents);
    } catch {
      setEvents([]);
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
    connect,
    loadEvents,
    createMealEvent,
    deleteMealEvent,
    disconnect,
  };
}

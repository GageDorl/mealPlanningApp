import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import * as foodLogService from '@/services/food-log-service';
import type { FoodLogWithItems } from '@/services/food-log-service';
import type { FoodLogItemInput } from '@/services/food-log-service';

function dateToString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return dateToString(d);
}

export function useFoodLog(weekStart: Date) {
  const [weekLogs, setWeekLogs] = useState<FoodLogWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  const weekStartStr = dateToString(weekStart);
  const weekEndStr = addDays(weekStart, 7);

  const loadWeek = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      setUserId(uid);
      if (!uid) { setWeekLogs([]); return; }
      const logs = await foodLogService.getFoodLogsForWeek(uid, weekStartStr, weekEndStr);
      setWeekLogs(logs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load food logs');
    } finally {
      setLoading(false);
    }
  }, [weekStartStr, weekEndStr]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  const createFoodLog = useCallback(
    async (date: string, label: string | null, timeOfDay: string | null, items: FoodLogItemInput[]) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) throw new Error('Not authenticated');
      const newLog = await foodLogService.createFoodLog(userId, date, label, timeOfDay, items);
      setWeekLogs((prev) => [...prev, newLog]);
      return newLog;
    },
    [],
  );

  const deleteFoodLog = useCallback(async (id: string) => {
    await foodLogService.deleteFoodLog(id);
    setWeekLogs((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const deleteFoodLogItem = useCallback(async (logId: string, itemId: string) => {
    await foodLogService.deleteFoodLogItem(itemId);
    setWeekLogs((prev) => prev.map((l) => {
      if (l.id !== logId) return l;
      const remaining = l.items.filter((i) => i.id !== itemId);
      return { ...l, items: remaining };
    }).filter((l) => l.items.length > 0));
  }, []);

  const updateFoodLogItem = useCallback(async (logId: string, itemId: string, patch: Parameters<typeof foodLogService.updateFoodLogItem>[1]) => {
    await foodLogService.updateFoodLogItem(itemId, patch);
    setWeekLogs((prev) => prev.map((l) => {
      if (l.id !== logId) return l;
      return { ...l, items: l.items.map((i) => i.id === itemId ? { ...i, ...patch } : i) };
    }));
  }, []);

  const addItemsToFoodLog = useCallback(async (logId: string, items: FoodLogItemInput[]): Promise<import('@/models/food-log').FoodLogItem[]> => {
    const newItems = await foodLogService.addItemsToFoodLog(logId, items);
    setWeekLogs((prev) => prev.map((l) => {
      if (l.id !== logId) return l;
      return { ...l, items: [...l.items, ...newItems] };
    }));
    return newItems;
  }, []);

  const updateFoodLog = useCallback(async (id: string, patch: Parameters<typeof foodLogService.updateFoodLog>[1]) => {
    await foodLogService.updateFoodLog(id, patch);
    setWeekLogs((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l));
  }, []);

  const refresh = loadWeek;

  return { weekLogs, loading, error, userId, createFoodLog, deleteFoodLog, deleteFoodLogItem, updateFoodLogItem, updateFoodLog, addItemsToFoodLog, refresh };
}

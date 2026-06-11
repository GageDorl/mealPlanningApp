import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { getDailyProgress, type DailyMacroProgress } from '@/services/macro-service';
import { deleteSlot } from '@/services/meal-plan-service';

function dateToString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useMacros(initialDate?: Date) {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate ?? new Date());
  const [dailyProgress, setDailyProgress] = useState<DailyMacroProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProgress = useCallback(async (date: Date) => {
    setLoading(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) {
        setDailyProgress(null);
        return;
      }
      const progress = await getDailyProgress(userId, dateToString(date));
      setDailyProgress(progress);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load macro progress');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProgress(selectedDate);
  }, [selectedDate, loadProgress]);

  const goToPrevDay = useCallback(() => {
    setSelectedDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() - 1);
      return next;
    });
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const today = new Date();
      return next > today ? d : next;
    });
  }, []);

  const goToDate = useCallback((date: Date) => {
    const today = new Date();
    setSelectedDate(date > today ? today : date);
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const refresh = useCallback(() => loadProgress(selectedDate), [selectedDate, loadProgress]);

  const deleteMealSlot = useCallback(async (slotId: string) => {
    await deleteSlot(slotId);
    await loadProgress(selectedDate);
  }, [selectedDate, loadProgress]);

  return {
    selectedDate,
    dailyProgress,
    loading,
    error,
    goToPrevDay,
    goToNextDay,
    goToToday,
    goToDate,
    refresh,
    deleteMealSlot,
  };
}

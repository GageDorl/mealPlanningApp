import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import {
  generateList,
  getList,
  toggleItemChecked,
  addPantryStaple,
  removePantryStaple,
  type GroceryState,
} from '@/services/grocery-service';

function getCurrentWeekStart(): Date {
  const today = new Date();
  const d = new Date(today);
  d.setDate(d.getDate() - d.getDay()); // back to Sunday, matching calendar week_start
  d.setHours(0, 0, 0, 0);
  return d;
}

const EMPTY_STATE: GroceryState = {
  list: null,
  items: [],
  displayGroups: [],
  checkedCount: 0,
  totalCount: 0,
};

export function useGrocery() {
  const [state, setState] = useState<GroceryState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekStart = getCurrentWeekStart();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) {
        setState(EMPTY_STATE);
        return;
      }
      const result = await getList(userId, weekStart);
      setState(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load grocery list');
    } finally {
      setLoading(false);
    }
  // weekStart is derived from the current time — stable across the hook's lifetime for a given week
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) return;
      const result = await generateList(userId, weekStart);
      setState(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate grocery list');
    } finally {
      setGenerating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleItem = useCallback(async (itemId: string, checked: boolean) => {
    // Optimistic update
    setState((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === itemId ? { ...i, is_checked: checked } : i)),
      displayGroups: prev.displayGroups.map((g) => ({
        ...g,
        items: g.items.map((i) => (i.id === itemId ? { ...i, is_checked: checked } : i)),
      })),
      checkedCount: prev.items.filter((i) =>
        i.id === itemId ? checked : i.is_checked
      ).length,
    }));
    try {
      await toggleItemChecked(itemId, checked);
    } catch {
      // Revert on failure
      load();
    }
  }, [load]);

  const addStaple = useCallback(async (name: string) => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) return;
    await addPantryStaple(userId, name);
  }, []);

  const removeStaple = useCallback(async (stapleId: string) => {
    await removePantryStaple(stapleId);
  }, []);

  return {
    state,
    loading,
    generating,
    error,
    generate,
    toggleItem,
    addStaple,
    removeStaple,
    refresh: load,
  };
}

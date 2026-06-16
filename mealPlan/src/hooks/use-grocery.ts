import { useCallback, useMemo, useState } from 'react';
import { usePowerSync, useQuery } from '@powersync/react-native';
import { getCachedUserId } from '@/services/supabase';
import {
  generateList,
  toggleItemChecked,
  addPantryStaple,
  removePantryStaple,
  groupItemsByCategory,
  type GroceryState,
  type GroceryListRow,
  type GroceryItemRow,
} from '@/services/grocery-service';
import { isOnline, OFFLINE_MESSAGE } from '@/utils/offline-gate';

const EMPTY_STATE: GroceryState = {
  list: null,
  items: [],
  displayGroups: [],
  checkedCount: 0,
  totalCount: 0,
};

function getWeekStartStr(): string {
  const today = new Date();
  const d = new Date(today);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const WEEK_START_STR = getWeekStartStr();

const GROCERY_QUERY = `
  SELECT
    gl.id AS list_id, gl.user_id AS list_user_id, gl.meal_plan_id, gl.generated_at,
    gi.id AS item_id, gi.ingredient_id, gi.name, gi.quantity, gi.unit,
    gi.category, gi.is_checked, gi.deficit_note
  FROM grocery_lists gl
  JOIN meal_plans mp ON mp.id = gl.meal_plan_id
  LEFT JOIN grocery_items gi ON gi.grocery_list_id = gl.id
  WHERE mp.user_id = ? AND mp.week_start = ?
  ORDER BY gi.category, gi.name
`;

interface GroceryJoinRow {
  list_id: string;
  list_user_id: string;
  meal_plan_id: string;
  generated_at: string;
  item_id: string | null;
  ingredient_id: string | null;
  name: string | null;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  is_checked: number | null;
  deficit_note: string | null;
}

export function useGrocery() {
  const db = usePowerSync();
  const userId = getCachedUserId() ?? '';
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const { data: rows } = useQuery<GroceryJoinRow>(GROCERY_QUERY, [userId, WEEK_START_STR]);

  const state = useMemo<GroceryState>(() => {
    if (rows.length === 0 || !rows[0].list_id) return EMPTY_STATE;
    const firstRow = rows[0];
    const list: GroceryListRow = {
      id: firstRow.list_id,
      user_id: firstRow.list_user_id,
      meal_plan_id: firstRow.meal_plan_id,
      generated_at: firstRow.generated_at,
    };
    const items: GroceryItemRow[] = rows
      .filter((r) => r.item_id !== null)
      .map((r) => ({
        id: r.item_id!,
        grocery_list_id: firstRow.list_id,
        ingredient_id: r.ingredient_id,
        name: r.name ?? '',
        quantity: r.quantity,
        unit: r.unit,
        category: r.category,
        is_checked: Boolean(r.is_checked),
        deficit_note: r.deficit_note,
      }));
    return {
      list,
      items,
      displayGroups: groupItemsByCategory(items),
      checkedCount: items.filter((i) => i.is_checked).length,
      totalCount: items.length,
    };
  }, [rows]);

  const generate = useCallback(async () => {
    if (!userId) return;
    if (!isOnline()) {
      setGenerateError(OFFLINE_MESSAGE);
      return;
    }
    setGenerateError(null);
    setGenerating(true);
    try {
      await generateList(db, userId, new Date());
    } finally {
      setGenerating(false);
    }
  }, [db, userId]);

  const toggleItem = useCallback(async (itemId: string, checked: boolean) => {
    await toggleItemChecked(db, itemId, checked);
  }, [db]);

  const addStaple = useCallback(async (name: string) => {
    if (!userId) return;
    await addPantryStaple(db, userId, name);
  }, [db, userId]);

  const removeStaple = useCallback(async (stapleId: string) => {
    await removePantryStaple(db, stapleId);
  }, [db]);

  return {
    state,
    loading: false,
    generating,
    error: generateError,
    generate,
    toggleItem,
    addStaple,
    removeStaple,
    refresh: useCallback(() => {}, []),
  };
}

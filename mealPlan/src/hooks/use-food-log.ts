import { useCallback, useMemo } from 'react';
import { usePowerSync, useQuery } from '@powersync/react-native';
import { getCachedUserId } from '@/services/supabase';
import * as foodLogService from '@/services/food-log-service';
import type { FoodLogWithItems } from '@/services/food-log-service';
import type { FoodLogItemInput } from '@/services/food-log-service';
import type { FoodLogItem } from '@/models/food-log';

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

interface FlatLogRow {
  log_id: string;
  log_user_id: string;
  log_date: string;
  log_label: string | null;
  log_time_of_day: string | null;
  log_icon: string | null;
  log_created_at: string;
  log_updated_at: string;
  item_id: string | null;
  food_name: string | null;
  brand_name: string | null;
  serving_size_amount: number | null;
  serving_size_unit: string | null;
  servings_eaten: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  saturated_fat: number | null;
  trans_fat: number | null;
  cholesterol: number | null;
  sodium: number | null;
  dietary_fiber: number | null;
  total_sugar: number | null;
  added_sugar: number | null;
  source: string | null;
  source_id: string | null;
  display_order: number | null;
  item_created_at: string | null;
  item_updated_at: string | null;
}

const FOOD_LOG_QUERY = `
  SELECT
    fl.id AS log_id, fl.user_id AS log_user_id, fl.date AS log_date,
    fl.label AS log_label, fl.time_of_day AS log_time_of_day,
    fl.icon AS log_icon,
    fl.created_at AS log_created_at, fl.updated_at AS log_updated_at,
    fli.id AS item_id, fli.food_name, fli.brand_name,
    fli.serving_size_amount, fli.serving_size_unit, fli.servings_eaten,
    fli.calories, fli.protein, fli.carbs, fli.fat,
    fli.saturated_fat, fli.trans_fat, fli.cholesterol, fli.sodium,
    fli.dietary_fiber, fli.total_sugar, fli.added_sugar,
    fli.source, fli.source_id, fli.display_order,
    fli.created_at AS item_created_at, fli.updated_at AS item_updated_at
  FROM food_logs fl
  LEFT JOIN food_log_items fli ON fli.food_log_id = fl.id
  WHERE fl.user_id = ? AND fl.date >= ? AND fl.date < ?
  ORDER BY fl.time_of_day NULLS LAST, fli.display_order
`;

export function useFoodLog(weekStart: Date) {
  const db = usePowerSync();
  const userId = getCachedUserId() ?? '';
  const weekStartStr = dateToString(weekStart);
  const weekEndStr = addDays(weekStart, 7);

  const { data: rows } = useQuery<FlatLogRow>(FOOD_LOG_QUERY, [userId, weekStartStr, weekEndStr]);

  const weekLogs = useMemo<FoodLogWithItems[]>(() => {
    const map = new Map<string, FoodLogWithItems>();
    for (const row of rows) {
      if (!map.has(row.log_id)) {
        map.set(row.log_id, {
          id: row.log_id,
          user_id: row.log_user_id,
          date: row.log_date,
          label: row.log_label ?? undefined,
          time_of_day: row.log_time_of_day ?? undefined,
          icon: row.log_icon ?? undefined,
          created_at: row.log_created_at,
          updated_at: row.log_updated_at,
          items: [],
        });
      }
      if (row.item_id && row.food_name) {
        map.get(row.log_id)!.items.push({
          id: row.item_id,
          food_log_id: row.log_id,
          food_name: row.food_name,
          brand_name: row.brand_name ?? undefined,
          serving_size_amount: row.serving_size_amount ?? undefined,
          serving_size_unit: row.serving_size_unit ?? undefined,
          servings_eaten: row.servings_eaten ?? 1,
          calories: row.calories ?? undefined,
          protein: row.protein ?? undefined,
          carbs: row.carbs ?? undefined,
          fat: row.fat ?? undefined,
          saturated_fat: row.saturated_fat ?? undefined,
          trans_fat: row.trans_fat ?? undefined,
          cholesterol: row.cholesterol ?? undefined,
          sodium: row.sodium ?? undefined,
          dietary_fiber: row.dietary_fiber ?? undefined,
          total_sugar: row.total_sugar ?? undefined,
          added_sugar: row.added_sugar ?? undefined,
          source: (row.source ?? 'manual') as FoodLogItem['source'],
          source_id: row.source_id ?? undefined,
          display_order: row.display_order ?? 0,
          created_at: row.item_created_at ?? '',
          updated_at: row.item_updated_at ?? '',
        });
      }
    }
    return Array.from(map.values());
  }, [rows]);

  const createFoodLog = useCallback(
    async (date: string, label: string | null, timeOfDay: string | null, items: FoodLogItemInput[], icon?: string | null) => {
      const uid = getCachedUserId();
      if (!uid) throw new Error('Not authenticated');
      return foodLogService.createFoodLog(db, uid, date, label, timeOfDay, items, icon);
    },
    [db],
  );

  const deleteFoodLog = useCallback(async (id: string) => {
    await foodLogService.deleteFoodLog(db, id);
  }, [db]);

  const deleteFoodLogItem = useCallback(async (_logId: string, itemId: string) => {
    await foodLogService.deleteFoodLogItem(db, itemId);
  }, [db]);

  const updateFoodLogItem = useCallback(async (_logId: string, itemId: string, patch: Parameters<typeof foodLogService.updateFoodLogItem>[2]) => {
    await foodLogService.updateFoodLogItem(db, itemId, patch);
  }, [db]);

  const addItemsToFoodLog = useCallback(async (logId: string, items: FoodLogItemInput[]): Promise<FoodLogItem[]> => {
    return foodLogService.addItemsToFoodLog(db, logId, items);
  }, [db]);

  const updateFoodLog = useCallback(async (id: string, patch: Parameters<typeof foodLogService.updateFoodLog>[2]) => {
    await foodLogService.updateFoodLog(db, id, patch);
  }, [db]);

  return {
    weekLogs,
    loading: false,
    error: null,
    userId: userId || undefined,
    createFoodLog,
    deleteFoodLog,
    deleteFoodLogItem,
    updateFoodLogItem,
    updateFoodLog,
    addItemsToFoodLog,
    refresh: useCallback(() => {}, []),
  };
}

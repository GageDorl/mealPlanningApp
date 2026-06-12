import { supabase } from './supabase';
import { getFoodLogsForDay } from './food-log-service';
import { DefaultMacros } from '@/constants/macros';
import type { FoodLogItem } from '@/models/food-log';

const RECIPE_MACRO_FIELD: Record<string, keyof import('@/models/recipe').Recipe> = {
  calories: 'calories_per_serving',
  protein: 'protein_per_serving',
  carbs: 'carbs_per_serving',
  fat: 'fat_per_serving',
  fiber: 'fiber_per_serving',
  sugar: 'sugar_per_serving',
  sodium: 'sodium_per_serving',
};

const FOOD_LOG_MACRO_FIELD: Record<string, keyof FoodLogItem> = {
  calories: 'calories',
  protein: 'protein',
  carbs: 'carbs',
  fat: 'fat',
  fiber: 'dietary_fiber',
  sugar: 'total_sugar',
  sodium: 'sodium',
};

export interface MacroGoalRow {
  macro_name: string;
  daily_target: number;
  unit: string;
  display_order: number;
  is_active: boolean;
}

export interface MacroProgress {
  macro_name: string;
  label: string;
  current: number;
  goal: number;
  unit: string;
  percentage: number;
  color: string;
}

export interface MealMacroEntry {
  id: string;
  entry_type: 'planned' | 'logged';
  label: string | null;
  recipe_title?: string | null;
  food_name?: string | null;
  brand_name?: string | null;
  time_of_day?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyMacroProgress {
  date: string;
  macros: MacroProgress[];
  meal_breakdown: MealMacroEntry[];
}

function isSlotTimeReached(slotDate: string, timeOfDay: string | null, now: Date): boolean {
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (slotDate < todayStr) return true;
  if (slotDate > todayStr) return false;
  if (!timeOfDay) return true;
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return timeOfDay <= currentTime;
}

function getWeekStart(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - date.getDay()); // back to Sunday, matching calendar week_start
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function getDailyProgress(userId: string, date: string): Promise<DailyMacroProgress> {
  const weekStart = getWeekStart(date);

  const [{ data: goalsData }, { data: planRows }, foodLogs] = await Promise.all([
    supabase.from('macro_goals').select('*').eq('user_id', userId).eq('is_active', true).order('display_order'),
    supabase.from('meal_plans').select('id').eq('user_id', userId).eq('week_start', weekStart).order('created_at', { ascending: true }).limit(1),
    getFoodLogsForDay(userId, date).catch(() => [] as import('./food-log-service').FoodLogWithItems[]),
  ]);

  const goals = (goalsData ?? []) as MacroGoalRow[];
  const planData = (planRows as { id: string }[] | null)?.[0] ?? null;

  // Build food log breakdown entries
  const foodLogEntries: MealMacroEntry[] = foodLogs.flatMap((log) =>
    log.items.map((item) => ({
      id: item.id,
      entry_type: 'logged' as const,
      label: log.label ?? null,
      food_name: item.food_name,
      brand_name: item.brand_name ?? null,
      time_of_day: log.time_of_day ?? null,
      calories: Math.round((item.calories ?? 0) * item.servings_eaten),
      protein: Math.round(((item.protein ?? 0) * item.servings_eaten) * 10) / 10,
      carbs: Math.round(((item.carbs ?? 0) * item.servings_eaten) * 10) / 10,
      fat: Math.round(((item.fat ?? 0) * item.servings_eaten) * 10) / 10,
    }))
  );

  if (!planData) {
    const macros = buildMacroProgress(goals, [], foodLogs.flatMap((l) => l.items));
    const meal_breakdown = sortByTime(foodLogEntries);
    return { date, macros, meal_breakdown };
  }

  const { data: slotsData } = await supabase
    .from('meal_slots')
    .select('id, label, time_of_day')
    .eq('meal_plan_id', planData.id)
    .eq('date', date);

  const now = new Date();
  const slots = ((slotsData ?? []) as Array<{ id: string; label: string; time_of_day: string | null }>)
    .filter((slot) => isSlotTimeReached(date, slot.time_of_day, now));

  type SlotRecipeJoin = {
    id: string; meal_slot_id: string; recipe_id: string;
    servings_eaten: number | null;
    recipes: import('@/models/recipe').Recipe;
  };
  let slotRecipes: SlotRecipeJoin[] = [];
  if (slots.length > 0) {
    const { data: srData } = await supabase
      .from('meal_slot_recipes')
      .select('id, meal_slot_id, recipe_id, servings_eaten, recipes(*)')
      .in('meal_slot_id', slots.map((s) => s.id));
    slotRecipes = (srData as unknown as SlotRecipeJoin[]) ?? [];
  }

  const srBySlot = new Map<string, SlotRecipeJoin[]>();
  for (const sr of slotRecipes) {
    const list = srBySlot.get(sr.meal_slot_id) ?? [];
    list.push(sr);
    srBySlot.set(sr.meal_slot_id, list);
  }

  const plannedEntries: MealMacroEntry[] = slots.flatMap((slot): MealMacroEntry[] => {
    const entries = srBySlot.get(slot.id) ?? [];
    if (entries.length === 0) {
      return [{ id: slot.id, entry_type: 'planned', label: slot.label, recipe_title: null, time_of_day: slot.time_of_day, calories: 0, protein: 0, carbs: 0, fat: 0 }];
    }
    return entries.map((sr) => {
      const recipe = sr.recipes;
      const servings = sr.servings_eaten ?? recipe.servings ?? 1;
      return {
        id: sr.id,
        entry_type: 'planned',
        label: slot.label,
        recipe_title: recipe.title,
        time_of_day: slot.time_of_day,
        calories: Math.round((recipe.calories_per_serving ?? 0) * servings),
        protein: Math.round(((recipe.protein_per_serving ?? 0) * servings) * 10) / 10,
        carbs: Math.round(((recipe.carbs_per_serving ?? 0) * servings) * 10) / 10,
        fat: Math.round(((recipe.fat_per_serving ?? 0) * servings) * 10) / 10,
      };
    });
  });

  const contributions = slotRecipes.map((sr) => ({
    recipe: sr.recipes,
    servings: sr.servings_eaten ?? sr.recipes.servings ?? 1,
  }));
  const macros = buildMacroProgress(goals, contributions, foodLogs.flatMap((l) => l.items));
  const meal_breakdown = sortByTime([...plannedEntries, ...foodLogEntries]);

  return { date, macros, meal_breakdown };
}

export async function getWeeklyProgress(userId: string, weekStart: Date): Promise<DailyMacroProgress[]> {
  const start = weekStart.toISOString().split('T')[0];
  const endDate = new Date(weekStart);
  endDate.setDate(endDate.getDate() + 6);
  return getHistoricalProgress(userId, start, endDate.toISOString().split('T')[0]);
}

export async function getHistoricalProgress(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<DailyMacroProgress[]> {
  const [{ data: goalsData }, { data: plansData }, { data: foodLogsRaw }] = await Promise.all([
    supabase.from('macro_goals').select('*').eq('user_id', userId).eq('is_active', true).order('display_order'),
    supabase.from('meal_plans').select('id, week_start').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase
      .from('food_logs')
      .select('id, date, label, time_of_day, food_log_items(*)')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate),
  ]);

  const goals = (goalsData ?? []) as MacroGoalRow[];

  // Deduplicate: keep only the first-created plan per week to match getDailyProgress's .limit(1) behaviour.
  // If duplicate meal_plan rows exist for the same week, getHistoricalProgress would otherwise double-count their slots.
  const seenWeeks = new Set<string>();
  const planIds = ((plansData ?? []) as { id: string; week_start: string }[])
    .filter((p) => {
      if (seenWeeks.has(p.week_start)) return false;
      seenWeeks.add(p.week_start);
      return true;
    })
    .map((p) => p.id);

  type HistSlotRow = { id: string; date: string; label: string | null; time_of_day: string | null };
  type HistSlotRecipeRow = {
    id: string; meal_slot_id: string; servings_eaten: number | null;
    recipes: import('@/models/recipe').Recipe;
  };

  let rawSlots: HistSlotRow[] = [];
  if (planIds.length > 0) {
    const { data: slotsData } = await supabase
      .from('meal_slots')
      .select('id, date, label, time_of_day')
      .in('meal_plan_id', planIds)
      .gte('date', startDate)
      .lte('date', endDate);
    rawSlots = (slotsData ?? []) as HistSlotRow[];
  }

  let rawSlotRecipes: HistSlotRecipeRow[] = [];
  if (rawSlots.length > 0) {
    const { data: srData } = await supabase
      .from('meal_slot_recipes')
      .select('id, meal_slot_id, servings_eaten, recipes(*)')
      .in('meal_slot_id', rawSlots.map((s) => s.id));
    rawSlotRecipes = (srData as unknown as HistSlotRecipeRow[]) ?? [];
  }

  const srBySlotHist = new Map<string, HistSlotRecipeRow[]>();
  for (const sr of rawSlotRecipes) {
    const list = srBySlotHist.get(sr.meal_slot_id) ?? [];
    list.push(sr);
    srBySlotHist.set(sr.meal_slot_id, list);
  }

  const slotsByDate = new Map<string, HistSlotRow[]>();
  for (const slot of rawSlots) {
    const list = slotsByDate.get(slot.date) ?? [];
    list.push(slot);
    slotsByDate.set(slot.date, list);
  }

  type RawLog = { date: string; label: string | null; time_of_day: string | null; food_log_items: FoodLogItem[] };
  const logsByDate = new Map<string, RawLog[]>();
  for (const log of ((foodLogsRaw ?? []) as any[])) {
    const typed: RawLog = { ...log, food_log_items: (log.food_log_items ?? []) as FoodLogItem[] };
    const list = logsByDate.get(log.date) ?? [];
    list.push(typed);
    logsByDate.set(log.date, list);
  }

  const now = new Date();
  return buildDateRange(startDate, endDate).map((date) => {
    const daySlots = (slotsByDate.get(date) ?? []).filter((slot) => isSlotTimeReached(date, slot.time_of_day, now));
    const dayLogs = logsByDate.get(date) ?? [];
    const dayItems = dayLogs.flatMap((l) => l.food_log_items);

    const dayContributions = daySlots.flatMap((slot) =>
      (srBySlotHist.get(slot.id) ?? []).map((sr) => ({
        recipe: sr.recipes,
        servings: sr.servings_eaten ?? sr.recipes.servings ?? 1,
      }))
    );
    const macros = buildMacroProgress(goals, dayContributions, dayItems);

    const plannedEntries: MealMacroEntry[] = daySlots.flatMap((slot): MealMacroEntry[] => {
      const entries = srBySlotHist.get(slot.id) ?? [];
      if (entries.length === 0) return [{ id: slot.id, entry_type: 'planned', label: slot.label, recipe_title: null, time_of_day: slot.time_of_day, calories: 0, protein: 0, carbs: 0, fat: 0 }];
      return entries.map((sr) => {
        const recipe = sr.recipes;
        const servings = sr.servings_eaten ?? recipe.servings ?? 1;
        return {
          id: sr.id,
          entry_type: 'planned',
          label: slot.label,
          recipe_title: recipe.title,
          time_of_day: slot.time_of_day,
          calories: Math.round((recipe.calories_per_serving ?? 0) * servings),
          protein: Math.round(((recipe.protein_per_serving ?? 0) * servings) * 10) / 10,
          carbs: Math.round(((recipe.carbs_per_serving ?? 0) * servings) * 10) / 10,
          fat: Math.round(((recipe.fat_per_serving ?? 0) * servings) * 10) / 10,
        };
      });
    });

    const loggedEntries: MealMacroEntry[] = dayLogs.flatMap((log) =>
      log.food_log_items.map((item) => ({
        id: item.id,
        entry_type: 'logged' as const,
        label: log.label,
        food_name: item.food_name,
        brand_name: item.brand_name ?? null,
        time_of_day: log.time_of_day,
        calories: Math.round((item.calories ?? 0) * item.servings_eaten),
        protein: Math.round(((item.protein ?? 0) * item.servings_eaten) * 10) / 10,
        carbs: Math.round(((item.carbs ?? 0) * item.servings_eaten) * 10) / 10,
        fat: Math.round(((item.fat ?? 0) * item.servings_eaten) * 10) / 10,
      })),
    );

    return {
      date,
      macros,
      meal_breakdown: sortByTime([...plannedEntries, ...loggedEntries]),
    };
  });
}

function buildDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  while (cursor <= end) {
    dates.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`,
    );
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function sortByTime(entries: MealMacroEntry[]): MealMacroEntry[] {
  return entries.slice().sort((a, b) => {
    if (!a.time_of_day && !b.time_of_day) return 0;
    if (!a.time_of_day) return 1;
    if (!b.time_of_day) return -1;
    return a.time_of_day.localeCompare(b.time_of_day);
  });
}

function buildEmptyProgress(date: string, goals: MacroGoalRow[]): DailyMacroProgress {
  const macros = goals.map((goal) => {
    const def = DefaultMacros.find((m) => m.key === goal.macro_name);
    return {
      macro_name: goal.macro_name,
      label: def?.label ?? goal.macro_name,
      current: 0,
      goal: goal.daily_target,
      unit: goal.unit,
      percentage: 0,
      color: def?.color ?? '#888888',
    };
  });
  return { date, macros, meal_breakdown: [] };
}

function buildMacroProgress(
  goals: MacroGoalRow[],
  contributions: Array<{ recipe: import('@/models/recipe').Recipe; servings: number }>,
  foodLogItems: FoodLogItem[] = [],
): MacroProgress[] {
  return goals.map((goal) => {
    const recipeField = RECIPE_MACRO_FIELD[goal.macro_name];
    const logField = FOOD_LOG_MACRO_FIELD[goal.macro_name];
    const def = DefaultMacros.find((m) => m.key === goal.macro_name);

    const fromPlanned = recipeField
      ? contributions.reduce((sum, { recipe, servings }) => {
          const value = (recipe[recipeField] as number | null | undefined) ?? 0;
          return sum + value * servings;
        }, 0)
      : 0;

    const fromLogged = logField
      ? foodLogItems.reduce((sum, item) => {
          const value = (item[logField] as number | null | undefined) ?? 0;
          return sum + value * item.servings_eaten;
        }, 0)
      : 0;

    const current = fromPlanned + fromLogged;
    const rounded = Math.round(current * 10) / 10;
    const percentage = goal.daily_target > 0 ? Math.min(100, (rounded / goal.daily_target) * 100) : 0;

    return {
      macro_name: goal.macro_name,
      label: def?.label ?? goal.macro_name,
      current: rounded,
      goal: goal.daily_target,
      unit: goal.unit,
      percentage: Math.round(percentage),
      color: def?.color ?? '#888888',
    };
  });
}

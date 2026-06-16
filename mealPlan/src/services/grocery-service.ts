import { randomUUID } from 'expo-crypto';
import { supabase } from './supabase';
import { aggregateIngredients, type RawIngredientInput, type AggregatedItem } from '@/utils/grocery-aggregator';
import { generateGroceryListWithAI } from '@/services/claude-ingredients';

interface PsDb {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
  getAll<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

export interface GroceryItemRow {
  id: string;
  grocery_list_id: string;
  ingredient_id: string | null;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  is_checked: boolean;
  deficit_note: string | null;
}

export interface GroceryListRow {
  id: string;
  user_id: string;
  meal_plan_id: string;
  generated_at: string;
}

export interface PantryStapleRow {
  id: string;
  user_id: string;
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
}

export interface GroceryDisplayGroup {
  category: string;
  displayLabel: string;
  items: GroceryItemRow[];
}

export interface GroceryState {
  list: GroceryListRow | null;
  items: GroceryItemRow[];
  displayGroups: GroceryDisplayGroup[];
  checkedCount: number;
  totalCount: number;
}

const CATEGORY_ORDER = [
  'produce', 'protein', 'dairy', 'grains', 'pantry', 'spices', 'frozen', 'beverages', 'other',
];

const CATEGORY_LABELS: Record<string, string> = {
  produce: 'Produce',
  protein: 'Protein',
  dairy: 'Dairy',
  grains: 'Grains & Bread',
  pantry: 'Pantry',
  spices: 'Spices & Condiments',
  frozen: 'Frozen',
  beverages: 'Beverages',
  other: 'Other',
};

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // back to Sunday, matching calendar week_start
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function groupItemsByCategory(items: GroceryItemRow[]): GroceryDisplayGroup[] {
  const categoryMap = new Map<string, GroceryItemRow[]>();
  for (const item of items) {
    const cat = item.category ?? 'other';
    const list = categoryMap.get(cat) ?? [];
    list.push(item);
    categoryMap.set(cat, list);
  }

  const groups: GroceryDisplayGroup[] = [];
  for (const cat of CATEGORY_ORDER) {
    if (categoryMap.has(cat)) {
      groups.push({
        category: cat,
        displayLabel: CATEGORY_LABELS[cat] ?? cat,
        items: categoryMap.get(cat)!.sort((a, b) => a.name.localeCompare(b.name)),
      });
      categoryMap.delete(cat);
    }
  }
  for (const [cat, items] of categoryMap) {
    groups.push({
      category: cat,
      displayLabel: CATEGORY_LABELS[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1),
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    });
  }
  return groups;
}

export async function generateList(db: PsDb, userId: string, weekStart: Date): Promise<GroceryState> {
  const weekStartStr = getWeekStart(weekStart);
  const { data: planRows } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('week_start', weekStartStr)
    .order('created_at', { ascending: true })
    .limit(1);
  const planData = (planRows as { id: string }[] | null)?.[0] ?? null;

  if (!planData) {
    return { list: null, items: [], displayGroups: [], checkedCount: 0, totalCount: 0 };
  }
  const { data: slotsData } = await supabase
    .from('meal_slots')
    .select('id')
    .eq('meal_plan_id', planData.id);
  const slotIds = ((slotsData ?? []) as Array<{ id: string }>).map((s) => s.id);
  const recipeIds: string[] = [];
  if (slotIds.length > 0) {
    const { data: slotRecipesData } = await supabase
      .from('meal_slot_recipes')
      .select('recipe_id')
      .in('meal_slot_id', slotIds);
    recipeIds.push(
      ...new Set(
        ((slotRecipesData ?? []) as Array<{ recipe_id: string }>)
          .map((sr) => sr.recipe_id)
          .filter(Boolean)
      )
    );
  }

  interface RecipeIngredientRow {
    name: string;
    quantity: number | null;
    unit: string | null;
    ingredient_id: string | null;
  }

  interface IngredientCategoryRow {
    id: string;
    category: string | null;
  }

  const rawInputs: RawIngredientInput[] = [];
  if (recipeIds.length > 0) {
    const { data: riData } = await supabase
      .from('recipe_ingredients')
      .select('name, quantity, unit, ingredient_id')
      .in('recipe_id', recipeIds);

    const riRows = (riData ?? []) as RecipeIngredientRow[];

    const ingredientIds = [...new Set(riRows.map((r) => r.ingredient_id).filter((id): id is string => !!id))];
    const categoryMap = new Map<string, string | null>();
    if (ingredientIds.length > 0) {
      const { data: ingData } = await supabase
        .from('ingredients')
        .select('id, category')
        .in('id', ingredientIds);
      for (const ing of (ingData ?? []) as IngredientCategoryRow[]) {
        categoryMap.set(ing.id, ing.category);
      }
    }

    for (const ri of riRows) {
      rawInputs.push({
        name: ri.name,
        quantity: ri.quantity,
        unit: ri.unit,
        category: ri.ingredient_id ? (categoryMap.get(ri.ingredient_id) ?? null) : null,
        ingredient_id: ri.ingredient_id,
      });
    }
  }

  const { data: staplesData } = await supabase
    .from('pantry_staples')
    .select('ingredient_name, quantity, unit')
    .eq('user_id', userId);
  const pantryItems = ((staplesData ?? []) as Array<{ ingredient_name: string; quantity: number | null; unit: string | null }>).map(
    (s) => ({ name: s.ingredient_name, quantity: s.quantity, unit: s.unit })
  );

  const aiItems = await generateGroceryListWithAI(
    rawInputs.map((r) => ({ name: r.name, quantity: r.quantity, unit: r.unit })),
    pantryItems
  );

  const finalAggregated: AggregatedItem[] = aiItems !== null
    ? aiItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        ingredient_id: null,
        deficitNote: item.deficitNote ?? null,
      }))
    : aggregateIngredients(rawInputs, pantryItems).flatMap((g) => g.items);

  const now = new Date().toISOString();

  const { data: existingList } = await supabase
    .from('grocery_lists')
    .select('id')
    .eq('user_id', userId)
    .eq('meal_plan_id', planData.id)
    .maybeSingle();

  let listId: string;
  if (existingList) {
    listId = existingList.id;
    await db.execute('DELETE FROM grocery_items WHERE grocery_list_id = ?', [listId]);
    await db.execute('UPDATE grocery_lists SET generated_at = ?, updated_at = ? WHERE id = ?', [now, now, listId]);
  } else {
    listId = randomUUID();
    await db.execute(
      'INSERT INTO grocery_lists (id, user_id, meal_plan_id, generated_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [listId, userId, planData.id, now, now, now],
    );
  }

  const insertedItems: GroceryItemRow[] = [];
  for (const item of finalAggregated) {
    const itemId = randomUUID();
    await db.execute(
      'INSERT INTO grocery_items (id, grocery_list_id, ingredient_id, name, quantity, unit, category, deficit_note, is_checked, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [itemId, listId, item.ingredient_id, item.name, item.quantity, item.unit, item.category, item.deficitNote ?? null, 0, now, now],
    );
    insertedItems.push({
      id: itemId,
      grocery_list_id: listId,
      ingredient_id: item.ingredient_id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      is_checked: false,
      deficit_note: item.deficitNote ?? null,
    });
  }

  const list: GroceryListRow = {
    id: listId,
    user_id: userId,
    meal_plan_id: planData.id,
    generated_at: now,
  };

  return {
    list,
    items: insertedItems,
    displayGroups: groupItemsByCategory(insertedItems),
    checkedCount: 0,
    totalCount: insertedItems.length,
  };
}

export async function getList(userId: string, weekStart: Date): Promise<GroceryState> {
  const weekStartStr = getWeekStart(weekStart);

  const { data: planRows } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('week_start', weekStartStr)
    .order('created_at', { ascending: true })
    .limit(1);
  const planData = (planRows as { id: string }[] | null)?.[0] ?? null;

  if (!planData) {
    return { list: null, items: [], displayGroups: [], checkedCount: 0, totalCount: 0 };
  }

  const { data: listData } = await supabase
    .from('grocery_lists')
    .select('*')
    .eq('user_id', userId)
    .eq('meal_plan_id', planData.id)
    .maybeSingle();

  if (!listData) {
    return { list: null, items: [], displayGroups: [], checkedCount: 0, totalCount: 0 };
  }

  const { data: itemsData } = await supabase
    .from('grocery_items')
    .select('*')
    .eq('grocery_list_id', listData.id);

  const items = (itemsData ?? []) as GroceryItemRow[];
  const list = listData as GroceryListRow;

  return {
    list,
    items,
    displayGroups: groupItemsByCategory(items),
    checkedCount: items.filter((i) => i.is_checked).length,
    totalCount: items.length,
  };
}

export async function toggleItemChecked(db: PsDb, itemId: string, checked: boolean): Promise<void> {
  await db.execute(
    'UPDATE grocery_items SET is_checked = ?, updated_at = ? WHERE id = ?',
    [checked ? 1 : 0, new Date().toISOString(), itemId],
  );
}

export async function addPantryStaple(
  db: PsDb,
  userId: string,
  ingredientName: string,
  quantity: number | null = null,
  unit: string | null = null
): Promise<PantryStapleRow> {
  const id = randomUUID();
  const created_at = new Date().toISOString();
  const normalizedName = ingredientName.toLowerCase().trim();
  const normalizedUnit = unit ? unit.toLowerCase().trim() : null;

  await db.execute(
    'INSERT INTO pantry_staples (id, user_id, ingredient_name, quantity, unit, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, normalizedName, quantity, normalizedUnit, created_at],
  );

  return { id, user_id: userId, ingredient_name: normalizedName, quantity, unit: normalizedUnit };
}

export async function updatePantryStaple(
  db: PsDb,
  stapleId: string,
  quantity: number | null,
  unit: string | null
): Promise<void> {
  await db.execute(
    'UPDATE pantry_staples SET quantity = ?, unit = ? WHERE id = ?',
    [quantity, unit ? unit.toLowerCase().trim() : null, stapleId],
  );
}

export async function removePantryStaple(db: PsDb, stapleId: string): Promise<void> {
  await db.execute('DELETE FROM pantry_staples WHERE id = ?', [stapleId]);
}

export async function getPantryStaples(db: PsDb, userId: string): Promise<PantryStapleRow[]> {
  return db.getAll<PantryStapleRow>(
    'SELECT * FROM pantry_staples WHERE user_id = ? ORDER BY ingredient_name',
    [userId],
  );
}

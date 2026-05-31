import { randomUUID } from 'expo-crypto';
import { supabase } from './supabase';
import { aggregateIngredients, type RawIngredientInput, type AggregatedItem } from '@/utils/grocery-aggregator';
import { generateGroceryListWithAI } from '@/services/claude-ingredients';

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

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 1 : 1 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function groupItemsByCategory(items: GroceryItemRow[]): GroceryDisplayGroup[] {
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

export async function generateList(userId: string, weekStart: Date): Promise<GroceryState> {
  const weekStartStr = getMonday(weekStart);

  const { data: planData } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('week_start', weekStartStr)
    .maybeSingle();

  if (!planData) {
    return { list: null, items: [], displayGroups: [], checkedCount: 0, totalCount: 0 };
  }

  const { data: slotsData } = await supabase
    .from('meal_slots')
    .select('recipe_id')
    .eq('meal_plan_id', planData.id)
    .not('recipe_id', 'is', null);

  const recipeIds = [
    ...new Set(
      ((slotsData ?? []) as Array<{ recipe_id: string }>)
        .map((s) => s.recipe_id)
        .filter(Boolean)
    ),
  ];

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

  // Claude consolidates duplicates across units, applies pantry, and categorizes in one call.
  // Falls back to legacy exact-match aggregator if the edge function fails.
  const aiItems = await generateGroceryListWithAI(
    rawInputs.map((r) => ({ name: r.name, quantity: r.quantity, unit: r.unit })),
    pantryItems
  );

  const finalAggregated: AggregatedItem[] = aiItems.length > 0
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
    await supabase.from('grocery_items').delete().eq('grocery_list_id', listId);
    await supabase
      .from('grocery_lists')
      .update({ generated_at: now, updated_at: now })
      .eq('id', listId);
  } else {
    const { data: newList, error: insertError } = await supabase
      .from('grocery_lists')
      .insert({
        id: randomUUID(),
        user_id: userId,
        meal_plan_id: planData.id,
        generated_at: now,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();
    if (insertError || !newList) throw new Error(insertError?.message ?? 'Failed to create grocery list');
    listId = newList.id;
  }

  if (finalAggregated.length > 0) {
    await supabase.from('grocery_items').insert(
      finalAggregated.map((item) => ({
        id: randomUUID(),
        grocery_list_id: listId,
        ingredient_id: item.ingredient_id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        deficit_note: item.deficitNote ?? null,
        is_checked: false,
        created_at: now,
        updated_at: now,
      }))
    );
  }

  const { data: freshItems } = await supabase
    .from('grocery_items')
    .select('*')
    .eq('grocery_list_id', listId);

  const items = (freshItems ?? []) as GroceryItemRow[];
  const list: GroceryListRow = {
    id: listId,
    user_id: userId,
    meal_plan_id: planData.id,
    generated_at: now,
  };

  return {
    list,
    items,
    displayGroups: groupItemsByCategory(items),
    checkedCount: 0,
    totalCount: items.length,
  };
}

export async function getList(userId: string, weekStart: Date): Promise<GroceryState> {
  const weekStartStr = getMonday(weekStart);

  const { data: planData } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('week_start', weekStartStr)
    .maybeSingle();

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

export async function toggleItemChecked(itemId: string, checked: boolean): Promise<void> {
  await supabase
    .from('grocery_items')
    .update({ is_checked: checked, updated_at: new Date().toISOString() })
    .eq('id', itemId);
}

export async function addPantryStaple(
  userId: string,
  ingredientName: string,
  quantity: number | null = null,
  unit: string | null = null
): Promise<PantryStapleRow> {
  const { data } = await supabase
    .from('pantry_staples')
    .insert({
      id: randomUUID(),
      user_id: userId,
      ingredient_name: ingredientName.toLowerCase().trim(),
      quantity,
      unit: unit ? unit.toLowerCase().trim() : null,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  return data as PantryStapleRow;
}

export async function updatePantryStaple(
  stapleId: string,
  quantity: number | null,
  unit: string | null
): Promise<void> {
  await supabase
    .from('pantry_staples')
    .update({ quantity, unit: unit ? unit.toLowerCase().trim() : null })
    .eq('id', stapleId);
}

export async function removePantryStaple(stapleId: string): Promise<void> {
  await supabase.from('pantry_staples').delete().eq('id', stapleId);
}

export async function getPantryStaples(userId: string): Promise<PantryStapleRow[]> {
  const { data } = await supabase
    .from('pantry_staples')
    .select('*')
    .eq('user_id', userId)
    .order('ingredient_name');
  return (data ?? []) as PantryStapleRow[];
}

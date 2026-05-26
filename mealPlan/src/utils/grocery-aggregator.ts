export interface RawIngredientInput {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  ingredient_id: string | null;
}

export interface PantryItem {
  name: string;
  quantity: number | null;
  unit: string | null;
}

export interface AggregatedItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  ingredient_id: string | null;
  deficitNote: string | null;
}

export interface CategoryGroup {
  category: string;
  displayLabel: string;
  items: AggregatedItem[];
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

// Same name + same unit → combine quantities. Different units → separate items (per spec edge case).
// Pantry subtraction: same-unit comparison only. null quantity on pantry item = exclude entirely (staple).
export function aggregateIngredients(
  ingredients: RawIngredientInput[],
  pantryItems: PantryItem[]
): CategoryGroup[] {
  // Step 1: aggregate all ingredients before pantry filtering
  const aggregated = new Map<string, AggregatedItem>();
  for (const item of ingredients) {
    const key = `${item.name.toLowerCase().trim()}||${(item.unit ?? '').toLowerCase().trim()}`;
    const existing = aggregated.get(key);
    if (existing) {
      if (existing.quantity !== null && item.quantity !== null) {
        existing.quantity = Math.round((existing.quantity + item.quantity) * 100) / 100;
      }
    } else {
      aggregated.set(key, { ...item, deficitNote: null });
    }
  }

  // Step 2: apply pantry logic
  const pantryMap = new Map<string, PantryItem>();
  for (const p of pantryItems) {
    pantryMap.set(p.name.toLowerCase().trim(), p);
  }

  const result = new Map<string, AggregatedItem>();
  for (const [key, item] of aggregated) {
    const pantry = pantryMap.get(item.name.toLowerCase().trim());

    if (!pantry) {
      result.set(key, item);
      continue;
    }

    // Pantry item with no quantity tracked → treat as "have enough", exclude
    if (pantry.quantity === null) {
      continue;
    }

    // Pantry has a quantity but ingredient has none → can't subtract, include normally
    if (item.quantity === null) {
      result.set(key, item);
      continue;
    }

    // Both have quantities — compare units (null and null count as matching)
    const itemUnit = (item.unit ?? '').toLowerCase().trim();
    const pantryUnit = (pantry.unit ?? '').toLowerCase().trim();

    if (itemUnit !== pantryUnit) {
      // Different units → can't compare, include normally
      result.set(key, item);
      continue;
    }

    const deficit = Math.round((item.quantity - pantry.quantity) * 100) / 100;

    if (deficit <= 0) {
      // Have enough in pantry → exclude
      continue;
    }

    // Have some but not enough → show deficit amount with note
    const deficitDisplay = item.unit ? `${deficit} ${item.unit}` : String(deficit);
    result.set(key, {
      ...item,
      quantity: deficit,
      deficitNote: `need ${deficitDisplay} more for planned meals`,
    });
  }

  // Step 3: group by category
  const categoryMap = new Map<string, AggregatedItem[]>();
  for (const item of result.values()) {
    const cat = item.category ?? 'other';
    const list = categoryMap.get(cat) ?? [];
    list.push(item);
    categoryMap.set(cat, list);
  }

  const groups: CategoryGroup[] = [];
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

export interface RawIngredientInput {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  ingredient_id: string | null;
}

export interface AggregatedItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  ingredient_id: string | null;
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
export function aggregateIngredients(
  ingredients: RawIngredientInput[],
  pantryStapleNames: string[]
): CategoryGroup[] {
  const stapleSet = new Set(pantryStapleNames.map((n) => n.toLowerCase().trim()));

  const filtered = ingredients.filter((i) => !stapleSet.has(i.name.toLowerCase().trim()));

  const aggregated = new Map<string, AggregatedItem>();
  for (const item of filtered) {
    const key = `${item.name.toLowerCase().trim()}||${(item.unit ?? '').toLowerCase().trim()}`;
    const existing = aggregated.get(key);
    if (existing) {
      if (existing.quantity !== null && item.quantity !== null) {
        existing.quantity = Math.round((existing.quantity + item.quantity) * 100) / 100;
      }
    } else {
      aggregated.set(key, { ...item });
    }
  }

  const categoryMap = new Map<string, AggregatedItem[]>();
  for (const item of aggregated.values()) {
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

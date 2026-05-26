export interface ParsedIngredient {
  quantity: number | undefined;
  unit: string;
  name: string;
  rawText: string;
}

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

const UNIT_ALIASES: Record<string, string> = {
  cups: 'cup', cup: 'cup', c: 'cup',
  tablespoons: 'tbsp', tablespoon: 'tbsp', tbsp: 'tbsp', tbs: 'tbsp', tb: 'tbsp',
  teaspoons: 'tsp', teaspoon: 'tsp', tsp: 'tsp',
  ounces: 'oz', ounce: 'oz', oz: 'oz', fl: 'oz',
  pounds: 'lb', pound: 'lb', lbs: 'lb', lb: 'lb',
  grams: 'g', gram: 'g', g: 'g',
  kilograms: 'kg', kilogram: 'kg', kg: 'kg',
  milliliters: 'ml', milliliter: 'ml', ml: 'ml',
  liters: 'l', liter: 'l', l: 'l',
  cloves: 'clove', clove: 'clove',
  slices: 'slice', slice: 'slice',
  pieces: 'piece', piece: 'piece',
  cans: 'can', can: 'can',
  packages: 'package', package: 'package', pkg: 'package',
  stalks: 'stalk', stalk: 'stalk',
  sprigs: 'sprig', sprig: 'sprig',
  bunches: 'bunch', bunch: 'bunch',
  heads: 'head', head: 'head',
};

function parseQuantityToken(token: string): number | undefined {
  const trimmed = token.trim();
  if (!trimmed) return undefined;

  // Unicode fraction character alone e.g. "½"
  if (trimmed in UNICODE_FRACTIONS) return UNICODE_FRACTIONS[trimmed];

  // Number concatenated with unicode fraction e.g. "2½"
  for (const [char, val] of Object.entries(UNICODE_FRACTIONS)) {
    if (trimmed.includes(char)) {
      const whole = parseFloat(trimmed.split(char)[0]);
      return isNaN(whole) ? val : whole + val;
    }
  }

  // Range e.g. "2-3" → take lower bound
  const rangeMatch = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.exec(trimmed);
  if (rangeMatch) return parseFloat(rangeMatch[1]);

  // ASCII fraction e.g. "1/2"
  const fracMatch = /^(\d+)\/(\d+)$/.exec(trimmed);
  if (fracMatch) {
    const num = parseInt(fracMatch[1], 10);
    const den = parseInt(fracMatch[2], 10);
    return den !== 0 ? num / den : undefined;
  }

  // Plain decimal or integer
  const n = parseFloat(trimmed);
  return isNaN(n) ? undefined : n;
}

function parseLeadingQuantity(tokens: string[]): { quantity: number | undefined; consumed: number } {
  if (tokens.length === 0) return { quantity: undefined, consumed: 0 };

  const first = parseQuantityToken(tokens[0]);
  if (first === undefined) return { quantity: undefined, consumed: 0 };

  // Mixed number: second token is a fraction < 1, e.g. "1 ½" or "1 1/2"
  if (tokens.length > 1) {
    const secondFrac = parseQuantityToken(tokens[1]);
    if (secondFrac !== undefined && secondFrac < 1) {
      return { quantity: first + secondFrac, consumed: 2 };
    }
  }

  return { quantity: first, consumed: 1 };
}

export function parseIngredientString(raw: string): ParsedIngredient {
  const tokens = raw.split(/\s+/).filter(Boolean);

  const { quantity, consumed: qtyConsumed } = parseLeadingQuantity(tokens);
  const afterQty = tokens.slice(qtyConsumed);

  let unit = '';
  let unitConsumed = 0;
  if (afterQty.length > 0) {
    const candidate = afterQty[0].toLowerCase().replace(/[.,;]+$/, '');
    if (candidate in UNIT_ALIASES) {
      unit = UNIT_ALIASES[candidate];
      unitConsumed = 1;
    }
  }

  // Name is everything that wasn't consumed as quantity or unit
  const name = afterQty.slice(unitConsumed).join(' ').trim() || raw;

  return {
    quantity: quantity !== undefined ? parseFloat(quantity.toFixed(3)) : undefined,
    unit,
    name,
    rawText: raw,
  };
}

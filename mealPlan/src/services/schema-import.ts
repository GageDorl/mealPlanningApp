import { Platform } from 'react-native';
import type { RecipeFormData, RecipeIngredientInput } from '@/services/recipe-service';
import { parseIngredientsWithAI } from '@/services/claude-ingredients';

export type ImportError = 'no_structured_data' | 'fetch_failed' | 'invalid_url';

export interface ImportResult {
  success: boolean;
  recipe?: Partial<RecipeFormData>;
  error?: ImportError;
}

function parseIsoDuration(duration?: string): number | undefined {
  if (!duration) return undefined;
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i.exec(duration);
  if (!match) return undefined;
  const hours = parseInt(match[1] ?? '0', 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  return hours * 60 + minutes || undefined;
}

function parseServings(recipeYield: unknown): number {
  if (typeof recipeYield === 'number') return recipeYield;
  if (typeof recipeYield === 'string') {
    const m = /(\d+)/.exec(recipeYield);
    return m ? parseInt(m[1], 10) : 1;
  }
  if (Array.isArray(recipeYield)) return parseServings(recipeYield[0]);
  return 1;
}

function parseInstructions(instructions: unknown): string[] {
  if (!instructions) return [];
  if (typeof instructions === 'string') return [instructions];
  if (Array.isArray(instructions)) {
    return instructions
      .flatMap((item) => {
        if (typeof item === 'string') return [item];
        if (typeof item === 'object' && item !== null) {
          const typed = item as Record<string, unknown>;
          if (typed['@type'] === 'HowToStep') return [String(typed.text ?? '')];
          if (typed['@type'] === 'HowToSection')
            return parseInstructions(typed.itemListElement);
        }
        return [];
      })
      .filter(Boolean);
  }
  return [];
}

function parseIngredients(ingredients: unknown): RecipeIngredientInput[] {
  if (!Array.isArray(ingredients)) return [];
  return ingredients.map((raw: unknown, idx: number) => {
    const rawText = typeof raw === 'string' ? raw : '';
    return { raw_text: rawText, name: rawText, display_order: idx };
  });
}

function extractImageUrl(image: unknown): string | undefined {
  if (typeof image === 'string') return image;
  if (Array.isArray(image) && image.length > 0) return extractImageUrl(image[0]);
  if (typeof image === 'object' && image !== null) {
    const obj = image as Record<string, unknown>;
    return typeof obj.url === 'string' ? obj.url : undefined;
  }
  return undefined;
}

function extractRecipeFromLd(ld: unknown): Partial<RecipeFormData> | null {
  if (typeof ld !== 'object' || ld === null) return null;
  const node = ld as Record<string, unknown>;

  const schemaType = node['@type'];
  const isRecipe =
    schemaType === 'Recipe' ||
    (Array.isArray(schemaType) && (schemaType as string[]).includes('Recipe'));
  if (!isRecipe) return null;

  const prep = parseIsoDuration(node.prepTime as string | undefined);
  const cook = parseIsoDuration(node.cookTime as string | undefined);
  const servings = parseServings(node.recipeYield);
  const instructions = parseInstructions(node.recipeInstructions);
  const ingredients = parseIngredients(node.recipeIngredient);

  const nutrition = (node.nutrition as Record<string, unknown>) ?? {};
  const caloriesMatch = /(\d+)/.exec(String(nutrition.calories ?? ''));
  const calories = caloriesMatch ? parseInt(caloriesMatch[1], 10) : undefined;

  const cuisineRaw = node.recipeCuisine;
  const cuisine = Array.isArray(cuisineRaw)
    ? String(cuisineRaw[0] ?? '')
    : cuisineRaw != null
    ? String(cuisineRaw)
    : undefined;

  return {
    title: typeof node.name === 'string' ? node.name : '',
    description:
      typeof node.description === 'string' ? node.description : undefined,
    image_url: extractImageUrl(node.image),
    prep_minutes: prep,
    cook_minutes: cook,
    servings: servings || 1,
    cuisine_type: cuisine || undefined,
    source_type: 'url_import',
    instructions: instructions.length ? instructions : undefined,
    ingredients,
    ...(calories != null ? { calories_per_serving: calories } : {}),
  };
}

export async function importFromUrl(
  url: string,
  onProgress?: (step: string) => void,
): Promise<ImportResult> {
  try {
    new URL(url);
  } catch {
    return { success: false, error: 'invalid_url' };
  }

  onProgress?.('Fetching recipe page…');

  let html: string;
  if (Platform.OS === 'web') {
    // Browser blocks cross-origin fetches — proxy through the edge function instead
    const { supabase } = await import('@/services/supabase');
    const { data, error } = await supabase.functions.invoke<{ html?: string; error?: string }>(
      'fetch-recipe-html',
      { body: { url } }
    );
    if (error || !data?.html) return { success: false, error: 'fetch_failed' };
    html = data.html;
  } else {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bento/1.0; recipe importer)' },
      });
      if (!response.ok) return { success: false, error: 'fetch_failed' };
      html = await response.text();
    } catch {
      return { success: false, error: 'fetch_failed' };
    }
  }

  const ldBlocks: unknown[] = [];
  const scriptRegex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const parsed: unknown = JSON.parse(match[1]);
      if (Array.isArray(parsed)) ldBlocks.push(...parsed);
      else ldBlocks.push(parsed);
    } catch {
      // malformed JSON-LD — skip
    }
  }

  const flatBlocks: unknown[] = [];
  for (const block of ldBlocks) {
    if (typeof block === 'object' && block !== null && '@graph' in block) {
      const graph = (block as Record<string, unknown>)['@graph'];
      if (Array.isArray(graph)) flatBlocks.push(...graph);
    } else {
      flatBlocks.push(block);
    }
  }

  for (const block of flatBlocks) {
    const recipe = extractRecipeFromLd(block);
    if (recipe) {
      const rawTexts = (recipe.ingredients ?? []).map((i) => i.raw_text ?? '').filter(Boolean);
      if (rawTexts.length > 0) {
        onProgress?.('Parsing ingredients with AI…');
        const aiIngredients = await parseIngredientsWithAI(rawTexts);
        return { success: true, recipe: { ...recipe, ingredients: aiIngredients } };
      }
      return { success: true, recipe };
    }
  }

  return { success: false, error: 'no_structured_data' };
}

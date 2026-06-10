import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Token cached at module level — survives across requests in the same warm process
let cachedToken = { value: '', expiresAt: 0 };

async function getFatSecretToken(): Promise<string> {
  if (Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.value;

  const res = await fetch('https://oauth.fatsecret.com/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: Deno.env.get('FATSECRET_CLIENT_ID')!,
      client_secret: Deno.env.get('FATSECRET_CLIENT_SECRET')!,
      scope: 'basic barcode',
    }),
  });

  if (!res.ok) throw new Error(`FatSecret token failed: ${res.status}`);
  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

interface FoodResult {
  id: string;
  name: string;
  brand_name?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  servingDescription?: string;
  caloriesPerServing?: number;
  proteinPerServing?: number;
  carbsPerServing?: number;
  fatPerServing?: number;
}

interface FatSecretServing {
  serving_id: string;
  serving_description: string;
  metric_serving_amount?: number;
  metric_serving_unit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  saturated_fat?: number;
  trans_fat?: number;
  cholesterol?: number;
  sodium?: number;
  fiber?: number;
  sugar?: number;
  added_sugar?: number;
}

interface FoodDetails {
  id: string;
  name: string;
  brand_name?: string;
  servings: FatSecretServing[];
}

function parseDescription(desc: string): Omit<FoodResult, 'id' | 'name' | 'brand_name'> | null {
  const calStr = /Calories:\s*([\d.]+)/i.exec(desc)?.[1];
  const fatStr = /Fat:\s*([\d.]+)/i.exec(desc)?.[1];
  const carbsStr = /Carbs:\s*([\d.]+)/i.exec(desc)?.[1];
  const proteinStr = /Protein:\s*([\d.]+)/i.exec(desc)?.[1];

  if (!calStr || !fatStr || !carbsStr || !proteinStr) return null;

  const cal = parseFloat(calStr);
  const fat = parseFloat(fatStr);
  const carbs = parseFloat(carbsStr);
  const protein = parseFloat(proteinStr);

  // "Per 50g" style (gram primary) → scale to 100g, no per-serving needed
  const directGramsStr = /Per\s+([\d.]+)\s*g/i.exec(desc)?.[1];
  // "(50g)" style inside a count serving → "Per 1 large egg (50g)"
  const parenGramsStr = /\(([\d.]+)\s*g\)/i.exec(desc)?.[1];

  const servingG = directGramsStr != null
    ? parseFloat(directGramsStr)
    : parenGramsStr != null
    ? parseFloat(parenGramsStr)
    : null;

  const scale = servingG != null ? 100 / servingG : 1;

  const result: Omit<FoodResult, 'id' | 'name' | 'brand_name'> = {
    caloriesPer100g: Math.round(cal * scale),
    proteinPer100g: parseFloat((protein * scale).toFixed(1)),
    carbsPer100g: parseFloat((carbs * scale).toFixed(1)),
    fatPer100g: parseFloat((fat * scale).toFixed(1)),
  };

  // Store per-serving data for countable items (anything that isn't a raw "Per Xg" serving)
  if (directGramsStr == null) {
    const servingDesc = /Per\s+(.+?)\s*-/i.exec(desc)?.[1]?.trim();
    if (servingDesc) result.servingDescription = servingDesc;
    result.caloriesPerServing = Math.round(cal);
    result.proteinPerServing = parseFloat(protein.toFixed(1));
    result.carbsPerServing = parseFloat(carbs.toFixed(1));
    result.fatPerServing = parseFloat(fat.toFixed(1));
  }

  return result;
}

function parseServing(s: Record<string, string>): FatSecretServing {
  const f = (v: string | undefined) => (v != null && v !== '' ? parseFloat(v) : undefined);
  return {
    serving_id: s.serving_id ?? '',
    serving_description: s.serving_description ?? '',
    metric_serving_amount: f(s.metric_serving_amount),
    metric_serving_unit: s.metric_serving_unit || undefined,
    calories: f(s.calories),
    protein: f(s.protein),
    carbs: f(s.carbohydrate),
    fat: f(s.fat),
    saturated_fat: f(s.saturated_fat),
    trans_fat: f(s.trans_fat),
    cholesterol: f(s.cholesterol),
    sodium: f(s.sodium),
    fiber: f(s.fiber),
    sugar: f(s.sugar),
    added_sugar: f(s.added_sugars),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { error: authError } = await userClient.auth.getUser();
  if (authError) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  let body: { query?: string; page?: number; food_id?: string; barcode?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
  }

  const { query, page = 1, food_id, barcode } = body;

  if (!query && !food_id && !barcode) {
    return new Response('Missing query, food_id, or barcode', { status: 400, headers: corsHeaders });
  }

  try {
    const token = await getFatSecretToken();

    const proxyUrl = Deno.env.get('FATSECRET_PROXY_URL') ?? 'https://platform.fatsecret.com';
    const proxySecret = Deno.env.get('FATSECRET_PROXY_SECRET');
    const fetchHeaders: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (proxySecret) fetchHeaders['x-proxy-secret'] = proxySecret;

    const fetchWithTimeout = (url: string) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 10000);
      return fetch(url, { headers: fetchHeaders, signal: controller.signal });
    };

    // food_id path: return full food details via food.get.v4
    if (food_id) {
      const url = new URL(`${proxyUrl}/rest/server.api`);
      url.searchParams.set('method', 'food.get.v4');
      url.searchParams.set('food_id', food_id);
      url.searchParams.set('format', 'json');

      const res = await fetchWithTimeout(url.toString());
      if (!res.ok) {
        return new Response('null', {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await res.json();
      const food = data?.food;
      if (!food) {
        return new Response('null', {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const rawServings = food.servings?.serving;
      const servingsArray: Record<string, string>[] = Array.isArray(rawServings)
        ? rawServings
        : rawServings
        ? [rawServings]
        : [];

      const details: FoodDetails = {
        id: food.food_id,
        name: food.food_name,
        brand_name: food.brand_name || undefined,
        servings: servingsArray.map(parseServing),
      };

      return new Response(JSON.stringify(details), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // barcode path: find food by barcode then return full details
    if (barcode) {
      const barcodeUrl = new URL(`${proxyUrl}/rest/server.api`);
      barcodeUrl.searchParams.set('method', 'food.find_id_for_barcode.v2');
      barcodeUrl.searchParams.set('barcode', barcode);
      barcodeUrl.searchParams.set('format', 'json');

      const barcodeRes = await fetchWithTimeout(barcodeUrl.toString());
      if (!barcodeRes.ok) {
        return new Response('null', { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const barcodeData = await barcodeRes.json();
      const food = barcodeData?.food;
      if (!food) {
        return new Response('null', { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const rawServings = food.servings?.serving;
      const servingsArray: Record<string, string>[] = Array.isArray(rawServings)
        ? rawServings
        : rawServings
        ? [rawServings]
        : [];

      const details: FoodDetails = {
        id: food.food_id,
        name: food.food_name,
        brand_name: food.brand_name || undefined,
        servings: servingsArray.map(parseServing),
      };

      return new Response(JSON.stringify(details), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // query path: search foods
    const url = new URL(`${proxyUrl}/rest/server.api`);
    url.searchParams.set('method', 'foods.search');
    url.searchParams.set('search_expression', query!.trim());
    url.searchParams.set('format', 'json');
    url.searchParams.set('max_results', '10');
    url.searchParams.set('page_number', String(page - 1)); // FatSecret is 0-indexed

    const res = await fetchWithTimeout(url.toString());

    if (!res.ok) {
      return new Response(JSON.stringify({ results: [], page, hasMore: false }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const foods = data?.foods;

    if (!foods || !foods.food) {
      return new Response(JSON.stringify({ results: [], page, hasMore: false }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // FatSecret returns a single object (not array) when there's only 1 result
    const foodArray: Record<string, string>[] = Array.isArray(foods.food)
      ? foods.food
      : [foods.food];

    const totalResults = parseInt(foods.total_results ?? '0', 10);

    const results: FoodResult[] = foodArray
      .map((f) => {
        const nutrition = parseDescription(f.food_description ?? '');
        if (!nutrition) return null;
        return {
          id: f.food_id,
          name: f.food_name,
          brand_name: f.brand_name || undefined,
          ...nutrition,
        };
      })
      .filter((r): r is FoodResult => r !== null);

    return new Response(
      JSON.stringify({ results, page, hasMore: page * 10 < totalResults }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

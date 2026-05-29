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
      scope: 'basic',
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
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

function parseDescription(desc: string): Omit<FoodResult, 'id' | 'name'> | null {
  const cal = /Calories:\s*([\d.]+)/i.exec(desc)?.[1];
  const fat = /Fat:\s*([\d.]+)/i.exec(desc)?.[1];
  const carbs = /Carbs:\s*([\d.]+)/i.exec(desc)?.[1];
  const protein = /Protein:\s*([\d.]+)/i.exec(desc)?.[1];

  if (!cal || !fat || !carbs || !protein) return null;

  // Scale to per-100g if the serving size isn't already 100g
  const perMatch = /Per\s+([\d.]+)\s*g/i.exec(desc);
  const servingG = perMatch ? parseFloat(perMatch[1]) : 100;
  const scale = 100 / servingG;

  return {
    caloriesPer100g: Math.round(parseFloat(cal) * scale),
    proteinPer100g: parseFloat((parseFloat(protein) * scale).toFixed(1)),
    carbsPer100g: parseFloat((parseFloat(carbs) * scale).toFixed(1)),
    fatPer100g: parseFloat((parseFloat(fat) * scale).toFixed(1)),
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

  let body: { query?: string; page?: number };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
  }

  const { query, page = 1 } = body;
  if (!query || typeof query !== 'string') {
    return new Response('Missing query', { status: 400, headers: corsHeaders });
  }

  try {
    const token = await getFatSecretToken();

    const proxyUrl = Deno.env.get('FATSECRET_PROXY_URL') ?? 'https://platform.fatsecret.com';
    const proxySecret = Deno.env.get('FATSECRET_PROXY_SECRET');

    const url = new URL(`${proxyUrl}/rest/server.api`);
    url.searchParams.set('method', 'foods.search');
    url.searchParams.set('search_expression', query.trim());
    url.searchParams.set('format', 'json');
    url.searchParams.set('max_results', '10');
    url.searchParams.set('page_number', String(page - 1)); // FatSecret is 0-indexed

    const fetchHeaders: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (proxySecret) fetchHeaders['x-proxy-secret'] = proxySecret;

    const res = await fetch(url.toString(), { headers: fetchHeaders });

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
        return { id: f.food_id, name: f.food_name, ...nutrition };
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

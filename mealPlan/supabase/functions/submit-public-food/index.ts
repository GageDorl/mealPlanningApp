import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubmitPublicFoodBody {
  food_name: string;
  brand_name?: string | null;
  serving_size_amount?: number | null;
  serving_size_unit?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  saturated_fat?: number | null;
  trans_fat?: number | null;
  cholesterol?: number | null;
  sodium?: number | null;
  dietary_fiber?: number | null;
  total_sugar?: number | null;
  added_sugar?: number | null;
  fatsecret_id?: string | null;
  source: 'manual' | 'fatsecret' | 'recipe';
  barcode?: string | null;
  save_to_library?: boolean;
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
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  let body: SubmitPublicFoodBody;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
  }

  if (!body.food_name?.trim()) {
    return new Response('food_name is required', { status: 400, headers: corsHeaders });
  }

  const isFatSecret = body.source === 'fatsecret';

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Nutrition fields shared between public_foods and personal_foods
  const baseNutrition = {
    food_name: body.food_name.trim(),
    brand_name: body.brand_name ?? null,
    serving_size_amount: body.serving_size_amount ?? null,
    serving_size_unit: body.serving_size_unit ?? null,
    calories: body.calories ?? null,
    protein: body.protein ?? null,
    carbs: body.carbs ?? null,
    fat: body.fat ?? null,
    saturated_fat: body.saturated_fat ?? null,
    trans_fat: body.trans_fat ?? null,
    cholesterol: body.cholesterol ?? null,
    sodium: body.sodium ?? null,
    dietary_fiber: body.dietary_fiber ?? null,
    total_sugar: body.total_sugar ?? null,
    added_sugar: body.added_sugar ?? null,
    fatsecret_id: body.fatsecret_id ?? null,
  };

  const publicFoodPayload = {
    ...baseNutrition,
    source: body.source,
    barcode: body.barcode ?? null,
    submitted_by: user.id,
    approved: isFatSecret,
    trusted: isFatSecret,
  };

  if (isFatSecret && body.fatsecret_id) {
    // Upsert on the partial unique index — if already cached, skip (keep original submitted_by)
    const { error } = await adminClient
      .from('public_foods')
      .upsert(publicFoodPayload, { onConflict: 'fatsecret_id', ignoreDuplicates: true });
    if (error) {
      console.error('[submit-public-food] upsert error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } else {
    const { error } = await adminClient.from('public_foods').insert(publicFoodPayload);
    if (error) {
      console.error('[submit-public-food] insert error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Optionally save to the caller's personal library (used by the share toggle)
  if (body.save_to_library) {
    const { error } = await adminClient.from('personal_foods').insert({
      user_id: user.id,
      ...baseNutrition,
    });
    if (error) {
      console.error('[submit-public-food] personal library insert error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

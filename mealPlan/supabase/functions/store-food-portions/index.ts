import { createClient } from 'jsr:@supabase/supabase-js@2';

interface FoodPortion {
  portionDescription: string;
  gramWeight: number;
  amount: number;
}

interface RequestBody {
  fdcId: string;
  foodName: string;
  portions: FoodPortion[];
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { fdcId, foodName, portions } = body;
  if (!fdcId || !foodName || !Array.isArray(portions)) {
    return new Response('Missing required fields: fdcId, foodName, portions', { status: 400 });
  }

  // Verify the caller is authenticated
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { error: authError } = await userClient.auth.getUser();
  if (authError) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Write using service role to bypass RLS
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { error } = await adminClient
    .from('usda_food_portions')
    .upsert({ fdc_id: fdcId, food_name: foodName, portions }, { onConflict: 'fdc_id' });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

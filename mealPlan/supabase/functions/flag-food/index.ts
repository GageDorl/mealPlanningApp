import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  let body: { food_id: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
  }

  if (!body.food_id) {
    return new Response('food_id is required', { status: 400, headers: corsHeaders });
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Insert the flag — UNIQUE(food_id, flagged_by) enforces one flag per user per food
  const { error: insertError } = await adminClient
    .from('food_flags')
    .insert({ food_id: body.food_id, flagged_by: user.id, reason: body.reason ?? null });

  if (insertError) {
    if (insertError.code === '23505') {
      return new Response(JSON.stringify({ ok: false, reason: 'already_flagged' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Increment flag_count and ensure flagged = true.
  // Two-query pattern is acceptable here — flag counts don't need sub-millisecond accuracy.
  const { data: food } = await adminClient
    .from('public_foods')
    .select('flag_count')
    .eq('id', body.food_id)
    .single();

  await adminClient
    .from('public_foods')
    .update({ flagged: true, flag_count: (food?.flag_count ?? 0) + 1 })
    .eq('id', body.food_id);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

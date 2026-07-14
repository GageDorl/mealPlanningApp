import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ModerateAction = 'approve' | 'reject' | 'clear-flags' | 're-pend' | 'remove';

interface ModerateFoodBody {
  food_id: string;
  action: ModerateAction;
  notes?: string;
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

  // Verify moderator or admin role
  const { data: profileData, error: profileError } = await userClient
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profileData || !['moderator', 'admin'].includes(profileData.role)) {
    return new Response('Forbidden', { status: 403, headers: corsHeaders });
  }

  let body: ModerateFoodBody;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
  }

  if (!body.food_id || !body.action) {
    return new Response('food_id and action are required', { status: 400, headers: corsHeaders });
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { food_id, action, notes } = body;

  switch (action) {
    case 'approve': {
      const { error } = await adminClient
        .from('public_foods')
        .update({ approved: true, approval_notes: notes ?? null })
        .eq('id', food_id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      break;
    }

    case 'reject': {
      const { error } = await adminClient
        .from('public_foods')
        .delete()
        .eq('id', food_id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      break;
    }

    case 'clear-flags': {
      const { error: flagsError } = await adminClient
        .from('food_flags')
        .update({ resolved: true })
        .eq('food_id', food_id)
        .eq('resolved', false);
      if (flagsError) {
        return new Response(JSON.stringify({ error: flagsError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { error } = await adminClient
        .from('public_foods')
        .update({ flagged: false, flag_count: 0 })
        .eq('id', food_id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      break;
    }

    case 're-pend': {
      const { error } = await adminClient
        .from('public_foods')
        .update({ approved: false })
        .eq('id', food_id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      break;
    }

    case 'remove': {
      // food_flags rows cascade-delete when the food is deleted (ON DELETE CASCADE)
      const { error } = await adminClient
        .from('public_foods')
        .delete()
        .eq('id', food_id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      break;
    }

    default:
      return new Response('Invalid action', { status: 400, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

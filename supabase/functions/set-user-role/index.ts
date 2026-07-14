import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type UserRole = 'user' | 'moderator' | 'admin';

const VALID_ROLES: UserRole[] = ['user', 'moderator', 'admin'];
const PAGE_SIZE = 20;

async function verifyAdmin(userClient: ReturnType<typeof createClient>): Promise<string | null> {
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await userClient
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  return profile?.role === 'admin' ? user.id : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

  const adminUserId = await verifyAdmin(userClient);
  if (!adminUserId) {
    return new Response('Forbidden', { status: 403, headers: corsHeaders });
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // GET — list users with roles (paginated, optional email search)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const q = url.searchParams.get('q')?.trim() ?? '';
    const page = Math.max(0, parseInt(url.searchParams.get('page') ?? '0', 10));

    let usersQuery = adminClient
      .from('users')
      .select('id, email, display_name', { count: 'exact' })
      .order('email', { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (q) usersQuery = usersQuery.ilike('email', `%${q}%`);

    const { data: users, count, error: usersError } = await usersQuery;
    if (usersError) {
      return new Response(JSON.stringify({ error: usersError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userIds = (users ?? []).map((u: { id: string }) => u.id);
    const { data: profileRows } = userIds.length
      ? await adminClient.from('profiles').select('user_id, role').in('user_id', userIds)
      : { data: [] };

    const roleMap = Object.fromEntries(
      (profileRows ?? []).map((p: { user_id: string; role: string }) => [p.user_id, p.role])
    );

    const result = (users ?? []).map((u: { id: string; email: string; display_name: string | null }) => ({
      id: u.id,
      email: u.email,
      display_name: u.display_name,
      role: (roleMap[u.id] as UserRole) ?? 'user',
    }));

    return new Response(JSON.stringify({ users: result, total: count ?? 0, page, page_size: PAGE_SIZE }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // POST — update a user's role
  if (req.method === 'POST') {
    let body: { user_id: string; role: UserRole };
    try {
      body = await req.json();
    } catch {
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
    }

    if (!body.user_id || !VALID_ROLES.includes(body.role)) {
      return new Response('user_id and valid role are required', { status: 400, headers: corsHeaders });
    }

    // Prevent admin from demoting themselves
    if (body.user_id === adminUserId && body.role !== 'admin') {
      return new Response('Cannot change your own role', { status: 400, headers: corsHeaders });
    }

    const { error } = await adminClient
      .from('profiles')
      .upsert({ user_id: body.user_id, role: body.role }, { onConflict: 'user_id' });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders });
});

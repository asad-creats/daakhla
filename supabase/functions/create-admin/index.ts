// Creates an admin account. Only callable by signed-in super admins.
// Deploy: supabase functions deploy create-admin
import { createClient } from 'npm:@supabase/supabase-js@2';

const SCOPES = ['all', 'PB', 'SD', 'KP', 'BL', 'IS', 'GB', 'AJ'];
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  // Identify the caller from their JWT and confirm they are a super admin.
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
  const { data: caller } = await service.auth.getUser(jwt);
  if (!caller.user) return reply(401, { error: 'Not signed in' });
  const { data: me } = await service.from('admins').select('scope').eq('id', caller.user.id).maybeSingle();
  if (me?.scope !== 'all') return reply(403, { error: 'Only super admins can add accounts' });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const scope = String(body.scope ?? '');
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 6 || !SCOPES.includes(scope)) {
    return reply(400, { error: 'Name, valid email, region and a 6+ character password are required' });
  }

  const { data: existing } = await service.from('admins').select('id').eq('email', email).maybeSingle();
  if (existing) return reply(409, { error: 'An admin with this email already exists' });

  const { data: created, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (error || !created.user) return reply(400, { error: error?.message ?? 'Could not create user' });

  const row = { id: created.user.id, name, email, scope };
  const { error: insErr } = await service.from('admins').insert(row);
  if (insErr) {
    await service.auth.admin.deleteUser(created.user.id);
    return reply(500, { error: insErr.message });
  }
  return reply(200, row);
});

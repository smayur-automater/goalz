// Permanently deletes the signed-in user's account (Apple 5.1.1(v), GDPR art. 17, APP 11.2).
//
// 1. Verifies the caller from their JWT (never trusts an id in the body).
// 2. Deletes their files from Storage.
// 3. Deletes the auth user. Foreign keys cascade through profiles to every
//    user-owned row, so nothing is left behind.
//
// Body: { "confirm": "DELETE" } so a stray request can't delete an account.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { corsHeaders, json } from '../_shared/cors.ts';

const BUCKET = 'user-media';

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'method_not_allowed' });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json(req, 401, { error: 'unauthorised' });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(req, 400, { error: 'invalid_body' });
  }
  if ((body as { confirm?: unknown })?.confirm !== 'DELETE') {
    return json(req, 400, { error: 'confirmation_required' });
  }

  const url = env('SUPABASE_URL');
  const userClient = createClient(url, env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json(req, 401, { error: 'unauthorised' });
  const user = userData.user;

  // Service role is used only after the caller is verified, and only for their own data.
  const admin = createClient(url, env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (profile) {
    const paths = await listAll(admin, profile.id);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await admin.storage.from(BUCKET).remove(paths.slice(i, i + 100));
      if (error) {
        console.error('storage cleanup failed', { userId: user.id, error: error.message });
        return json(req, 500, { error: 'storage_cleanup_failed' });
      }
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('delete user failed', { userId: user.id, error: deleteError.message });
    return json(req, 500, { error: 'delete_failed' });
  }

  return json(req, 200, { deleted: true });
});

type Admin = ReturnType<typeof createClient>;

/** Every object path under a folder, recursively. */
async function listAll(admin: Admin, prefix: string): Promise<string[]> {
  const out: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(BUCKET).list(prefix, { limit: 1000, offset });
    if (error) throw error;
    for (const entry of data) {
      const path = `${prefix}/${entry.name}`;
      // Folders have no id in Storage listings.
      if (entry.id) out.push(path);
      else out.push(...(await listAll(admin, path)));
    }
    if (data.length < 1000) return out;
  }
}

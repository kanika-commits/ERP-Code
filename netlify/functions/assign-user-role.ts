import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

type AssignRoleRequest = {
  email?: string;
  fullName?: string;
  roleCode?: string;
};

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    body: JSON.stringify(body),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return json(500, { error: 'Role assignment service is not configured.' });
  }

  const authHeader = event.headers.authorization;
  const userToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

  if (!userToken) {
    return json(401, { error: 'Not signed in.' });
  }

  const payload = JSON.parse(event.body || '{}') as AssignRoleRequest;
  const email = payload.email?.trim().toLowerCase();
  const fullName = payload.fullName?.trim();
  const roleCode = payload.roleCode?.trim();

  if (!email || !roleCode) {
    return json(400, { error: 'Email and role are required.' });
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user: actor },
    error: actorError,
  } = await supabaseAdmin.auth.getUser(userToken);

  if (actorError || !actor) {
    return json(401, { error: 'Invalid session.' });
  }

  const { data: isSuperAdmin, error: superAdminError } = await supabaseUser.rpc('current_user_has_role', {
    role_code: 'super_admin',
  });

  const { data: isAdminRole, error: adminError } = await supabaseUser.rpc('current_user_has_role', {
    role_code: 'admin',
  });

  if (superAdminError || adminError) {
    return json(500, { error: superAdminError?.message || adminError?.message });
  }

  if (!Boolean(isSuperAdmin || isAdminRole)) {
    return json(403, { error: `Only admins can assign roles. Signed in as ${actor.email ?? actor.id}.` });
  }

  const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

  if (listError) {
    return json(500, { error: listError.message });
  }

  const targetUser = authUsers.users.find((authUser) => authUser.email?.toLowerCase() === email);

  if (!targetUser) {
    return json(404, { error: `No Supabase Auth user found for ${email}. Create the Auth user first.` });
  }

  const { data: role, error: roleError } = await supabaseAdmin
    .from('roles')
    .select('id,code')
    .eq('code', roleCode)
    .single();

  if (roleError || !role) {
    return json(404, { error: `Role not found: ${roleCode}` });
  }

  const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
    id: targetUser.id,
    full_name: fullName || targetUser.user_metadata?.full_name || email,
    email,
    status: 'active',
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    return json(500, { error: profileError.message });
  }

  const { error: userRoleError } = await supabaseAdmin.from('user_roles').upsert({
    user_id: targetUser.id,
    role_id: role.id,
    scope_type: 'global',
    scope_id: '00000000-0000-0000-0000-000000000000',
  });

  if (userRoleError) {
    return json(500, { error: userRoleError.message });
  }

  return json(200, {
    message: `Assigned ${role.code} to ${email}.`,
    userId: targetUser.id,
  });
};

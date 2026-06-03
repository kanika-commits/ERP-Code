import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

type InviteRequest = {
  email?: string;
  fullName?: string;
};

const siteUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:3000';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed.' }),
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Invite service is not configured.' }),
    };
  }

  const payload = JSON.parse(event.body || '{}') as InviteRequest;
  const email = payload.email?.trim().toLowerCase();
  const fullName = payload.fullName?.trim();

  if (!email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Email is required.' }),
    };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const authHeader = event.headers.authorization;
  const userToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

  if (!userToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Not signed in.' }),
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(userToken);

  if (userError || !user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid session.' }),
    };
  }

  const { data: profileRows, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id,email')
    .or(`id.eq.${user.id},email.eq.${user.email}`);

  if (profileError) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: profileError.message }),
    };
  }

  const profileIds = Array.from(new Set([user.id, ...(profileRows ?? []).map((profile) => profile.id)]));

  const { data: userRoleRows, error: userRoleError } = await supabaseAdmin
    .from('user_roles')
    .select('role_id')
    .in('user_id', profileIds);

  if (userRoleError) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: userRoleError.message }),
    };
  }

  const roleIds = (userRoleRows ?? []).map((row) => row.role_id).filter(Boolean);

  const { data: roleRows, error: roleError } = roleIds.length
    ? await supabaseAdmin.from('roles').select('code').in('id', roleIds)
    : { data: [], error: null };

  if (roleError) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: roleError.message }),
    };
  }

  const isAdmin = (roleRows ?? []).some((role) => role.code === 'super_admin' || role.code === 'admin');

  if (!isAdmin) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        error: `Only admins can invite users. Signed in as ${user.email ?? user.id}, but no admin role was found.`,
      }),
    };
  }

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: fullName || email,
    },
    redirectTo: `${siteUrl}/dashboard`,
  });

  if (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      userId: data.user?.id,
      email,
      message: 'Invite sent.',
    }),
  };
};

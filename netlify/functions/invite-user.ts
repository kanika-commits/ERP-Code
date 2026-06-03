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
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
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

  const authHeader = event.headers.authorization;
  const userToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

  if (!userToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Not signed in.' }),
    };
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
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(userToken);

  if (userError || !user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid session.' }),
    };
  }

  const { data: isSuperAdmin, error: superAdminError } = await supabaseUser.rpc('current_user_has_role', {
    role_code: 'super_admin',
  });

  const { data: isAdminRole, error: adminError } = await supabaseUser.rpc('current_user_has_role', {
    role_code: 'admin',
  });

  if (superAdminError || adminError) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: superAdminError?.message || adminError?.message }),
    };
  }

  const isAdmin = Boolean(isSuperAdmin || isAdminRole);

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

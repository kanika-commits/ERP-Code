import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type AccessResult =
  | {
      error: Response;
    }
  | {
      actorId: string;
      isPlatformOwner: boolean;
      isSuperAdmin: boolean;
      supabaseAdmin: SupabaseClient;
      supabaseUser: SupabaseClient;
    };

export function jsonResponse(status: number, body: unknown) {
  return Response.json(body, { status });
}

export async function requireServerAdmin(request: Request): Promise<AccessResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return {
      error: jsonResponse(500, { error: 'Admin service is not configured.' }),
    };
  }

  const authHeader = request.headers.get('authorization');
  const userToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

  if (!userToken) {
    return {
      error: jsonResponse(401, { error: 'Not signed in.' }),
    };
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
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
      error: jsonResponse(401, { error: 'Invalid session.' }),
    };
  }

  const [platformOwner, superAdmin, companyOwner, admin] = await Promise.all([
    supabaseUser.rpc('current_user_has_role', { role_code: 'platform_owner' }),
    supabaseUser.rpc('current_user_has_role', { role_code: 'super_admin' }),
    supabaseUser.rpc('current_user_has_role', { role_code: 'company_owner' }),
    supabaseUser.rpc('current_user_has_role', { role_code: 'admin' }),
  ]);

  const accessError = platformOwner.error || superAdmin.error || companyOwner.error || admin.error;

  if (accessError) {
    return {
      error: jsonResponse(500, { error: accessError.message }),
    };
  }

  const isPlatformOwner = Boolean(platformOwner.data);
  const isSuperAdmin = Boolean(superAdmin.data);
  const isAdmin = isPlatformOwner || isSuperAdmin || Boolean(companyOwner.data) || Boolean(admin.data);

  if (!isAdmin) {
    return {
      error: jsonResponse(403, { error: 'Only ERP admins can perform this action.' }),
    };
  }

  return {
    actorId: user.id,
    isPlatformOwner,
    isSuperAdmin,
    supabaseAdmin,
    supabaseUser,
  };
}

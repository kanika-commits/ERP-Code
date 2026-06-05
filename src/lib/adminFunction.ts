import type { HandlerEvent, HandlerResponse } from '@netlify/functions';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function json(statusCode: number, body: unknown): HandlerResponse {
  return {
    statusCode,
    body: JSON.stringify(body),
  };
}

type RequireAdminResult =
  | {
      error: HandlerResponse;
    }
  | {
      supabaseAdmin: SupabaseClient;
    };

async function createScopedClients(event: HandlerEvent) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return {
      error: json(500, { error: 'Service is not configured.' }),
    };
  }

  const authHeader = event.headers.authorization;
  const userToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

  if (!userToken) {
    return {
      error: json(401, { error: 'Not signed in.' }),
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

  return {
    supabaseAdmin,
    supabaseUser,
  };
}

export async function requireAdmin(event: HandlerEvent): Promise<RequireAdminResult> {
  const clientResult = await createScopedClients(event);

  if ('error' in clientResult) return clientResult;

  const { supabaseAdmin, supabaseUser } = clientResult;

  const { data: isPlatformOwner, error: platformOwnerError } = await supabaseUser.rpc('current_user_has_role', {
    role_code: 'platform_owner',
  });

  const { data: isSuperAdmin, error: superAdminError } = await supabaseUser.rpc('current_user_has_role', {
    role_code: 'super_admin',
  });

  const { data: isCompanyOwner, error: companyOwnerError } = await supabaseUser.rpc('current_user_has_role', {
    role_code: 'company_owner',
  });

  const { data: isAdminRole, error: adminError } = await supabaseUser.rpc('current_user_has_role', {
    role_code: 'admin',
  });

  if (platformOwnerError || superAdminError || companyOwnerError || adminError) {
    return {
      error: json(500, {
        error: platformOwnerError?.message || superAdminError?.message || companyOwnerError?.message || adminError?.message,
      }),
    };
  }

  if (!Boolean(isPlatformOwner || isSuperAdmin || isCompanyOwner || isAdminRole)) {
    return {
      error: json(403, { error: 'Only Admin and Super Admin users can perform this action.' }),
    };
  }

  return {
    supabaseAdmin,
  };
}

export async function requirePlatformOwner(event: HandlerEvent): Promise<RequireAdminResult> {
  const clientResult = await createScopedClients(event);

  if ('error' in clientResult) return clientResult;

  const { supabaseAdmin, supabaseUser } = clientResult;

  const { data: isPlatformOwner, error: platformOwnerError } = await supabaseUser.rpc('current_user_has_role', {
    role_code: 'platform_owner',
  });

  if (platformOwnerError) {
    return {
      error: json(500, { error: platformOwnerError.message }),
    };
  }

  if (!Boolean(isPlatformOwner)) {
    return {
      error: json(403, { error: 'Only the ERP platform owner can perform this action.' }),
    };
  }

  return {
    supabaseAdmin,
  };
}

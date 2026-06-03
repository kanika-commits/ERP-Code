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

export async function requireAdmin(event: HandlerEvent): Promise<RequireAdminResult> {
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

  const { data: isSuperAdmin, error: superAdminError } = await supabaseUser.rpc('current_user_has_role', {
    role_code: 'super_admin',
  });

  const { data: isAdminRole, error: adminError } = await supabaseUser.rpc('current_user_has_role', {
    role_code: 'admin',
  });

  if (superAdminError || adminError) {
    return {
      error: json(500, { error: superAdminError?.message || adminError?.message }),
    };
  }

  if (!Boolean(isSuperAdmin || isAdminRole)) {
    return {
      error: json(403, { error: 'Only Admin and Super Admin users can perform this action.' }),
    };
  }

  return {
    supabaseAdmin,
  };
}

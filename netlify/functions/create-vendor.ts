import type { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type CreateVendorRequest = {
  name?: string;
  vendorCode?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  contactName?: string;
};

function json(statusCode: number, body: unknown): HandlerResponse {
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

async function requireAdmin(event: HandlerEvent): Promise<RequireAdminResult> {
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
      error: json(403, { error: 'Only Admin and Super Admin users can create vendors.' }),
    };
  }

  return {
    supabaseAdmin,
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  const adminResult = await requireAdmin(event);

  if ('error' in adminResult) {
    return adminResult.error;
  }

  const payload = JSON.parse(event.body || '{}') as CreateVendorRequest;
  const name = payload.name?.trim();

  if (!name) {
    return json(400, { error: 'Vendor name is required.' });
  }

  const { data, error } = await adminResult.supabaseAdmin
    .from('vendors')
    .insert({
      name,
      vendor_code: payload.vendorCode?.trim() || null,
      email: payload.email?.trim().toLowerCase() || null,
      phone: payload.phone?.trim() || null,
      gstin: payload.gstin?.trim() || null,
      pan: payload.pan?.trim() || null,
      contact_name: payload.contactName?.trim() || null,
      status: 'active',
    })
    .select('id,name')
    .single();

  if (error) {
    return json(400, { error: error.message });
  }

  return json(200, {
    message: `Created vendor ${data.name}.`,
    vendorId: data.id,
  });
};

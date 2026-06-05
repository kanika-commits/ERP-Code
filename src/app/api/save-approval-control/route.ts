import { jsonResponse, requireServerAdmin } from '@/lib/serverAccess';

type ApprovalPayload = {
  action?: string;
  companyId?: string;
  enabled?: boolean;
  moduleCode?: string;
  notes?: string;
  roleCode?: string;
  siteId?: string;
};

export async function POST(request: Request) {
  const access = await requireServerAdmin(request);
  if ('error' in access) return access.error;

  const payload = (await request.json()) as ApprovalPayload;

  if (!payload.companyId || !payload.moduleCode || !payload.roleCode || !payload.action) {
    return jsonResponse(400, { error: 'Company, module, role, and action are required.' });
  }

  const { data: role, error: roleError } = await access.supabaseAdmin
    .from('roles')
    .select('id,code,name')
    .eq('code', payload.roleCode)
    .single();

  if (roleError || !role) {
    return jsonResponse(404, { error: `Role not found: ${payload.roleCode}.` });
  }

  const { error } = await access.supabaseAdmin.from('approval_controls').upsert(
    {
      action: payload.action,
      company_id: payload.companyId,
      created_by: access.actorId,
      enabled: payload.enabled ?? true,
      module_code: payload.moduleCode,
      notes: payload.notes?.trim() || null,
      role_id: role.id,
      site_id: payload.siteId || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'company_id,module_code,site_id,role_id,action' },
  );

  if (error) {
    return jsonResponse(400, { error: error.message });
  }

  return jsonResponse(200, { message: `Saved ${payload.action} control for ${role.name}.` });
}

import { jsonResponse, requireServerAdmin } from '@/lib/serverAccess';

type AssignAccessPayload = {
  companyIds?: string[];
  email?: string;
  moduleCodes?: string[];
  roleCode?: string;
  siteIds?: string[];
};

export async function POST(request: Request) {
  const access = await requireServerAdmin(request);
  if ('error' in access) return access.error;

  const payload = (await request.json()) as AssignAccessPayload;
  const email = payload.email?.trim().toLowerCase();
  const roleCode = payload.roleCode?.trim();
  const companyIds = payload.companyIds ?? [];
  const siteIds = payload.siteIds ?? [];
  const moduleCodes = payload.moduleCodes ?? [];

  if (!email || !roleCode || !companyIds.length || !moduleCodes.length) {
  return jsonResponse(400, { error: 'Email, role, at least one company, and at least one module are required.' });
}

  const { data: users, error: usersError } = await access.supabaseAdmin.auth.admin.listUsers();

  if (usersError) {
    return jsonResponse(400, { error: usersError.message });
  }

  const target = users.users.find((user) => user.email?.toLowerCase() === email);

  if (!target) {
    return jsonResponse(404, { error: `No Supabase Auth user found for ${email}.` });
  }

  const { data: role, error: roleError } = await access.supabaseAdmin.from('roles').select('id,code,name').eq('code', roleCode).single();

  if (roleError || !role) {
    return jsonResponse(404, { error: `Role not found: ${roleCode}.` });
  }

  const companyRows = companyIds.map((companyId) => ({
    company_id: companyId,
    created_by: access.actorId,
    status: 'active',
    user_id: target.id,
  }));

  const { error: companyError } = await access.supabaseAdmin
    .from('user_company_assignments')
    .upsert(companyRows, { onConflict: 'user_id,company_id' });

  if (companyError) {
    return jsonResponse(400, { error: companyError.message });
  }

  if (siteIds.length) {
    const { data: sites, error: sitesError } = await access.supabaseAdmin
      .from('sites')
      .select('id,company_id')
      .in('id', siteIds);

    if (sitesError) {
      return jsonResponse(400, { error: sitesError.message });
    }

    const siteRows = (sites ?? []).map((site) => ({
      company_id: site.company_id,
      created_by: access.actorId,
      site_id: site.id,
      status: 'active',
      user_id: target.id,
    }));

    const { error: siteError } = await access.supabaseAdmin
      .from('user_site_assignments')
      .upsert(siteRows, { onConflict: 'user_id,site_id' });

    if (siteError) {
      return jsonResponse(400, { error: siteError.message });
    }
  }

const scopeRows = companyIds.flatMap((companyId) =>
  moduleCodes.map((moduleCode) => ({
    company_id: companyId,
    created_by: access.actorId,
    module_code: moduleCode,
    role_id: role.id,
    scope_id: companyId,
    scope_type: 'company',
    status: 'active',
    user_id: target.id,
  })),
);

  return moduleCodes.map((moduleCode) => ({
    company_id: companyId,
    created_by: access.actorId,
    module_code: moduleCode,
    role_id: role.id,
    scope_id: companyId,
    scope_type: 'company',
    status: 'active',
    user_id: target.id,
  }));
});

  const { error: assignmentError } = await access.supabaseAdmin.from('user_access_assignments').upsert(scopeRows);

  if (assignmentError) {
    return jsonResponse(400, { error: assignmentError.message });
  }

  const { error: roleAssignError } = await access.supabaseAdmin.from('user_roles').upsert({
    role_id: role.id,
    scope_id: companyIds[0],
    scope_type: 'company',
    user_id: target.id,
  });

  if (roleAssignError) {
    return jsonResponse(400, { error: roleAssignError.message });
  }

  return jsonResponse(200, { message: `Assigned ${role.name} access to ${email}.` });
}

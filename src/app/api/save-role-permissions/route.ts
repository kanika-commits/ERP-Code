import { jsonResponse, requireServerAdmin } from '@/lib/serverAccess';

type RolePermissionsPayload = {
  permissionCodes?: string[];
  roleCode?: string;
};

export async function POST(request: Request) {
  const access = await requireServerAdmin(request);
  if ('error' in access) return access.error;

  const payload = (await request.json()) as RolePermissionsPayload;
  const roleCode = payload.roleCode?.trim();
  const permissionCodes = payload.permissionCodes ?? [];

  if (!roleCode) {
    return jsonResponse(400, { error: 'Role is required.' });
  }

  if (['platform_owner', 'super_admin'].includes(roleCode) && !access.isPlatformOwner) {
    return jsonResponse(403, { error: 'Only the platform owner can change protected role permissions.' });
  }

  const { data: role, error: roleError } = await access.supabaseAdmin.from('roles').select('id,code').eq('code', roleCode).single();

  if (roleError || !role) {
    return jsonResponse(404, { error: `Role not found: ${roleCode}` });
  }

  const { error: deleteError } = await access.supabaseAdmin.from('role_permissions').delete().eq('role_id', role.id);

  if (deleteError) {
    return jsonResponse(400, { error: deleteError.message });
  }

  if (!permissionCodes.length) {
    return jsonResponse(200, { message: `Cleared permissions for ${role.code}.` });
  }

  const { data: permissions, error: permissionError } = await access.supabaseAdmin
    .from('permissions')
    .select('id,code')
    .in('code', permissionCodes);

  if (permissionError) {
    return jsonResponse(400, { error: permissionError.message });
  }

  const rows = (permissions ?? []).map((permission) => ({
    effect: 'allow',
    permission_id: permission.id,
    role_id: role.id,
  }));

  const { error: insertError } = await access.supabaseAdmin.from('role_permissions').insert(rows);

  if (insertError) {
    return jsonResponse(400, { error: insertError.message });
  }

  return jsonResponse(200, { message: `Saved ${rows.length} permissions for ${role.code}.` });
}

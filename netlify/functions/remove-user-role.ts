import type { Handler } from '@netlify/functions';
import { requireAdmin, json } from '../../src/lib/adminFunction';

type RemoveRoleRequest = {
  roleCode?: string;
  userId?: string;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  const adminResult = await requireAdmin(event);

  if ('error' in adminResult) return adminResult.error;

  const { supabaseAdmin } = adminResult;
  const payload = JSON.parse(event.body || '{}') as RemoveRoleRequest;
  const userId = payload.userId?.trim();
  const roleCode = payload.roleCode?.trim();

  if (!userId || !roleCode) {
    return json(400, { error: 'User and role are required.' });
  }

  if (['platform_owner', 'super_admin'].includes(roleCode)) {
    return json(403, { error: 'Platform Owner and Super Admin roles cannot be removed from this screen.' });
  }

  const { data: role, error: roleError } = await supabaseAdmin.from('roles').select('id,code').eq('code', roleCode).single();

  if (roleError || !role) {
    return json(404, { error: `Role not found: ${roleCode}` });
  }

  const { error: removeError } = await supabaseAdmin.from('user_roles').delete().eq('user_id', userId).eq('role_id', role.id);

  if (removeError) {
    return json(500, { error: removeError.message });
  }

  return json(200, { message: `Removed ${role.code} role.` });
};

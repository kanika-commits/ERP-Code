import type { Handler } from '@netlify/functions';
import { requireAdmin, json } from '../../src/lib/adminFunction';

type RemoveRoleRequest = {
  roleCode?: string;
  userId?: string;
};

type RoleRow = {
  role_id: string;
  roles:
    | {
        code: string;
      }
    | {
        code: string;
      }[]
    | null;
};

function normalizeRole(row: RoleRow) {
  return Array.isArray(row.roles) ? row.roles[0] ?? null : row.roles;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  const adminResult = await requireAdmin(event);

  if ('error' in adminResult) return adminResult.error;

  const { supabaseAdmin } = adminResult;

const authHeader = event.headers.authorization || event.headers.Authorization || '';
const token = authHeader.replace('Bearer ', '');

const {
  data: { user },
  error: authError,
} = await supabaseAdmin.auth.getUser(token);

if (authError || !user) {
  return json(401, { error: 'Could not verify current user.' });
}
  const payload = JSON.parse(event.body || '{}') as RemoveRoleRequest;
  const userId = payload.userId?.trim();
  const roleCode = payload.roleCode?.trim();

  if (!userId || !roleCode) {
    return json(400, { error: 'User and role are required.' });
  }

  const { data: requesterRoles, error: requesterRoleError } = await supabaseAdmin
    .from('user_roles')
    .select('role_id,roles(code)')
    .eq('user_id', user.id);

  if (requesterRoleError) {
    return json(500, { error: requesterRoleError.message });
  }

  const requesterIsPlatformOwner = ((requesterRoles ?? []) as RoleRow[]).some((row) => {
    const role = normalizeRole(row);
    return role?.code === 'platform_owner';
  });

  if (['platform_owner', 'super_admin'].includes(roleCode) && !requesterIsPlatformOwner) {
    return json(403, { error: 'Only Platform Owner can remove protected roles.' });
  }

  if (roleCode === 'platform_owner') {
    const { count, error: countError } = await supabaseAdmin
      .from('user_roles')
      .select('id,roles!inner(code)', { count: 'exact', head: true })
      .eq('roles.code', 'platform_owner');

    if (countError) {
      return json(500, { error: countError.message });
    }

    if ((count ?? 0) <= 1) {
      return json(403, { error: 'Cannot remove the last Platform Owner.' });
    }

    if (userId === user.id) {
      return json(403, { error: 'You cannot remove your own Platform Owner role.' });
    }
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

import { jsonResponse, requireServerAdmin } from '@/lib/serverAccess';

type RolePayload = {
  description?: string;
  name?: string;
  roleCode?: string;
};

function slugifyRole(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export async function POST(request: Request) {
  const access = await requireServerAdmin(request);
  if ('error' in access) return access.error;

  const payload = (await request.json()) as RolePayload;
  const name = payload.name?.trim();
  const code = slugifyRole(payload.roleCode || payload.name || '');

  if (!name || !code) {
    return jsonResponse(400, { error: 'Role name is required.' });
  }

  if (['platform_owner', 'super_admin'].includes(code) && !access.isPlatformOwner) {
    return jsonResponse(403, { error: 'Only the platform owner can manage protected roles.' });
  }

  const { data, error } = await access.supabaseAdmin
    .from('roles')
    .upsert({
      code,
      created_by: access.actorId,
      description: payload.description?.trim() || null,
      is_system: false,
      name,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'code' })
    .select('id,code,name')
    .single();

  if (error) {
    return jsonResponse(400, { error: error.message });
  }

  return jsonResponse(200, {
    message: `Saved role ${data.name}.`,
    role: data,
  });
}

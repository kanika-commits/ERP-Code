import { jsonResponse, requireServerAdmin } from '@/lib/serverAccess';

type SitePayload = {
  address?: string;
  companyId?: string;
  location?: string;
  name?: string;
  siteCode?: string;
  siteId?: string;
  status?: string;
};

export async function POST(request: Request) {
  const access = await requireServerAdmin(request);
  if ('error' in access) return access.error;

  const payload = (await request.json()) as SitePayload;
  const name = payload.name?.trim();

  if (!name || !payload.companyId) {
    return jsonResponse(400, { error: 'Site name and company are required.' });
  }

  const row = {
    address: payload.address?.trim() || null,
    company_id: payload.companyId,
    created_by: access.actorId,
    location: payload.location?.trim() || null,
    name,
    site_code: payload.siteCode?.trim() || null,
    status: payload.status || 'active',
    updated_at: new Date().toISOString(),
  };

  const query = payload.siteId
    ? access.supabaseAdmin.from('sites').update(row).eq('id', payload.siteId).select('id,name').single()
    : access.supabaseAdmin.from('sites').insert(row).select('id,name').single();

  const { data, error } = await query;

  if (error) {
    return jsonResponse(400, { error: error.message });
  }

  return jsonResponse(200, {
    message: `Saved site ${data.name}.`,
    siteId: data.id,
  });
}

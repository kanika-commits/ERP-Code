import type { Handler } from '@netlify/functions';
import { json, requireAdmin } from '../../src/lib/adminFunction';

type CreateSiteRequest = {
  name?: string;
  siteCode?: string;
  location?: string;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  const adminResult = await requireAdmin(event);

  if ('error' in adminResult) {
    return adminResult.error;
  }

  const payload = JSON.parse(event.body || '{}') as CreateSiteRequest;
  const name = payload.name?.trim();

  if (!name) {
    return json(400, { error: 'Site name is required.' });
  }

  const { data, error } = await adminResult.supabaseAdmin
    .from('sites')
    .insert({
      name,
      site_code: payload.siteCode?.trim() || null,
      location: payload.location?.trim() || null,
      status: 'active',
    })
    .select('id,name')
    .single();

  if (error) {
    return json(400, { error: error.message });
  }

  return json(200, {
    message: `Created site ${data.name}.`,
    siteId: data.id,
  });
};

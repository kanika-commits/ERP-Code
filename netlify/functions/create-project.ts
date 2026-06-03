import type { Handler } from '@netlify/functions';
import { json, requireAdmin } from '../../src/lib/adminFunction';

type CreateProjectRequest = {
  name?: string;
  projectCode?: string;
  siteId?: string;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  const adminResult = await requireAdmin(event);

  if ('error' in adminResult) {
    return adminResult.error;
  }

  const payload = JSON.parse(event.body || '{}') as CreateProjectRequest;
  const name = payload.name?.trim();

  if (!name || !payload.siteId) {
    return json(400, { error: 'Project name and site are required.' });
  }

  const { data, error } = await adminResult.supabaseAdmin
    .from('projects')
    .insert({
      name,
      project_code: payload.projectCode?.trim() || null,
      site_id: payload.siteId,
      status: 'active',
    })
    .select('id,name')
    .single();

  if (error) {
    return json(400, { error: error.message });
  }

  return json(200, {
    message: `Created project ${data.name}.`,
    projectId: data.id,
  });
};

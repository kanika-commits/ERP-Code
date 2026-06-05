import type { Handler } from '@netlify/functions';
import { requirePlatformOwner, json } from '../../src/lib/adminFunction';

type UpdateCompanyModuleRequest = {
  companyId?: string;
  enabled?: boolean;
  moduleCode?: string;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  const ownerResult = await requirePlatformOwner(event);

  if ('error' in ownerResult) return ownerResult.error;

  const { supabaseAdmin } = ownerResult;
  const payload = JSON.parse(event.body || '{}') as UpdateCompanyModuleRequest;
  const companyId = payload.companyId?.trim();
  const moduleCode = payload.moduleCode?.trim();

  if (!companyId || !moduleCode || typeof payload.enabled !== 'boolean') {
    return json(400, { error: 'Company, module, and enabled status are required.' });
  }

  const { data: moduleRow, error: moduleError } = await supabaseAdmin
    .from('erp_modules')
    .select('id,module_code')
    .eq('module_code', moduleCode)
    .single();

  if (moduleError || !moduleRow) {
    return json(404, { error: `Module not found: ${moduleCode}` });
  }

  const { error: upsertError } = await supabaseAdmin
    .from('company_modules')
    .upsert(
      {
        company_id: companyId,
        enabled: payload.enabled,
        module_id: moduleRow.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id,module_id' },
    );

  if (upsertError) {
    return json(500, { error: upsertError.message });
  }

  return json(200, {
    enabled: payload.enabled,
    message: `${moduleRow.module_code} ${payload.enabled ? 'enabled' : 'disabled'}.`,
  });
};

import { jsonResponse, requireServerAdmin } from '@/lib/serverAccess';

type CompanyPayload = {
  companyCode?: string;
  companyId?: string;
  emailDomain?: string;
  legalName?: string;
  name?: string;
  status?: string;
};

export async function POST(request: Request) {
  const access = await requireServerAdmin(request);
  if ('error' in access) return access.error;

  if (!access.isPlatformOwner) {
    return jsonResponse(403, { error: 'Only the ERP platform owner can create or edit companies.' });
  }

  const payload = (await request.json()) as CompanyPayload;
  const name = payload.name?.trim();
  const companyCode = payload.companyCode?.trim().toLowerCase();

  if (!name || (!payload.companyId && !companyCode)) {
    return jsonResponse(400, { error: 'Company name and code are required.' });
  }

  const row = {
    company_code: companyCode,
    email_domain: payload.emailDomain?.trim().toLowerCase() || null,
    legal_name: payload.legalName?.trim() || name,
    name,
    status: payload.status || 'active',
    updated_at: new Date().toISOString(),
  };

  const query = payload.companyId
    ? access.supabaseAdmin.from('companies').update(row).eq('id', payload.companyId).select('id,name').single()
    : access.supabaseAdmin.from('companies').insert(row).select('id,name').single();

  const { data, error } = await query;

  if (error) {
    return jsonResponse(400, { error: error.message });
  }

  return jsonResponse(200, {
    companyId: data.id,
    message: `Saved company ${data.name}.`,
  });
}

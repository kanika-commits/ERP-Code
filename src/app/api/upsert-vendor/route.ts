import { jsonResponse, requireServerAdmin } from '@/lib/serverAccess';

type VendorPayload = {
  address?: string;
  bankStatus?: string;
  companyId?: string;
  complianceNotes?: string;
  contactName?: string;
  email?: string;
  gstStatus?: string;
  gstin?: string;
  name?: string;
  pan?: string;
  panStatus?: string;
  phone?: string;
  status?: string;
  vendorCode?: string;
  vendorId?: string;
  vendorType?: string;
};

export async function POST(request: Request) {
  const access = await requireServerAdmin(request);
  if ('error' in access) return access.error;

  const payload = (await request.json()) as VendorPayload;
  const name = payload.name?.trim();

  if (!name || !payload.companyId) {
    return jsonResponse(400, { error: 'Vendor name and company are required.' });
  }

  const row = {
    address: payload.address?.trim() || null,
    bank_status: payload.bankStatus || 'pending',
    company_id: payload.companyId,
    compliance_notes: payload.complianceNotes?.trim() || null,
    contact_name: payload.contactName?.trim() || null,
    created_by: access.actorId,
    email: payload.email?.trim().toLowerCase() || null,
    gst_status: payload.gstStatus || 'pending',
    gstin: payload.gstin?.trim() || null,
    name,
    pan: payload.pan?.trim() || null,
    pan_status: payload.panStatus || 'pending',
    phone: payload.phone?.trim() || null,
    status: payload.status || 'active',
    updated_at: new Date().toISOString(),
    vendor_code: payload.vendorCode?.trim() || null,
    vendor_type: payload.vendorType?.trim() || null,
  };

  const query = payload.vendorId
    ? access.supabaseAdmin.from('vendors').update(row).eq('id', payload.vendorId).select('id,name').single()
    : access.supabaseAdmin.from('vendors').insert(row).select('id,name').single();

  const { data, error } = await query;

  if (error) {
    return jsonResponse(400, { error: error.message });
  }

  return jsonResponse(200, {
    message: `Saved vendor ${data.name}.`,
    vendorId: data.id,
  });
}

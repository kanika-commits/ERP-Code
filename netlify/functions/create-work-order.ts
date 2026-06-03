import type { Handler } from '@netlify/functions';
import { json, requireAdmin } from '../../src/lib/adminFunction';

type CreateWorkOrderRequest = {
  basicValue?: string;
  description?: string;
  folderUrl?: string;
  gstAmount?: string;
  projectId?: string;
  siteId?: string;
  totalValue?: string;
  vendorId?: string;
  woNumber?: string;
  woType?: string;
};

function numberFromInput(value: string | undefined) {
  if (!value) return 0;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  const adminResult = await requireAdmin(event);

  if ('error' in adminResult) {
    return adminResult.error;
  }

  const payload = JSON.parse(event.body || '{}') as CreateWorkOrderRequest;
  const woNumber = payload.woNumber?.trim();

  if (!woNumber || !payload.siteId || !payload.vendorId) {
    return json(400, { error: 'Work order number, site, and vendor are required.' });
  }

  const basicValue = numberFromInput(payload.basicValue);
  const gstAmount = numberFromInput(payload.gstAmount);
  const providedTotalValue = numberFromInput(payload.totalValue);
  const totalValue = providedTotalValue || basicValue + gstAmount;

  const { data, error } = await adminResult.supabaseAdmin
    .from('work_orders')
    .insert({
      basic_value: basicValue,
      description: payload.description?.trim() || null,
      folder_url: payload.folderUrl?.trim() || null,
      gst_amount: gstAmount,
      project_id: payload.projectId || null,
      site_id: payload.siteId,
      status: 'active',
      total_value: totalValue,
      vendor_id: payload.vendorId,
      work_order_number: woNumber,
      wo_number: woNumber,
      wo_type: payload.woType?.trim() || null,
    })
    .select('id,wo_number')
    .single();

  if (error) {
    return json(400, { error: error.message });
  }

  return json(200, {
    message: `Created work order ${data.wo_number}.`,
    workOrderId: data.id,
  });
};

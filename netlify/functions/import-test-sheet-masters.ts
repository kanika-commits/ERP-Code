import type { Handler } from '@netlify/functions';
import { json, requireAdmin } from '../../src/lib/adminFunction';

const TEST_SHEET_ID = '1rjstRZLn3TDufBtayI5rL-cyMbFS1Fu-aszBM9zPty0';

type CsvRow = Record<string, string>;

function normalizeKey(value: string | null | undefined) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function clean(value: string | null | undefined) {
  const text = String(value || '').trim();
  if (!text || text === '#N/A') return '';
  return text;
}

function numberFromSheet(value: string | null | undefined) {
  const text = clean(value).replace(/,/g, '');
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ',' && !quoted) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(current);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current || row.length) {
    row.push(current);
    if (row.some((cell) => cell.trim())) rows.push(row);
  }

  const headers = (rows.shift() || []).map((header) => header.trim());
  return rows.map((cells) =>
    headers.reduce<CsvRow>((record, header, index) => {
      record[header] = cells[index] || '';
      return record;
    }, {}),
  );
}

async function fetchSheet(sheetName: string) {
  const url = `https://docs.google.com/spreadsheets/d/${TEST_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Could not read ${sheetName}: ${response.statusText}`);
  }

  return parseCsv(await response.text());
}

function contractorFromSummary(row: CsvRow) {
  return {
    name: clean(row['Contractor Name']),
    vendor_type: clean(row['Contractor Type']),
    contact_name: clean(row['Contact Person']),
    phone: clean(row['Contact Number']),
    email: clean(row.Email).toLowerCase(),
    pan: clean(row.PAN),
    gstin: clean(row.GSTIN),
  };
}

function contractorFromProfile(row: CsvRow) {
  return {
    name: clean(row['Contractor Name']),
    vendor_type: clean(row['Contractor Type']),
    contact_name: clean(row['Contact Person']),
    phone: clean(row['Contact Number']),
    email: clean(row.Email).toLowerCase(),
    pan: clean(row.PAN),
    gstin: clean(row.GSTIN),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  const adminResult = await requireAdmin(event);

  if ('error' in adminResult) {
    return adminResult.error;
  }

  try {
    const [summaryRows, contractorRows] = await Promise.all([fetchSheet('Summary'), fetchSheet('Contractor Info')]);
    const supabaseAdmin = adminResult.supabaseAdmin;

    const { data: existingSites, error: siteLoadError } = await supabaseAdmin.from('sites').select('id,name');
    if (siteLoadError) throw siteLoadError;

    const siteByKey = new Map((existingSites || []).map((site) => [normalizeKey(site.name), site.id]));
    let sitesCreated = 0;

    for (const row of summaryRows) {
      const siteName = clean(row['Site Name']);
      const key = normalizeKey(siteName);
      if (!siteName || siteByKey.has(key)) continue;

      const { data, error } = await supabaseAdmin
        .from('sites')
        .insert({
          name: siteName,
          status: clean(row.Status) || 'active',
        })
        .select('id')
        .single();

      if (error) throw error;
      siteByKey.set(key, data.id);
      sitesCreated += 1;
    }

    const vendorCandidates = new Map<string, ReturnType<typeof contractorFromProfile>>();

    for (const row of summaryRows) {
      const vendor = contractorFromSummary(row);
      if (vendor.name) vendorCandidates.set(normalizeKey(vendor.name), vendor);
    }

    for (const row of contractorRows) {
      const vendor = contractorFromProfile(row);
      if (vendor.name) vendorCandidates.set(normalizeKey(vendor.name), vendor);
    }

    const { data: existingVendors, error: vendorLoadError } = await supabaseAdmin.from('vendors').select('id,name');
    if (vendorLoadError) throw vendorLoadError;

    const vendorByKey = new Map((existingVendors || []).map((vendor) => [normalizeKey(vendor.name), vendor.id]));
    let vendorsCreated = 0;
    let vendorsUpdated = 0;

    for (const [key, vendor] of vendorCandidates.entries()) {
      const existingId = vendorByKey.get(key);
      const payload = {
        contact_name: vendor.contact_name || null,
        email: vendor.email || null,
        gstin: vendor.gstin || null,
        name: vendor.name,
        pan: vendor.pan || null,
        phone: vendor.phone || null,
        status: 'active',
        vendor_code: null,
      };

      if (existingId) {
        const { error } = await supabaseAdmin.from('vendors').update(payload).eq('id', existingId);
        if (error) throw error;
        vendorsUpdated += 1;
        continue;
      }

      const { data, error } = await supabaseAdmin.from('vendors').insert(payload).select('id').single();
      if (error) throw error;
      vendorByKey.set(key, data.id);
      vendorsCreated += 1;
    }

    const { data: existingWorkOrders, error: workOrderLoadError } = await supabaseAdmin.from('work_orders').select('id,wo_number,work_order_number');
    if (workOrderLoadError) throw workOrderLoadError;

    const workOrderByKey = new Map(
      (existingWorkOrders || []).map((workOrder) => [normalizeKey(workOrder.wo_number || workOrder.work_order_number), workOrder.id]),
    );
    let workOrdersCreated = 0;
    let workOrdersUpdated = 0;

    for (const row of summaryRows) {
      const woNumber = clean(row['WO Number']);
      const siteId = siteByKey.get(normalizeKey(row['Site Name']));
      const vendorId = vendorByKey.get(normalizeKey(row['Contractor Name']));

      if (!woNumber || !siteId || !vendorId) continue;

      const payload = {
        basic_value: numberFromSheet(row['WO Basic Value']),
        description: clean(row['Description of Work']) || null,
        folder_url: clean(row['Folder Link']) || null,
        gst_amount: numberFromSheet(row.GST),
        site_id: siteId,
        status: clean(row.Status) || 'active',
        total_value: numberFromSheet(row['Total Value of WO']),
        vendor_id: vendorId,
        work_order_number: woNumber,
        wo_number: woNumber,
        wo_type: clean(row['WO Type']) || null,
      };

      const existingId = workOrderByKey.get(normalizeKey(woNumber));
      if (existingId) {
        const { error } = await supabaseAdmin.from('work_orders').update(payload).eq('id', existingId);
        if (error) throw error;
        workOrdersUpdated += 1;
        continue;
      }

      const { data, error } = await supabaseAdmin.from('work_orders').insert(payload).select('id').single();
      if (error) throw error;
      workOrderByKey.set(normalizeKey(woNumber), data.id);
      workOrdersCreated += 1;
    }

    return json(200, {
      message: 'Imported copied sheet masters.',
      sitesCreated,
      vendorsCreated,
      vendorsUpdated,
      workOrdersCreated,
      workOrdersUpdated,
    });
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Import failed.' });
  }
};


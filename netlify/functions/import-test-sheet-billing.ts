import type { Handler } from '@netlify/functions';
import { json, requireAdmin } from '../../src/lib/adminFunction';

const TEST_SHEET_ID = '1rjstRZLn3TDufBtayI5rL-cyMbFS1Fu-aszBM9zPty0';

type CsvRow = Record<string, string>;
type InsertRow = Record<string, string | number | null>;

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

function isInsertRow(row: InsertRow | null): row is InsertRow {
  return row !== null;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    return String(record.message || record.details || record.hint || JSON.stringify(error));
  }
  return 'Billing import failed.';
}

function numberFromSheet(value: string | null | undefined) {
  const text = clean(value).replace(/,/g, '').replace(/%/g, '');
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value: string | null | undefined) {
  const text = clean(value);
  if (!text || text === '30-Dec-1899') return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const match = text.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (match) {
    const months: Record<string, string> = {
      jan: '01',
      feb: '02',
      mar: '03',
      apr: '04',
      may: '05',
      jun: '06',
      jul: '07',
      aug: '08',
      sep: '09',
      oct: '10',
      nov: '11',
      dec: '12',
    };
    const day = match[1].padStart(2, '0');
    const month = months[match[2].toLowerCase()];
    if (month) return `${match[3]}-${month}-${day}`;
  }

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`;
  }

  return null;
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

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  const adminResult = await requireAdmin(event);

  if ('error' in adminResult) {
    return adminResult.error;
  }

  try {
    const [raRows, invoiceRows, paymentRows, debitNoteRows] = await Promise.all([
      fetchSheet('RA Bills'),
      fetchSheet('Invoices'),
      fetchSheet('Payments'),
      fetchSheet('Debit Notes'),
    ]);

    const supabaseAdmin = adminResult.supabaseAdmin;
    const { data: workOrders, error: workOrderError } = await supabaseAdmin.from('work_orders').select('id,wo_number,work_order_number,vendor_id');
    if (workOrderError) throw workOrderError;

    const workOrderByNumber = new Map(
      (workOrders || []).map((workOrder) => [normalizeKey(workOrder.wo_number || workOrder.work_order_number), workOrder]),
    );

    const raBills: InsertRow[] = raRows
      .map<InsertRow | null>((row) => {
        const workOrder = workOrderByNumber.get(normalizeKey(row['WO Number']));
        if (!workOrder || !clean(row['RA Bill No.'])) return null;
        return {
          amount_payable: numberFromSheet(row['Amount Payable']),
          gst_amount: numberFromSheet(row['GST Amount']),
          gst_rate: numberFromSheet(row['GST Rate']),
          ra_bill_date: parseDate(row['RA Bill Date']),
          ra_bill_no: clean(row['RA Bill No.']),
          ra_bill_number: clean(row['RA Bill No.']),
          security_amount: numberFromSheet(row.Security),
          status: clean(row['Approved Remark']) || 'Approved',
          value_of_work_done: numberFromSheet(row['Value of Work Done']),
          work_order_id: workOrder.id,
        };
      })
      .filter(isInsertRow);

    const invoices: InsertRow[] = invoiceRows
      .map<InsertRow | null>((row) => {
        const workOrder = workOrderByNumber.get(normalizeKey(row['WO Number']));
        if (!workOrder || !clean(row['Invoice Number'])) return null;
        return {
          basic_value: numberFromSheet(row['Basic Value']),
          gst_amount: numberFromSheet(row.GST),
          gst_rate: numberFromSheet(row['GST Rate']),
          invoice_date: parseDate(row['Invoice Date']),
          invoice_number: clean(row['Invoice Number']),
          itc_status: clean(row['ITC Claimed']) || null,
          remarks: clean(row.Remarks) || null,
          total_amount: numberFromSheet(row['Total Amount']),
          vendor_id: workOrder.vendor_id,
          work_order_id: workOrder.id,
        };
      })
      .filter(isInsertRow);

    const payments: InsertRow[] = paymentRows
      .map<InsertRow | null>((row) => {
        const workOrder = workOrderByNumber.get(normalizeKey(row['WO Number']));
        if (!workOrder || !clean(row['Payment Date'])) return null;
        return {
          amount_transferred: numberFromSheet(row['Transferred Amount']),
          payment_date: parseDate(row['Payment Date']),
          tds_amount: numberFromSheet(row.TDS),
          total_payment: numberFromSheet(row['Total Payment']),
          vendor_id: workOrder.vendor_id,
          work_order_id: workOrder.id,
        };
      })
      .filter(isInsertRow);

    const debitNotes: InsertRow[] = debitNoteRows
      .map<InsertRow | null>((row) => {
        const workOrder = workOrderByNumber.get(normalizeKey(row['WO Number']));
        if (!workOrder || !clean(row['Debit Note Date'])) return null;
        return {
          debit_note_date: parseDate(row['Debit Note Date']),
          debit_note_type: clean(row['DN Type']) || null,
          reason: clean(row['Reasons for Debit Note']) || null,
          status: clean(row['Approved Remark']) || 'Approved',
          total_amount: numberFromSheet(row['Total Amount']),
          work_order_id: workOrder.id,
        };
      })
      .filter(isInsertRow);

    const workOrderIds = (workOrders || []).map((workOrder) => workOrder.id);

    if (workOrderIds.length) {
      const deleteResults = await Promise.all([
        supabaseAdmin.from('ra_bills').delete().in('work_order_id', workOrderIds),
        supabaseAdmin.from('invoices').delete().in('work_order_id', workOrderIds),
        supabaseAdmin.from('payments').delete().in('work_order_id', workOrderIds),
        supabaseAdmin.from('debit_notes').delete().in('work_order_id', workOrderIds),
      ]);

      const deleteError = deleteResults.find((result) => result.error)?.error;
      if (deleteError) {
        throw new Error(`Could not clear old billing rows: ${errorMessage(deleteError)}`);
      }
    }

    const insertResults = await Promise.all([
      raBills.length ? supabaseAdmin.from('ra_bills').insert(raBills) : Promise.resolve({ error: null }),
      invoices.length ? supabaseAdmin.from('invoices').insert(invoices) : Promise.resolve({ error: null }),
      payments.length ? supabaseAdmin.from('payments').insert(payments) : Promise.resolve({ error: null }),
      debitNotes.length ? supabaseAdmin.from('debit_notes').insert(debitNotes) : Promise.resolve({ error: null }),
    ]);

    const insertError = insertResults.find((result) => result.error)?.error;
    if (insertError) {
      throw new Error(`Could not insert billing rows: ${errorMessage(insertError)}`);
    }

    return json(200, {
      message: 'Imported copied sheet billing data.',
      raBillsImported: raBills.length,
      invoicesImported: invoices.length,
      paymentsImported: payments.length,
      debitNotesImported: debitNotes.length,
    });
  } catch (error) {
    return json(500, { error: errorMessage(error) });
  }
};

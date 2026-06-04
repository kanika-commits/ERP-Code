'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { supabase } from '@/lib/supabase';

type WorkOrderDetail = {
  id: string;
  basic_value: number;
  description: string | null;
  folder_url: string | null;
  gst_amount: number;
  status: string;
  total_value: number;
  wo_number: string;
  wo_type: string | null;
  projects:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
  sites:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
  vendors:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

type RaBill = {
  id: string;
  amount_payable: number;
  gst_amount: number;
  gst_rate: number;
  ra_bill_date: string | null;
  ra_bill_no: string;
  security_amount: number;
  status: string | null;
  value_of_work_done: number;
};

type Invoice = {
  id: string;
  basic_value: number;
  gst_amount: number;
  gst_rate: number;
  invoice_date: string | null;
  invoice_number: string;
  itc_status: string | null;
  total_amount: number;
};

type Payment = {
  id: string;
  amount_transferred: number;
  payment_date: string | null;
  tds_amount: number;
  total_payment: number;
};

type DebitNote = {
  id: string;
  debit_note_date: string | null;
  debit_note_type: string | null;
  reason: string | null;
  total_amount: number;
};

type WorkOrderFile = {
  id: string;
  file_name: string;
  mime_type: string | null;
  storage_provider: string;
  url: string;
};

function relationName<T extends { name: string }>(relation: T | T[] | null) {
  if (Array.isArray(relation)) return relation[0]?.name ?? '-';
  return relation?.name ?? '-';
}

function money(value: number | null | undefined) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
    style: 'currency',
    currency: 'INR',
  }).format(value ?? 0);
}

function shortDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function percent(value: number | null | undefined) {
  return `${value ?? 0}%`;
}

function sumBy<T>(rows: T[], getValue: (row: T) => number | null | undefined) {
  return rows.reduce((total, row) => total + (getValue(row) ?? 0), 0);
}

function LedgerTable({ columns, emptyLabel, rows }: { columns: string[]; emptyLabel: string; rows: string[][] }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, rowIndex) => (
              <tr key={`${row[0]}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>{emptyLabel}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function WorkOrderDetailPageContent() {
  const params = useParams<{ id: string }>();
  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null);
  const [raBills, setRaBills] = useState<RaBill[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
  const [files, setFiles] = useState<WorkOrderFile[]>([]);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadWorkOrder() {
      setLoading(true);
      setError('');

      const { data, error: workOrderError } = await supabase
        .from('work_orders')
        .select('id,wo_number,wo_type,description,folder_url,status,basic_value,gst_amount,total_value,projects(name),sites(name),vendors(name)')
        .eq('id', params.id)
        .single();

      if (workOrderError) {
        setError(workOrderError.message);
        setWorkOrder(null);
      } else {
        const [raResult, invoiceResult, paymentResult, debitNoteResult, fileResult] = await Promise.all([
          supabase
            .from('ra_bills')
            .select('id,ra_bill_no,ra_bill_date,value_of_work_done,security_amount,gst_rate,gst_amount,amount_payable,status')
            .eq('work_order_id', params.id)
            .order('ra_bill_date', { ascending: true }),
          supabase
            .from('invoices')
            .select('id,invoice_number,invoice_date,basic_value,gst_rate,gst_amount,total_amount,itc_status')
            .eq('work_order_id', params.id)
            .order('invoice_date', { ascending: true }),
          supabase
            .from('payments')
            .select('id,payment_date,amount_transferred,tds_amount,total_payment')
            .eq('work_order_id', params.id)
            .order('payment_date', { ascending: true }),
          supabase
            .from('debit_notes')
            .select('id,debit_note_date,debit_note_type,total_amount,reason')
            .eq('work_order_id', params.id)
            .order('debit_note_date', { ascending: true }),
          supabase
            .from('files')
            .select('id,file_name,mime_type,storage_provider,url')
            .eq('entity_type', 'work_order')
            .eq('entity_id', params.id)
            .order('file_name', { ascending: true }),
        ]);

        const ledgerError = raResult.error || invoiceResult.error || paymentResult.error || debitNoteResult.error || fileResult.error;
        if (ledgerError) {
          setError(ledgerError.message);
          setWorkOrder(null);
          setLoading(false);
          return;
        }

        setWorkOrder(data as WorkOrderDetail);
        setRaBills((raResult.data ?? []) as RaBill[]);
        setInvoices((invoiceResult.data ?? []) as Invoice[]);
        setPayments((paymentResult.data ?? []) as Payment[]);
        setDebitNotes((debitNoteResult.data ?? []) as DebitNote[]);
        const linkedFiles = (fileResult.data ?? []) as WorkOrderFile[];
        setFiles(linkedFiles);

        const signedUrls = await Promise.all(
          linkedFiles.map(async (file) => {
            if (file.storage_provider !== 'supabase_storage') {
              return [file.id, file.url] as const;
            }

            const { data: signedUrlData } = await supabase.storage.from('work-order-files').createSignedUrl(file.url, 10 * 60);
            return [file.id, signedUrlData?.signedUrl || ''] as const;
          }),
        );
        setFileUrls(Object.fromEntries(signedUrls.filter(([, url]) => Boolean(url))));
      }

      setLoading(false);
    }

    if (params.id) {
      loadWorkOrder();
    }
  }, [params.id]);

  if (loading) {
    return (
      <section className="page">
        <div className="card">Loading work order...</div>
      </section>
    );
  }

  if (error || !workOrder) {
    return (
      <section className="page">
        <div className="stack">
          <Link className="table-link" href="/work-orders">
            Back to Work Orders
          </Link>
          <div className="error">{error || 'Work order not found.'}</div>
        </div>
      </section>
    );
  }

  const raBillPayable = sumBy(raBills, (row) => row.amount_payable);
  const invoiceValue = sumBy(invoices, (row) => row.total_amount);
  const paymentValue = sumBy(payments, (row) => row.total_payment);
  const totalWorkDone = sumBy(raBills, (row) => row.value_of_work_done);
  const debitNoteValue = sumBy(debitNotes, (row) => row.total_amount);
  const generatedOn = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <section className="page">
      <div className="page-title page-title-row no-print">
        <div>
          <Link className="table-link" href="/work-orders">
            Back to Work Orders
          </Link>
          <h1>{workOrder.wo_number}</h1>
          <p>
            {relationName(workOrder.sites)} | {relationName(workOrder.vendors)} | {workOrder.wo_type || 'Work order'}
          </p>
        </div>
        <button className="ghost-button" onClick={() => window.print()} type="button">
          Download ledger
        </button>
      </div>

      <div className="stack ledger-print">
        <div className="ledger-header print-only">
          <div>
            <span>Work Order Ledger</span>
            <h1>{workOrder.wo_number}</h1>
            <p>
              {relationName(workOrder.sites)} | {relationName(workOrder.vendors)}
            </p>
          </div>
          <div>
            <strong>MRC ERP</strong>
            <span>Generated on {generatedOn}</span>
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <div>
              <h2>Work Order Summary</h2>
              <p>{workOrder.description || 'No description added yet.'}</p>
            </div>
            <span className="status-pill">{workOrder.status}</span>
          </div>

          <div className="summary-grid">
            <div className="summary-item">
              <span>Work Order Number</span>
              <strong>{workOrder.wo_number}</strong>
            </div>
            <div className="summary-item">
              <span>Site</span>
              <strong>{relationName(workOrder.sites)}</strong>
            </div>
            <div className="summary-item">
              <span>Project</span>
              <strong>{relationName(workOrder.projects)}</strong>
            </div>
            <div className="summary-item">
              <span>Vendor</span>
              <strong>{relationName(workOrder.vendors)}</strong>
            </div>
            <div className="summary-item">
              <span>Basic Value</span>
              <strong>{money(workOrder.basic_value)}</strong>
            </div>
            <div className="summary-item">
              <span>GST Amount</span>
              <strong>{money(workOrder.gst_amount)}</strong>
            </div>
            <div className="summary-item">
              <span>Total Value</span>
              <strong>{money(workOrder.total_value)}</strong>
            </div>
          </div>

          {workOrder.folder_url ? (
            <a className="table-link action-row" href={workOrder.folder_url} rel="noreferrer" target="_blank">
              Open work order folder
            </a>
          ) : null}
        </div>

        <div className="grid">
          <div className="card">
            <h2>RA Bills - Invoices</h2>
            <div className="metric">{money(raBillPayable - invoiceValue)}</div>
            <p>Total RA bill payable minus invoice value.</p>
          </div>
          <div className="card">
            <h2>RA Bills - Payments</h2>
            <div className="metric">{money(raBillPayable - paymentValue)}</div>
            <p>Total RA bill payable minus payments.</p>
          </div>
          <div className="card">
            <h2>Invoices - Payments</h2>
            <div className="metric">{money(invoiceValue - paymentValue)}</div>
            <p>Total invoice value minus payments.</p>
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <div>
              <h2>Ledger Totals</h2>
              <p>Billing totals for this work order.</p>
            </div>
            <span className="pill">{raBills.length + invoices.length + payments.length + debitNotes.length} entries</span>
          </div>

          <div className="summary-grid">
            <div className="summary-item">
              <span>Total Work Done</span>
              <strong>{money(totalWorkDone)}</strong>
            </div>
            <div className="summary-item">
              <span>Total Invoices</span>
              <strong>{money(invoiceValue)}</strong>
            </div>
            <div className="summary-item">
              <span>Total Payments</span>
              <strong>{money(paymentValue)}</strong>
            </div>
            <div className="summary-item">
              <span>Debit Notes</span>
              <strong>{money(debitNoteValue)}</strong>
            </div>
            <div className="summary-item">
              <span>RA Bills</span>
              <strong>{raBills.length}</strong>
            </div>
            <div className="summary-item">
              <span>Invoices</span>
              <strong>{invoices.length}</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <div>
              <h2>Attached Files</h2>
              <p>Work order PDFs, RA bill files, invoices, and contractor documents linked to this ledger.</p>
            </div>
            <span className="pill">{files.length} files</span>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Type</th>
                  <th>Storage</th>
                </tr>
              </thead>
              <tbody>
                {files.length ? (
                  files.map((file) => (
                    <tr key={file.id}>
                      <td>
                        <a className="table-link table-link-strong" href={fileUrls[file.id] || file.url} rel="noreferrer" target="_blank">
                          {file.file_name}
                        </a>
                      </td>
                      <td>{file.mime_type || '-'}</td>
                      <td>{file.storage_provider}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3}>No files linked yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <div>
              <h2>RA Bills</h2>
              <p>Approved and pending RA bill records for this work order.</p>
            </div>
            <span className="pill">{raBills.length} entries</span>
          </div>
          <LedgerTable
            columns={['RA Bill No.', 'Date', 'Value of Work Done', 'Security', 'GST Rate', 'GST Amount', 'Amount Payable']}
            emptyLabel="No RA bills added yet."
            rows={raBills.map((row) => [
              row.ra_bill_no,
              shortDate(row.ra_bill_date),
              money(row.value_of_work_done),
              money(row.security_amount),
              percent(row.gst_rate),
              money(row.gst_amount),
              money(row.amount_payable),
            ])}
          />
        </div>

        <div className="card">
          <div className="section-head">
            <div>
              <h2>Invoices</h2>
              <p>Vendor invoices and ITC status will appear here.</p>
            </div>
            <span className="pill">{invoices.length} entries</span>
          </div>
          <LedgerTable
            columns={['Invoice Number', 'Invoice Date', 'Basic Value', 'GST Rate', 'GST', 'Total Amount', 'ITC Claimed']}
            emptyLabel="No invoices added yet."
            rows={invoices.map((row) => [
              row.invoice_number,
              shortDate(row.invoice_date),
              money(row.basic_value),
              percent(row.gst_rate),
              money(row.gst_amount),
              money(row.total_amount),
              row.itc_status || '-',
            ])}
          />
        </div>

        <div className="card">
          <div className="section-head">
            <div>
              <h2>Payments</h2>
              <p>Payment and TDS entries will appear here.</p>
            </div>
            <span className="pill">{payments.length} entries</span>
          </div>
          <LedgerTable
            columns={['Payment Date', 'Vendor', 'Amount Transferred', 'TDS', 'Total Payment']}
            emptyLabel="No payments added yet."
            rows={payments.map((row) => [
              shortDate(row.payment_date),
              relationName(workOrder.vendors),
              money(row.amount_transferred),
              money(row.tds_amount),
              money(row.total_payment),
            ])}
          />
        </div>

        <div className="card">
          <div className="section-head">
            <div>
              <h2>Debit Notes</h2>
              <p>Debit note records and reasons will appear here.</p>
            </div>
            <span className="pill">{debitNotes.length} entries</span>
          </div>
          <LedgerTable
            columns={['Debit Note Date', 'DN Type', 'Total Amount', 'Reason']}
            emptyLabel="No debit notes added yet."
            rows={debitNotes.map((row) => [shortDate(row.debit_note_date), row.debit_note_type || '-', money(row.total_amount), row.reason || '-'])}
          />
        </div>
      </div>
    </section>
  );
}

export default function WorkOrderDetailPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <WorkOrderDetailPageContent />
        </main>
      )}
    </ProtectedPage>
  );
}

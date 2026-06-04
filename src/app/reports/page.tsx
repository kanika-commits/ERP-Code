'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { supabase } from '@/lib/supabase';

type Relation<T> = T | T[] | null;

type WorkOrderRow = {
  id: string;
  wo_number: string | null;
  status: string | null;
  total_value: number | null;
  folder_url: string | null;
  site_id: string | null;
  project_id: string | null;
  vendor_id: string | null;
  sites: Relation<{ name: string | null }>;
  projects: Relation<{ name: string | null }>;
  vendors: Relation<{ name: string | null }>;
};

type RaBillRow = {
  id: string;
  work_order_id: string | null;
  ra_bill_no: string | null;
  amount_payable: number | null;
};

type InvoiceRow = {
  id: string;
  work_order_id: string | null;
  vendor_id: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  basic_value: number | null;
  gst_rate: number | null;
  gst_amount: number | null;
  total_amount: number | null;
  itc_status: string | null;
};

type PaymentRow = {
  id: string;
  work_order_id: string | null;
  vendor_id: string | null;
  total_payment: number | null;
};

type DebitNoteRow = {
  id: string;
  work_order_id: string | null;
  total_amount: number | null;
  reason: string | null;
};

type VendorRow = {
  id: string;
  vendor_code: string | null;
  name: string;
  gstin: string | null;
  pan: string | null;
  status: string | null;
};

type FileRow = {
  id: string;
  entity_type: string | null;
  entity_id: string | null;
  file_name: string | null;
  mime_type: string | null;
};

type WorkOrderHealth = {
  debitTotal: number;
  exception: string;
  fileCount: number;
  invoiceTotal: number;
  paymentTotal: number;
  raTotal: number;
  wo: WorkOrderRow;
};

type DataState = {
  debitNotes: DebitNoteRow[];
  files: FileRow[];
  invoices: InvoiceRow[];
  payments: PaymentRow[];
  raBills: RaBillRow[];
  vendors: VendorRow[];
  workOrders: WorkOrderRow[];
};

const initialData: DataState = {
  debitNotes: [],
  files: [],
  invoices: [],
  payments: [],
  raBills: [],
  vendors: [],
  workOrders: [],
};

function relationName<T extends { name: string | null }>(relation: Relation<T>) {
  const row = Array.isArray(relation) ? relation[0] : relation;
  return row?.name || '-';
}

function sumByWorkOrder<T extends { work_order_id: string | null }>(
  rows: T[],
  valueSelector: (row: T) => number | null,
) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    if (!row.work_order_id) return acc;
    acc[row.work_order_id] = (acc[row.work_order_id] ?? 0) + Number(valueSelector(row) ?? 0);
    return acc;
  }, {});
}

function countByWorkOrder<T extends { work_order_id: string | null }>(rows: T[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    if (!row.work_order_id) return acc;
    acc[row.work_order_id] = (acc[row.work_order_id] ?? 0) + 1;
    return acc;
  }, {});
}

function money(value: number) {
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

function hasInvoiceFile(files: FileRow[], workOrderId: string) {
  return files.some((file) => {
    const name = file.file_name?.toLowerCase() ?? '';
    return file.entity_id === workOrderId && (name.includes('invoice') || name.includes('_ti_') || name.includes(' ti '));
  });
}

function hasRaFile(files: FileRow[], workOrderId: string) {
  return files.some((file) => {
    const name = file.file_name?.toLowerCase() ?? '';
    return file.entity_id === workOrderId && (name.includes('ra') || name.includes('vetting') || name.includes('bim'));
  });
}

function ReportsContent() {
  const [data, setData] = useState<DataState>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadReports() {
      setLoading(true);
      setError('');

      const [workOrders, raBills, invoices, payments, debitNotes, vendors, files] = await Promise.all([
        supabase
          .from('work_orders')
          .select('id,wo_number,status,total_value,folder_url,site_id,project_id,vendor_id,sites(name),projects(name),vendors(name)')
          .order('created_at', { ascending: false }),
        supabase.from('ra_bills').select('id,work_order_id,ra_bill_no,amount_payable'),
        supabase
          .from('invoices')
          .select('id,work_order_id,vendor_id,invoice_number,invoice_date,basic_value,gst_rate,gst_amount,total_amount,itc_status'),
        supabase.from('payments').select('id,work_order_id,vendor_id,total_payment'),
        supabase.from('debit_notes').select('id,work_order_id,total_amount,reason'),
        supabase.from('vendors').select('id,vendor_code,name,gstin,pan,status').order('name'),
        supabase.from('files').select('id,entity_type,entity_id,file_name,mime_type'),
      ]);

      if (!mounted) return;

      const firstError =
        workOrders.error || raBills.error || invoices.error || payments.error || debitNotes.error || vendors.error || files.error;

      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      setData({
        debitNotes: (debitNotes.data ?? []) as DebitNoteRow[],
        files: (files.data ?? []) as FileRow[],
        invoices: (invoices.data ?? []) as InvoiceRow[],
        payments: (payments.data ?? []) as PaymentRow[],
        raBills: (raBills.data ?? []) as RaBillRow[],
        vendors: (vendors.data ?? []) as VendorRow[],
        workOrders: (workOrders.data ?? []) as WorkOrderRow[],
      });
      setLoading(false);
    }

    loadReports();

    return () => {
      mounted = false;
    };
  }, []);

  const report = useMemo(() => {
    const raTotals = sumByWorkOrder(data.raBills, (row) => row.amount_payable);
    const invoiceTotals = sumByWorkOrder(data.invoices, (row) => row.total_amount);
    const paymentTotals = sumByWorkOrder(data.payments, (row) => row.total_payment);
    const debitTotals = sumByWorkOrder(data.debitNotes, (row) => row.total_amount);
    const raCounts = countByWorkOrder(data.raBills);
    const invoiceCounts = countByWorkOrder(data.invoices);
    const paymentCounts = countByWorkOrder(data.payments);

    const fileCounts = data.files.reduce<Record<string, number>>((acc, file) => {
      if (file.entity_type !== 'work_order' || !file.entity_id) return acc;
      acc[file.entity_id] = (acc[file.entity_id] ?? 0) + 1;
      return acc;
    }, {});

    const workOrderHealth = data.workOrders
      .map<WorkOrderHealth>((wo) => {
        const raTotal = raTotals[wo.id] ?? 0;
        const invoiceTotal = invoiceTotals[wo.id] ?? 0;
        const paymentTotal = paymentTotals[wo.id] ?? 0;
        const debitTotal = debitTotals[wo.id] ?? 0;
        const fileCount = fileCounts[wo.id] ?? 0;

        let exception = 'Healthy';
        if ((raCounts[wo.id] ?? 0) === 0) exception = 'No RA bills';
        else if ((invoiceCounts[wo.id] ?? 0) === 0 && raTotal > 0) exception = 'RA billed, invoice missing';
        else if ((paymentCounts[wo.id] ?? 0) === 0 && invoiceTotal > 0) exception = 'Invoice unpaid';
        else if (invoiceTotal > raTotal && invoiceTotal > 0) exception = 'Invoice exceeds RA payable';
        else if (paymentTotal > invoiceTotal - debitTotal && paymentTotal > 0) exception = 'Payment exceeds net invoice';
        else if (!fileCount) exception = 'No files attached';

        return {
          debitTotal,
          exception,
          fileCount,
          invoiceTotal,
          paymentTotal,
          raTotal,
          wo,
        };
      })
      .filter((row) => row.exception !== 'Healthy');

    const vendorTotals = data.vendors.map((vendor) => {
      const vendorWos = data.workOrders.filter((wo) => wo.vendor_id === vendor.id);
      const woIds = new Set(vendorWos.map((wo) => wo.id));
      const invoiceTotal = data.invoices
        .filter((invoice) => invoice.vendor_id === vendor.id || (invoice.work_order_id ? woIds.has(invoice.work_order_id) : false))
        .reduce((sum, invoice) => sum + Number(invoice.total_amount ?? 0), 0);
      const paymentTotal = data.payments
        .filter((payment) => payment.vendor_id === vendor.id || (payment.work_order_id ? woIds.has(payment.work_order_id) : false))
        .reduce((sum, payment) => sum + Number(payment.total_payment ?? 0), 0);
      const woTotal = vendorWos.reduce((sum, wo) => sum + Number(wo.total_value ?? 0), 0);

      return {
        invoiceTotal,
        missingMaster: !vendor.gstin || !vendor.pan,
        outstanding: invoiceTotal - paymentTotal,
        paymentTotal,
        vendor,
        woCount: vendorWos.length,
        woTotal,
      };
    });

    const documentExceptions = data.workOrders.flatMap((wo) => {
      const exceptions: Array<{ action: string; issue: string; reference: string; wo: WorkOrderRow }> = [];
      const invoiceCount = invoiceCounts[wo.id] ?? 0;
      const raCount = raCounts[wo.id] ?? 0;

      if (!wo.folder_url) {
        exceptions.push({ action: 'Add source folder', issue: 'Missing folder URL', reference: wo.wo_number ?? 'Work order', wo });
      }
      if (raCount > 0 && !hasRaFile(data.files, wo.id)) {
        exceptions.push({ action: 'Attach RA bill file', issue: 'RA bill files not detected', reference: wo.wo_number ?? 'Work order', wo });
      }
      if (invoiceCount > 0 && !hasInvoiceFile(data.files, wo.id)) {
        exceptions.push({ action: 'Attach invoice file', issue: 'Invoice files not detected', reference: wo.wo_number ?? 'Work order', wo });
      }
      return exceptions;
    });

    const taxExceptions = data.invoices.filter((invoice) => {
      const expectedGst = Number(invoice.basic_value ?? 0) * (Number(invoice.gst_rate ?? 0) / 100);
      const gstMismatch = Math.abs(expectedGst - Number(invoice.gst_amount ?? 0)) > 1;
      const itc = invoice.itc_status?.toLowerCase() ?? '';
      return gstMismatch || !invoice.invoice_date || !itc || itc.includes('pending') || itc.includes('not');
    });

    return {
      documentExceptions,
      taxExceptions,
      vendorTotals,
      workOrderHealth,
    };
  }, [data]);

  const openOutstanding = report.vendorTotals.filter((row) => row.outstanding > 0);
  const missingKyc = report.vendorTotals.filter((row) => row.missingMaster);

  return (
    <section className="page">
      <div className="page-title">
        <h1>Reports & Exceptions</h1>
        <p>Cross-module ERP checks across work orders, vendors, billing, payments, documents, GST, and ITC.</p>
      </div>

      <div className="module-summary-grid">
        <article className="summary-item">
          <span>Commercial exceptions</span>
          <strong>{report.workOrderHealth.length}</strong>
        </article>
        <article className="summary-item">
          <span>Document gaps</span>
          <strong>{report.documentExceptions.length}</strong>
        </article>
        <article className="summary-item">
          <span>Vendor KYC gaps</span>
          <strong>{missingKyc.length}</strong>
        </article>
        <article className="summary-item">
          <span>Tax / ITC checks</span>
          <strong>{report.taxExceptions.length}</strong>
        </article>
      </div>

      {loading ? <div className="notice">Loading reports...</div> : null}
      {error ? <div className="error">{error}</div> : null}

      {!loading && !error ? (
        <div className="stack">
          <div className="card">
            <div className="section-head">
              <div>
                <h2>Work Order Health</h2>
                <p>Commercial issues where RA bills, invoices, payments, debit notes, files, or folders do not line up.</p>
              </div>
              <span className="pill">{report.workOrderHealth.length} exceptions</span>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Work Order</th>
                    <th>Site / Project</th>
                    <th>Vendor</th>
                    <th>RA Payable</th>
                    <th>Invoices</th>
                    <th>Payments</th>
                    <th>Exception</th>
                  </tr>
                </thead>
                <tbody>
                  {report.workOrderHealth.length ? (
                    report.workOrderHealth.slice(0, 18).map((row) => (
                      <tr key={row.wo.id}>
                        <td>
                          <Link className="table-link table-link-strong" href={`/work-orders/${row.wo.id}`}>
                            {row.wo.wo_number || 'Open work order'}
                          </Link>
                        </td>
                        <td>
                          {relationName(row.wo.sites)}
                          <br />
                          <span className="muted-text">{relationName(row.wo.projects)}</span>
                        </td>
                        <td>{relationName(row.wo.vendors)}</td>
                        <td>{money(row.raTotal)}</td>
                        <td>{money(row.invoiceTotal)}</td>
                        <td>{money(row.paymentTotal)}</td>
                        <td><span className="exception-text">{row.exception}</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7}>No commercial exceptions detected.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid">
            <div className="card">
              <div className="section-head">
                <div>
                  <h2>Vendor Exposure</h2>
                  <p>Open payable exposure by vendor after payments.</p>
                </div>
                <span className="pill">{openOutstanding.length} open</span>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>WOs</th>
                      <th>Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openOutstanding.slice(0, 8).map((row) => (
                      <tr key={row.vendor.id}>
                        <td>{row.vendor.name}</td>
                        <td>{row.woCount}</td>
                        <td>{money(row.outstanding)}</td>
                      </tr>
                    ))}
                    {!openOutstanding.length ? (
                      <tr>
                        <td colSpan={3}>No open vendor outstanding.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="section-head">
                <div>
                  <h2>Master Data Quality</h2>
                  <p>Vendor records that need GSTIN or PAN cleanup.</p>
                </div>
                <span className="pill">{missingKyc.length} gaps</span>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Missing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missingKyc.slice(0, 8).map((row) => (
                      <tr key={row.vendor.id}>
                        <td>{row.vendor.name}</td>
                        <td>
                          {!row.vendor.gstin ? 'GSTIN ' : ''}
                          {!row.vendor.pan ? 'PAN' : ''}
                        </td>
                      </tr>
                    ))}
                    {!missingKyc.length ? (
                      <tr>
                        <td colSpan={2}>Vendor KYC masters look complete.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="section-head">
                <div>
                  <h2>Document Exceptions</h2>
                  <p>Folders or expected document categories that need review.</p>
                </div>
                <span className="pill">{report.documentExceptions.length} gaps</span>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.documentExceptions.slice(0, 8).map((row, index) => (
                      <tr key={`${row.wo.id}-${index}`}>
                        <td>
                          <Link className="table-link" href={`/work-orders/${row.wo.id}`}>
                            {row.reference}
                          </Link>
                        </td>
                        <td><span className="exception-text">{row.issue}</span></td>
                      </tr>
                    ))}
                    {!report.documentExceptions.length ? (
                      <tr>
                        <td colSpan={2}>No document exceptions detected.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="section-head">
              <div>
                <h2>GST / ITC Review</h2>
                <p>Invoices where GST, date, or ITC status should be checked by finance.</p>
              </div>
              <span className="pill">{report.taxExceptions.length} checks</span>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Date</th>
                    <th>Basic</th>
                    <th>GST</th>
                    <th>Total</th>
                    <th>ITC</th>
                  </tr>
                </thead>
                <tbody>
                  {report.taxExceptions.slice(0, 14).map((invoice) => (
                    <tr key={invoice.id}>
                      <td>{invoice.invoice_number || '-'}</td>
                      <td>{invoice.invoice_date || '-'}</td>
                      <td>{money(Number(invoice.basic_value ?? 0))}</td>
                      <td>{money(Number(invoice.gst_amount ?? 0))}</td>
                      <td>{money(Number(invoice.total_amount ?? 0))}</td>
                      <td><span className="status-pill">{invoice.itc_status || 'Review'}</span></td>
                    </tr>
                  ))}
                  {!report.taxExceptions.length ? (
                    <tr>
                      <td colSpan={6}>No GST or ITC exceptions detected.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <ReportsContent />
        </main>
      )}
    </ProtectedPage>
  );
}

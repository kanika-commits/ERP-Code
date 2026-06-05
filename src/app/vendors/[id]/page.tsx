'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { supabase } from '@/lib/supabase';

type Relation<T> = T | T[] | null;

type Vendor = {
  id: string;
  vendor_code: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  pan: string | null;
  contact_name: string | null;
  status: string;
};

type WorkOrder = {
  id: string;
  wo_number: string | null;
  status: string | null;
  basic_value: number | null;
  gst_amount: number | null;
  total_value: number | null;
  sites: Relation<{ name: string | null }>;
  projects: Relation<{ name: string | null }>;
};

type Invoice = {
  id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: number | null;
  itc_status: string | null;
  work_order_id: string | null;
};

type Payment = {
  id: string;
  payment_date: string | null;
  amount_transferred: number | null;
  tds_amount: number | null;
  total_payment: number | null;
  work_order_id: string | null;
};

type DebitNote = {
  id: string;
  debit_note_date: string | null;
  debit_note_type: string | null;
  total_amount: number | null;
  reason: string | null;
  work_order_id: string | null;
};

type FileRow = {
  id: string;
  entity_id: string | null;
  entity_type: string | null;
  file_name: string | null;
  url: string | null;
};

function relationName<T extends { name: string | null }>(relation: Relation<T>) {
  const row = Array.isArray(relation) ? relation[0] : relation;
  return row?.name || '-';
}

function money(value: number) {
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

function dateLabel(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function VendorDetailContent({ vendorId }: { vendorId: string }) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadVendorLedger() {
      setLoading(true);
      setError('');

      const vendorResult = await supabase
        .from('vendors')
        .select('id,vendor_code,name,email,phone,gstin,pan,contact_name,status')
        .eq('id', vendorId)
        .single();

      const workOrderResult = await supabase
        .from('work_orders')
        .select('id,wo_number,status,basic_value,gst_amount,total_value,sites(name),projects(name)')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (!mounted) return;

      if (vendorResult.error || workOrderResult.error) {
        setError(vendorResult.error?.message || workOrderResult.error?.message || 'Could not load vendor ledger.');
        setLoading(false);
        return;
      }

      const vendorWorkOrders = (workOrderResult.data ?? []) as WorkOrder[];
      const workOrderIds = vendorWorkOrders.map((wo) => wo.id);

      const [invoiceResult, paymentResult, debitResult, fileResult] = workOrderIds.length
        ? await Promise.all([
            supabase
              .from('invoices')
              .select('id,invoice_number,invoice_date,total_amount,itc_status,work_order_id')
              .in('work_order_id', workOrderIds)
              .order('invoice_date', { ascending: false }),
            supabase
              .from('payments')
              .select('id,payment_date,amount_transferred,tds_amount,total_payment,work_order_id')
              .in('work_order_id', workOrderIds)
              .order('payment_date', { ascending: false }),
            supabase
              .from('debit_notes')
              .select('id,debit_note_date,debit_note_type,total_amount,reason,work_order_id')
              .in('work_order_id', workOrderIds)
              .order('debit_note_date', { ascending: false }),
            supabase
              .from('files')
              .select('id,entity_id,entity_type,file_name,url')
              .eq('entity_type', 'work_order')
              .in('entity_id', workOrderIds),
          ])
        : [
            { data: [], error: null },
            { data: [], error: null },
            { data: [], error: null },
            { data: [], error: null },
          ];

      const loadError = invoiceResult.error || paymentResult.error || debitResult.error || fileResult.error;

      if (loadError) {
        setError(loadError.message);
      } else {
        setVendor(vendorResult.data as Vendor);
        setWorkOrders(vendorWorkOrders);
        setInvoices((invoiceResult.data ?? []) as Invoice[]);
        setPayments((paymentResult.data ?? []) as Payment[]);
        setDebitNotes((debitResult.data ?? []) as DebitNote[]);
        setFiles((fileResult.data ?? []) as FileRow[]);
      }

      setLoading(false);
    }

    loadVendorLedger();

    return () => {
      mounted = false;
    };
  }, [vendorId]);

  const totals = useMemo(() => {
    const woTotal = workOrders.reduce((sum, wo) => sum + Number(wo.total_value ?? 0), 0);
    const invoiceTotal = invoices.reduce((sum, invoice) => sum + Number(invoice.total_amount ?? 0), 0);
    const paymentTotal = payments.reduce((sum, payment) => sum + Number(payment.total_payment ?? 0), 0);
    const debitTotal = debitNotes.reduce((sum, note) => sum + Number(note.total_amount ?? 0), 0);
    return {
      debitTotal,
      invoiceTotal,
      outstanding: invoiceTotal - paymentTotal - debitTotal,
      paymentTotal,
      woTotal,
    };
  }, [debitNotes, invoices, payments, workOrders]);

  const workOrderMap = useMemo(
    () => new Map(workOrders.map((workOrder) => [workOrder.id, workOrder.wo_number || 'Work order'])),
    [workOrders],
  );

  return (
    <section className="page">
      <div className="page-title">
        <h1>{vendor?.name ?? 'Vendor Ledger'}</h1>
        <p>Vendor master, commercial exposure, payments, debit notes, and linked work order documents.</p>
      </div>

      {loading ? <div className="notice">Loading vendor ledger...</div> : null}
      {error ? <div className="error">{error}</div> : null}

      {!loading && !error && vendor ? (
        <div className="stack">
          <div className="grid">
            <article className="card">
              <h2>Vendor Master</h2>
              <p>{vendor.contact_name || 'No contact name'} · {vendor.email || vendor.phone || 'No contact detail'}</p>
              <div className="metric">{vendor.status}</div>
            </article>
            <article className="card">
              <h2>KYC</h2>
              <p>GSTIN: {vendor.gstin || 'Missing'} · PAN: {vendor.pan || 'Missing'}</p>
              <div className="metric">{vendor.gstin && vendor.pan ? 'Complete' : 'Review'}</div>
            </article>
            <article className="card">
              <h2>Outstanding</h2>
              <p>Invoice total minus payments and debit notes.</p>
              <div className="metric">{money(totals.outstanding)}</div>
            </article>
          </div>

          <div className="module-summary-grid">
            <article className="summary-item">
              <span>Work order value</span>
              <strong>{money(totals.woTotal)}</strong>
            </article>
            <article className="summary-item">
              <span>Invoice value</span>
              <strong>{money(totals.invoiceTotal)}</strong>
            </article>
            <article className="summary-item">
              <span>Payments</span>
              <strong>{money(totals.paymentTotal)}</strong>
            </article>
            <article className="summary-item">
              <span>Debit notes</span>
              <strong>{money(totals.debitTotal)}</strong>
            </article>
          </div>

          <div className="card">
            <div className="section-head">
              <div>
                <h2>Work Orders</h2>
                <p>All contracts currently linked to this vendor.</p>
              </div>
              <span className="pill">{workOrders.length} work orders</span>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Work Order</th>
                    <th>Site</th>
                    <th>Project</th>
                    <th>Value</th>
                    <th>Files</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.length ? (
                    workOrders.map((workOrder) => (
                      <tr key={workOrder.id}>
                        <td>
                          <Link className="table-link table-link-strong" href={`/work-orders/${workOrder.id}`}>
                            {workOrder.wo_number || 'Open work order'}
                          </Link>
                        </td>
                        <td>{relationName(workOrder.sites)}</td>
                        <td>{relationName(workOrder.projects)}</td>
                        <td>{money(Number(workOrder.total_value ?? 0))}</td>
                        <td>{files.filter((file) => file.entity_id === workOrder.id).length}</td>
                        <td><span className="status-pill">{workOrder.status || 'active'}</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>No work orders linked to this vendor.</td>
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
                  <h2>Invoices</h2>
                  <p>Vendor invoice records across linked work orders.</p>
                </div>
                <span className="pill">{invoices.length} entries</span>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>WO</th>
                      <th>Date</th>
                      <th>Total</th>
                      <th>ITC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.slice(0, 10).map((invoice) => (
                      <tr key={invoice.id}>
                        <td>{invoice.invoice_number || '-'}</td>
                        <td>{invoice.work_order_id ? workOrderMap.get(invoice.work_order_id) : '-'}</td>
                        <td>{dateLabel(invoice.invoice_date)}</td>
                        <td>{money(Number(invoice.total_amount ?? 0))}</td>
                        <td><span className="status-pill">{invoice.itc_status || 'Review'}</span></td>
                      </tr>
                    ))}
                    {!invoices.length ? (
                      <tr>
                        <td colSpan={5}>No invoices linked to this vendor.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="section-head">
                <div>
                  <h2>Payments</h2>
                  <p>Payment and TDS movement for this vendor.</p>
                </div>
                <span className="pill">{payments.length} entries</span>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>WO</th>
                      <th>TDS</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, 10).map((payment) => (
                      <tr key={payment.id}>
                        <td>{dateLabel(payment.payment_date)}</td>
                        <td>{payment.work_order_id ? workOrderMap.get(payment.work_order_id) : '-'}</td>
                        <td>{money(Number(payment.tds_amount ?? 0))}</td>
                        <td>{money(Number(payment.total_payment ?? 0))}</td>
                      </tr>
                    ))}
                    {!payments.length ? (
                      <tr>
                        <td colSpan={4}>No payments linked to this vendor.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="section-head">
                <div>
                  <h2>Debit Notes</h2>
                  <p>Adjustments issued against linked work orders.</p>
                </div>
                <span className="pill">{debitNotes.length} entries</span>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>WO</th>
                      <th>Type</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debitNotes.slice(0, 10).map((note) => (
                      <tr key={note.id}>
                        <td>{dateLabel(note.debit_note_date)}</td>
                        <td>{note.work_order_id ? workOrderMap.get(note.work_order_id) : '-'}</td>
                        <td>{note.debit_note_type || '-'}</td>
                        <td>{money(Number(note.total_amount ?? 0))}</td>
                      </tr>
                    ))}
                    {!debitNotes.length ? (
                      <tr>
                        <td colSpan={4}>No debit notes linked to this vendor.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function VendorDetailPage() {
  const params = useParams<{ id: string }>();

  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <VendorDetailContent vendorId={params.id} />
        </main>
      )}
    </ProtectedPage>
  );
}

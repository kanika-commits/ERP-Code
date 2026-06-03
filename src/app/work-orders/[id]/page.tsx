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

function EmptyLedgerTable({ columns, label }: { columns: string[]; label: string }) {
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
          <tr>
            <td colSpan={columns.length}>{label}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function WorkOrderDetailPageContent() {
  const params = useParams<{ id: string }>();
  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null);
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
        setWorkOrder(data as WorkOrderDetail);
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

  return (
    <section className="page">
      <div className="page-title page-title-row">
        <div>
          <Link className="table-link" href="/work-orders">
            Back to Work Orders
          </Link>
          <h1>{workOrder.wo_number}</h1>
          <p>
            {relationName(workOrder.sites)} | {relationName(workOrder.vendors)} | {workOrder.wo_type || 'Work order'}
          </p>
        </div>
        <button className="ghost-button" disabled type="button">
          Download ledger
        </button>
      </div>

      <div className="stack">
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
            <div className="metric">{money(0)}</div>
            <p>Total RA bill payable minus invoice value.</p>
          </div>
          <div className="card">
            <h2>RA Bills - Payments</h2>
            <div className="metric">{money(0)}</div>
            <p>Total RA bill payable minus payments.</p>
          </div>
          <div className="card">
            <h2>Invoices - Payments</h2>
            <div className="metric">{money(0)}</div>
            <p>Total invoice value minus payments.</p>
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <div>
              <h2>RA Bills</h2>
              <p>Approved and pending RA bill records will appear here after import or entry.</p>
            </div>
            <span className="pill">0 entries</span>
          </div>
          <EmptyLedgerTable columns={['RA Bill No.', 'Date', 'Value of Work Done', 'Security', 'GST Rate', 'GST Amount', 'Amount Payable']} label="No RA bills added yet." />
        </div>

        <div className="card">
          <div className="section-head">
            <div>
              <h2>Invoices</h2>
              <p>Vendor invoices and ITC status will appear here.</p>
            </div>
            <span className="pill">0 entries</span>
          </div>
          <EmptyLedgerTable columns={['Invoice Number', 'Invoice Date', 'Basic Value', 'GST Rate', 'GST', 'Total Amount', 'ITC Claimed']} label="No invoices added yet." />
        </div>

        <div className="card">
          <div className="section-head">
            <div>
              <h2>Payments</h2>
              <p>Payment and TDS entries will appear here.</p>
            </div>
            <span className="pill">0 entries</span>
          </div>
          <EmptyLedgerTable columns={['Payment Date', 'Vendor', 'Amount Transferred', 'TDS', 'Total Payment']} label="No payments added yet." />
        </div>

        <div className="card">
          <div className="section-head">
            <div>
              <h2>Debit Notes</h2>
              <p>Debit note records and reasons will appear here.</p>
            </div>
            <span className="pill">0 entries</span>
          </div>
          <EmptyLedgerTable columns={['Debit Note Date', 'DN Type', 'Total Amount', 'Reason']} label="No debit notes added yet." />
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


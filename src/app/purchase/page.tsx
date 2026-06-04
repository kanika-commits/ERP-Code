'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { money } from '@/components/LedgerModulePage';
import { supabase } from '@/lib/supabase';

type RelationName = { name: string } | { name: string }[] | null;

type WorkOrder = {
  basic_value: number | null;
  gst_amount: number | null;
  id: string;
  projects: RelationName;
  sites: RelationName;
  status: string;
  total_value: number | null;
  vendors: RelationName;
  wo_number: string;
  wo_type: string | null;
};

function relationName(relation: RelationName) {
  if (Array.isArray(relation)) return relation[0]?.name ?? '-';
  return relation?.name ?? '-';
}

function executionStage(index: number) {
  return ['PO draft', 'PO issued', 'Receipt pending', 'Bill matching'][index % 4];
}

function PurchaseContent() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPurchaseData() {
      setLoading(true);
      setError('');

      const { data, error: loadError } = await supabase
        .from('work_orders')
        .select('id,wo_number,wo_type,status,basic_value,gst_amount,total_value,projects(name),sites(name),vendors(name)')
        .order('created_at', { ascending: false })
        .limit(12);

      if (loadError) {
        setError(loadError.message);
      } else {
        setWorkOrders((data ?? []) as WorkOrder[]);
      }

      setLoading(false);
    }

    loadPurchaseData();
  }, []);

  const totalPoValue = useMemo(
    () => workOrders.reduce((total, workOrder) => total + Number(workOrder.total_value ?? 0), 0),
    [workOrders],
  );
  const gstValue = useMemo(
    () => workOrders.reduce((total, workOrder) => total + Number(workOrder.gst_amount ?? 0), 0),
    [workOrders],
  );

  return (
    <section className="page">
      <div className="page-title-row page-title">
        <div>
          <h1>Purchase</h1>
          <p>Purchase order, goods receipt, bill capture, and three-way match workflow shell.</p>
        </div>
        <Link className="ghost-button" href="/work-orders">
          Work orders
        </Link>
      </div>

      <div className="module-summary-grid">
        <div className="summary-item">
          <span>PO workspace</span>
          <strong>{workOrders.length}</strong>
        </div>
        <div className="summary-item">
          <span>PO value</span>
          <strong>{money(totalPoValue)}</strong>
        </div>
        <div className="summary-item">
          <span>GST component</span>
          <strong>{money(gstValue)}</strong>
        </div>
        <div className="summary-item">
          <span>Bill match</span>
          <strong>Shell</strong>
        </div>
      </div>

      <div className="stack">
        <div className="card">
          <div className="section-head">
            <div>
              <h2>Purchase Order Queue</h2>
              <p>Current work orders used as the purchase execution source until PO tables are added.</p>
            </div>
            <span className="pill">{workOrders.length} POs</span>
          </div>

          {loading ? <p>Loading purchase workspace...</p> : null}
          {error ? <div className="error">{error}</div> : null}

          {!loading && !error ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PO Reference</th>
                    <th>Vendor</th>
                    <th>Site</th>
                    <th>Project</th>
                    <th>PO Type</th>
                    <th>Total</th>
                    <th>Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.length ? (
                    workOrders.map((workOrder, index) => (
                      <tr key={workOrder.id}>
                        <td>
                          <Link className="table-link table-link-strong" href={`/work-orders/${workOrder.id}`}>
                            PO-{workOrder.wo_number}
                          </Link>
                          <br />
                          <span className="muted-text">{workOrder.status}</span>
                        </td>
                        <td>{relationName(workOrder.vendors)}</td>
                        <td>{relationName(workOrder.sites)}</td>
                        <td>{relationName(workOrder.projects)}</td>
                        <td>{workOrder.wo_type || '-'}</td>
                        <td>{money(workOrder.total_value ?? workOrder.basic_value)}</td>
                        <td>
                          <span className="status-pill">{executionStage(index)}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7}>No work orders available to seed purchase orders yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div className="card">
          <div className="section-head">
            <div>
              <h2>Receipt And Bill Flow</h2>
              <p>Shell views for GRN, bill registration, and payable handoff.</p>
            </div>
            <span className="pill">3 steps</span>
          </div>
          <div className="module-grid">
            <article className="module-card">
              <div className="module-card-head">
                <h3>Goods receipt</h3>
                <span className="module-status module-status-next">Next</span>
              </div>
              <p>Track delivered quantities, accepted quantities, shortages, and return notes.</p>
            </article>
            <article className="module-card">
              <div className="module-card-head">
                <h3>Vendor bill</h3>
                <span className="module-status module-status-planned">Planned</span>
              </div>
              <p>Capture bill number, bill date, GST split, attachments, and payable due date.</p>
            </article>
            <article className="module-card">
              <div className="module-card-head">
                <h3>Three-way match</h3>
                <span className="module-status module-status-planned">Planned</span>
              </div>
              <p>Compare PO value, receipt acceptance, and bill totals before finance approval.</p>
            </article>
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <div>
              <h2>Bill Matching Queue</h2>
              <p>Derived purchase records waiting for receipt and bill evidence.</p>
            </div>
            <span className="pill">{workOrders.length} records</span>
          </div>

          {!loading && !error ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>PO value</th>
                    <th>Receipt</th>
                    <th>Bill</th>
                    <th>Finance handoff</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.length ? (
                    workOrders.slice(0, 8).map((workOrder, index) => (
                      <tr key={workOrder.id}>
                        <td>PO-{workOrder.wo_number}</td>
                        <td>{money(workOrder.total_value ?? workOrder.basic_value)}</td>
                        <td>
                          <span className="status-pill">{index % 2 === 0 ? 'Pending GRN' : 'Partial receipt'}</span>
                        </td>
                        <td>
                          <span className="status-pill">{index % 3 === 0 ? 'Bill awaited' : 'Draft match'}</span>
                        </td>
                        <td>
                          <span className="status-pill">Not released</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>No purchase records ready for matching yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default function PurchasePage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <PurchaseContent />
        </main>
      )}
    </ProtectedPage>
  );
}

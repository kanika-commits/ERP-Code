'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { money } from '@/components/LedgerModulePage';
import { supabase } from '@/lib/supabase';

type RelationName = { name: string } | { name: string }[] | null;

type Vendor = {
  contact_name: string | null;
  email: string | null;
  id: string;
  name: string;
  phone: string | null;
  status: string;
  vendor_code: string | null;
};

type WorkOrder = {
  basic_value: number | null;
  description: string | null;
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

function stageFor(index: number) {
  return ['Draft RFQ', 'Vendor quotes due', 'Technical comparison', 'Commercial comparison'][index % 4];
}

function ProcurementContent() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProcurementData() {
      setLoading(true);
      setError('');

      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('id,vendor_code,name,email,phone,contact_name,status')
        .order('name', { ascending: true });

      const { data: workOrderData, error: workOrderError } = await supabase
        .from('work_orders')
        .select('id,wo_number,wo_type,description,status,basic_value,gst_amount,total_value,projects(name),sites(name),vendors(name)')
        .order('created_at', { ascending: false })
        .limit(8);

      if (vendorError || workOrderError) {
        setError(vendorError?.message || workOrderError?.message || 'Could not load procurement workspace.');
      } else {
        setVendors(vendorData ?? []);
        setWorkOrders((workOrderData ?? []) as WorkOrder[]);
      }

      setLoading(false);
    }

    loadProcurementData();
  }, []);

  const activeVendors = useMemo(() => vendors.filter((vendor) => vendor.status === 'active'), [vendors]);
  const comparisonValue = useMemo(
    () => workOrders.reduce((total, workOrder) => total + Number(workOrder.total_value ?? 0), 0),
    [workOrders],
  );

  return (
    <section className="page">
      <div className="page-title-row page-title">
        <div>
          <h1>Procurement</h1>
          <p>Vendor discovery, RFQ preparation, quote tracking, and comparison workflow shell.</p>
        </div>
        <Link className="ghost-button" href="/vendors">
          Vendor master
        </Link>
      </div>

      <div className="module-summary-grid">
        <div className="summary-item">
          <span>Registered vendors</span>
          <strong>{vendors.length}</strong>
        </div>
        <div className="summary-item">
          <span>Active vendors</span>
          <strong>{activeVendors.length}</strong>
        </div>
        <div className="summary-item">
          <span>RFQ queue</span>
          <strong>{workOrders.length}</strong>
        </div>
        <div className="summary-item">
          <span>Comparison value</span>
          <strong>{money(comparisonValue)}</strong>
        </div>
      </div>

      <div className="stack">
        <div className="card">
          <div className="section-head">
            <div>
              <h2>RFQ Pipeline</h2>
              <p>Seeded from current work orders until dedicated RFQ tables are introduced.</p>
            </div>
            <span className="pill">{workOrders.length} items</span>
          </div>

          {loading ? <p>Loading procurement workspace...</p> : null}
          {error ? <div className="error">{error}</div> : null}

          {!loading && !error ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>RFQ Reference</th>
                    <th>Site</th>
                    <th>Project</th>
                    <th>Scope</th>
                    <th>Budget</th>
                    <th>Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.length ? (
                    workOrders.map((workOrder, index) => (
                      <tr key={workOrder.id}>
                        <td>
                          <Link className="table-link table-link-strong" href={`/work-orders/${workOrder.id}`}>
                            RFQ-{workOrder.wo_number}
                          </Link>
                          <br />
                          <span className="muted-text">{relationName(workOrder.vendors)}</span>
                        </td>
                        <td>{relationName(workOrder.sites)}</td>
                        <td>{relationName(workOrder.projects)}</td>
                        <td>{workOrder.wo_type || workOrder.description || '-'}</td>
                        <td>{money(workOrder.total_value ?? workOrder.basic_value)}</td>
                        <td>
                          <span className="status-pill">{stageFor(index)}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>No work orders available to seed RFQs yet.</td>
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
              <h2>Vendor Shortlist</h2>
              <p>Existing vendor master entries available for RFQ circulation.</p>
            </div>
            <span className="pill">{activeVendors.length} active</span>
          </div>

          {!loading && !error ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Code</th>
                    <th>Primary contact</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.length ? (
                    vendors.slice(0, 10).map((vendor) => (
                      <tr key={vendor.id}>
                        <td>{vendor.name}</td>
                        <td>{vendor.vendor_code || '-'}</td>
                        <td>
                          {vendor.contact_name || '-'}
                          <br />
                          <span className="muted-text">{vendor.email || vendor.phone || ''}</span>
                        </td>
                        <td>
                          <span className="status-pill">{vendor.status}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>No vendors created yet.</td>
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
              <h2>Comparison Workflow</h2>
              <p>Operational shell for quotation normalization and award recommendation.</p>
            </div>
            <span className="pill">Shell</span>
          </div>
          <div className="module-grid">
            <article className="module-card">
              <div className="module-card-head">
                <h3>Technical review</h3>
                <span className="module-status module-status-next">Next</span>
              </div>
              <p>Validate compliance, delivery capacity, and exclusions before commercial opening.</p>
            </article>
            <article className="module-card">
              <div className="module-card-head">
                <h3>Commercial summary</h3>
                <span className="module-status module-status-planned">Planned</span>
              </div>
              <p>Compare landed totals, GST, freight, payment terms, and deviations.</p>
            </article>
            <article className="module-card">
              <div className="module-card-head">
                <h3>Award recommendation</h3>
                <span className="module-status module-status-planned">Planned</span>
              </div>
              <p>Prepare approval note before converting the selected quote into purchase execution.</p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ProcurementPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <ProcurementContent />
        </main>
      )}
    </ProtectedPage>
  );
}

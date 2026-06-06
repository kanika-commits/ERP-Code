'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { can, canAccessRecord } from '@/lib/accessControl';
import { supabase } from '@/lib/supabase';
import { useCurrentUserAccess } from '@/lib/useCurrentUserAccess';

type Company = {
  id: string;
  company_code: string | null;
  name: string;
};

type Site = {
  company_id: string | null;
  id: string;
  name: string;
  site_code: string | null;
  status: string;
};

type Project = {
  id: string;
  name: string;
  project_code: string | null;
  site_id: string | null;
  status: string;
};

type Vendor = {
  id: string;
  name: string;
  vendor_code: string | null;
};

type WorkOrder = {
  basic_value: number;
  company_id: string | null;
  description: string | null;
  folder_url: string | null;
  gst_amount: number;
  id: string;
  project_id: string | null;
  site_id: string | null;
  status: string;
  total_value: number;
  vendor_id: string | null;
  wo_number: string;
  wo_type: string | null;
};

type BillingSummary = {
  debitNotes: number;
  invoices: number;
  payments: number;
  raBills: number;
};

type AmountRow = {
  total_amount?: number | string | null;
  total_payment?: number | string | null;
  amount_payable?: number | string | null;
  work_order_id: string | null;
};

const emptySummary: BillingSummary = {
  debitNotes: 0,
  invoices: 0,
  payments: 0,
  raBills: 0,
};

function money(value: number | null | undefined) {
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value ?? 0);
}

function normalise(value: number | string | null | undefined) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function addRowsToSummary(
  current: Map<string, BillingSummary>,
  rows: AmountRow[] | null,
  key: keyof BillingSummary,
  amountField: 'amount_payable' | 'total_amount' | 'total_payment',
) {
  for (const row of rows ?? []) {
    if (!row.work_order_id) continue;
    const summary = current.get(row.work_order_id) ?? { ...emptySummary };
    summary[key] += normalise(row[amountField]);
    current.set(row.work_order_id, summary);
  }
}

function WorkOrderDashboard() {
  const access = useCurrentUserAccess();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [billingSummaries, setBillingSummaries] = useState<Record<string, BillingSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [billingImporting, setBillingImporting] = useState(false);
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [filterSiteId, setFilterSiteId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterVendorId, setFilterVendorId] = useState('');
  const [filterWoType, setFilterWoType] = useState('');
  const [search, setSearch] = useState('');
  const [woNumber, setWoNumber] = useState('');
  const [woType, setWoType] = useState('');
  const [woSiteId, setWoSiteId] = useState('');
  const [woProjectId, setWoProjectId] = useState('');
  const [woVendorId, setWoVendorId] = useState('');
  const [woBasicValue, setWoBasicValue] = useState('');
  const [woGstAmount, setWoGstAmount] = useState('');
  const [woTotalValue, setWoTotalValue] = useState('');
  const [woFolderUrl, setWoFolderUrl] = useState('');
  const [woDescription, setWoDescription] = useState('');

  const canViewWorkOrders = can(access, 'work_orders', 'view');
  const canAddWorkOrders = can(access, 'work_orders', 'add');

  const companyById = useMemo(() => new Map(companies.map((company) => [company.id, company])), [companies]);
  const siteById = useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites]);
  const vendorById = useMemo(() => new Map(vendors.map((vendor) => [vendor.id, vendor])), [vendors]);

  const accessibleWorkOrders = useMemo(
    () =>
      workOrders.filter((workOrder) => {
        const site = workOrder.site_id ? siteById.get(workOrder.site_id) : null;
        const companyId = workOrder.company_id || site?.company_id || null;
        return canAccessRecord(access, companyId, workOrder.site_id);
      }),
    [access, siteById, workOrders],
  );

  const filteredSites = useMemo(
    () => sites.filter((site) => !filterCompanyId || site.company_id === filterCompanyId),
    [filterCompanyId, sites],
  );

  const statuses = useMemo(
    () => Array.from(new Set(accessibleWorkOrders.map((workOrder) => workOrder.status).filter(Boolean))).sort(),
    [accessibleWorkOrders],
  );

  const woTypes = useMemo(
    () => Array.from(new Set(accessibleWorkOrders.map((workOrder) => workOrder.wo_type).filter(Boolean) as string[])).sort(),
    [accessibleWorkOrders],
  );

  const filteredWorkOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return accessibleWorkOrders.filter((workOrder) => {
      const site = workOrder.site_id ? siteById.get(workOrder.site_id) : null;
      const vendor = workOrder.vendor_id ? vendorById.get(workOrder.vendor_id) : null;
      const companyId = workOrder.company_id || site?.company_id || '';
      const matchesSearch =
        !query ||
        workOrder.wo_number.toLowerCase().includes(query) ||
        (vendor?.name ?? '').toLowerCase().includes(query);

      return (
        matchesSearch &&
        (!filterCompanyId || companyId === filterCompanyId) &&
        (!filterSiteId || workOrder.site_id === filterSiteId) &&
        (!filterStatus || workOrder.status === filterStatus) &&
        (!filterVendorId || workOrder.vendor_id === filterVendorId) &&
        (!filterWoType || workOrder.wo_type === filterWoType)
      );
    });
  }, [accessibleWorkOrders, filterCompanyId, filterSiteId, filterStatus, filterVendorId, filterWoType, search, siteById, vendorById]);

  const projectsForSelectedSite = projects.filter((project) => !woSiteId || project.site_id === woSiteId);

  async function loadDashboard() {
    setLoading(true);
    setError('');

    const [companyResult, siteResult, projectResult, vendorResult, workOrderResult, raBillResult, invoiceResult, paymentResult, debitNoteResult] =
      await Promise.all([
        supabase.from('companies').select('id,company_code,name').order('name', { ascending: true }),
        supabase.from('sites').select('id,company_id,site_code,name,status').order('name', { ascending: true }),
        supabase.from('projects').select('id,project_code,name,site_id,status').order('name', { ascending: true }),
        supabase.from('vendors').select('id,vendor_code,name').order('name', { ascending: true }),
        supabase
          .from('work_orders')
          .select('id,company_id,site_id,project_id,vendor_id,wo_number,wo_type,description,folder_url,status,basic_value,gst_amount,total_value')
          .order('created_at', { ascending: false }),
        supabase.from('ra_bills').select('work_order_id,amount_payable'),
        supabase.from('invoices').select('work_order_id,total_amount'),
        supabase.from('payments').select('work_order_id,total_payment'),
        supabase.from('debit_notes').select('work_order_id,total_amount'),
      ]);

    const firstError =
      companyResult.error ||
      siteResult.error ||
      projectResult.error ||
      vendorResult.error ||
      workOrderResult.error ||
      raBillResult.error ||
      invoiceResult.error ||
      paymentResult.error ||
      debitNoteResult.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    const summaries = new Map<string, BillingSummary>();
    addRowsToSummary(summaries, raBillResult.data, 'raBills', 'amount_payable');
    addRowsToSummary(summaries, invoiceResult.data, 'invoices', 'total_amount');
    addRowsToSummary(summaries, paymentResult.data, 'payments', 'total_payment');
    addRowsToSummary(summaries, debitNoteResult.data, 'debitNotes', 'total_amount');

    setCompanies(companyResult.data ?? []);
    setSites(siteResult.data ?? []);
    setProjects(projectResult.data ?? []);
    setVendors(vendorResult.data ?? []);
    setWorkOrders((workOrderResult.data ?? []) as WorkOrder[]);
    setBillingSummaries(Object.fromEntries(summaries));
    setWoSiteId((current) => current || siteResult.data?.[0]?.id || '');
    setWoVendorId((current) => current || vendorResult.data?.[0]?.id || '');
    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function createWorkOrder() {
    setMessage('');
    setCreateError('');

    if (!woNumber || !woSiteId || !woVendorId) {
      setCreateError('Work order number, site, and vendor are required.');
      return;
    }

    setCreating(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch('/api/create-work-order', {
      body: JSON.stringify({
        basicValue: woBasicValue,
        description: woDescription,
        folderUrl: woFolderUrl,
        gstAmount: woGstAmount,
        projectId: woProjectId,
        siteId: woSiteId,
        totalValue: woTotalValue,
        vendorId: woVendorId,
        woNumber,
        woType,
      }),
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    const result = (await response.json()) as { error?: string; message?: string };
    setCreating(false);

    if (!response.ok) {
      setCreateError(result.error ?? 'Could not create work order.');
      return;
    }

    setMessage(result.message ?? 'Work order created.');
    setWoNumber('');
    setWoType('');
    setWoProjectId('');
    setWoBasicValue('');
    setWoGstAmount('');
    setWoTotalValue('');
    setWoFolderUrl('');
    setWoDescription('');
    loadDashboard();
  }

  async function importTestSheetMasters() {
    setMessage('');
    setCreateError('');
    setImporting(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch('/api/import-test-sheet-masters', {
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
      method: 'POST',
    });

    const result = (await response.json()) as {
      error?: string;
      message?: string;
      sitesCreated?: number;
      vendorsCreated?: number;
      vendorsUpdated?: number;
      workOrdersCreated?: number;
      workOrdersUpdated?: number;
    };
    setImporting(false);

    if (!response.ok) {
      setCreateError(result.error ?? 'Could not import copied sheet.');
      return;
    }

    setMessage(
      `${result.message ?? 'Import complete'} Sites +${result.sitesCreated ?? 0}, vendors +${result.vendorsCreated ?? 0}/${result.vendorsUpdated ?? 0} updated, work orders +${result.workOrdersCreated ?? 0}/${result.workOrdersUpdated ?? 0} updated.`,
    );
    loadDashboard();
  }

  async function importTestSheetBilling() {
    setMessage('');
    setCreateError('');
    setBillingImporting(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch('/api/import-test-sheet-billing', {
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
      method: 'POST',
    });

    const result = (await response.json()) as {
      debitNotesImported?: number;
      error?: string;
      invoicesImported?: number;
      message?: string;
      paymentsImported?: number;
      raBillsImported?: number;
    };
    setBillingImporting(false);

    if (!response.ok) {
      setCreateError(result.error ?? 'Could not import billing data.');
      return;
    }

    setMessage(
      `${result.message ?? 'Billing import complete'} RA bills ${result.raBillsImported ?? 0}, invoices ${result.invoicesImported ?? 0}, payments ${result.paymentsImported ?? 0}, debit notes ${result.debitNotesImported ?? 0}.`,
    );
    loadDashboard();
  }

  return (
    <section className="page">
      <div className="page-title">
        <div>
          <h1>Work Order Dashboard</h1>
          <p>Commercial register for work orders, RA bills, invoices, payments, debit notes, and vendor dues.</p>
        </div>
        {canAddWorkOrders ? <a className="primary-button" href="#create-work-order">+ Create Work Order</a> : null}
      </div>

      {!access.loading && !canViewWorkOrders ? (
        <div className="card">
          <h2>Access restricted</h2>
          <p>You need work_orders.view permission to open the Work Order Dashboard.</p>
        </div>
      ) : (
        <div className="stack">
          <div className="card">
            <div className="section-head">
              <div>
                <h2>Work Order Register</h2>
                <p>Use filters to review commercial status across companies, sites, contractors, and work order types.</p>
              </div>
              <span className="pill">{filteredWorkOrders.length} work orders</span>
            </div>

            <div className="form-grid compact-filters">
              <div className="field">
                <label htmlFor="wo-search">Search WO / Vendor</label>
                <input
                  id="wo-search"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="WO number or vendor name"
                  value={search}
                />
              </div>
              <div className="field">
                <label htmlFor="filter-company">Company</label>
                <select
                  id="filter-company"
                  onChange={(event) => {
                    setFilterCompanyId(event.target.value);
                    setFilterSiteId('');
                  }}
                  value={filterCompanyId}
                >
                  <option value="">All companies</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="filter-site">Site</label>
                <select id="filter-site" onChange={(event) => setFilterSiteId(event.target.value)} value={filterSiteId}>
                  <option value="">All sites</option>
                  {filteredSites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="filter-status">Status</label>
                <select id="filter-status" onChange={(event) => setFilterStatus(event.target.value)} value={filterStatus}>
                  <option value="">All statuses</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="filter-vendor">Vendor</label>
                <select id="filter-vendor" onChange={(event) => setFilterVendorId(event.target.value)} value={filterVendorId}>
                  <option value="">All vendors</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="filter-wo-type">WO Type</label>
                <select id="filter-wo-type" onChange={(event) => setFilterWoType(event.target.value)} value={filterWoType}>
                  <option value="">All types</option>
                  {woTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading || access.loading ? <p>Loading work orders...</p> : null}
            {error ? <div className="error">{error}</div> : null}

            {!loading && !access.loading && !error ? (
              <div className="table-wrap">
                <table className="data-table commercial-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Site</th>
                      <th>WO Status</th>
                      <th>WO Number</th>
                      <th>Vendor / Contractor</th>
                      <th>WO Type</th>
                      <th>Description</th>
                      <th>WO Value</th>
                      <th>Total RA Bills</th>
                      <th>Total Invoice Value</th>
                      <th>Total Payments</th>
                      <th>Total Debit Notes</th>
                      <th>Amount Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkOrders.length ? (
                      filteredWorkOrders.map((workOrder) => {
                        const site = workOrder.site_id ? siteById.get(workOrder.site_id) : null;
                        const company = companyById.get(workOrder.company_id || site?.company_id || '');
                        const vendor = workOrder.vendor_id ? vendorById.get(workOrder.vendor_id) : null;
                        const summary = billingSummaries[workOrder.id] ?? emptySummary;
                        const amountDue = summary.raBills - summary.payments - summary.debitNotes;

                        return (
                          <tr key={workOrder.id}>
                            <td>{company?.name ?? '-'}</td>
                            <td>{site?.name ?? '-'}</td>
                            <td>
                              <span className="status-pill">{workOrder.status}</span>
                            </td>
                            <td>
                              <Link className="table-link table-link-strong" href={`/work-orders/${workOrder.id}`}>
                                {workOrder.wo_number}
                              </Link>
                            </td>
                            <td>{vendor?.name ?? '-'}</td>
                            <td>{workOrder.wo_type || '-'}</td>
                            <td className="description-cell">{workOrder.description || '-'}</td>
                            <td>{money(workOrder.total_value || workOrder.basic_value)}</td>
                            <td>{money(summary.raBills)}</td>
                            <td>{money(summary.invoices)}</td>
                            <td>{money(summary.payments)}</td>
                            <td>{money(summary.debitNotes)}</td>
                            <td>{money(amountDue)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={13}>No work orders found for the selected filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          {canAddWorkOrders ? (
            <div className="card" id="create-work-order">
              <h2>Create Work Order</h2>
              <div className="import-banner">
                <div>
                  <strong>Copied sheet import</strong>
                  <span>Import test vendors, sites, work orders, and billing ledgers from the copied Google Sheet.</span>
                </div>
                <div className="button-cluster">
                  <button className="ghost-button" disabled={importing || creating || billingImporting} onClick={importTestSheetMasters} type="button">
                    {importing ? 'Importing...' : 'Import masters'}
                  </button>
                  <button className="ghost-button" disabled={importing || creating || billingImporting} onClick={importTestSheetBilling} type="button">
                    {billingImporting ? 'Importing...' : 'Import billing'}
                  </button>
                </div>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label htmlFor="wo-number">Work order number</label>
                  <input id="wo-number" onChange={(event) => setWoNumber(event.target.value)} value={woNumber} />
                </div>
                <div className="field">
                  <label htmlFor="wo-type">Work order type</label>
                  <input id="wo-type" onChange={(event) => setWoType(event.target.value)} value={woType} />
                </div>
                <div className="field">
                  <label htmlFor="wo-site">Site</label>
                  <select
                    id="wo-site"
                    onChange={(event) => {
                      setWoSiteId(event.target.value);
                      setWoProjectId('');
                    }}
                    value={woSiteId}
                  >
                    <option value="">Select site</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="wo-project">Project</label>
                  <select id="wo-project" onChange={(event) => setWoProjectId(event.target.value)} value={woProjectId}>
                    <option value="">No project selected</option>
                    {projectsForSelectedSite.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="wo-vendor">Vendor</label>
                  <select id="wo-vendor" onChange={(event) => setWoVendorId(event.target.value)} value={woVendorId}>
                    <option value="">Select vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="wo-basic-value">Basic value</label>
                  <input id="wo-basic-value" inputMode="decimal" onChange={(event) => setWoBasicValue(event.target.value)} value={woBasicValue} />
                </div>
                <div className="field">
                  <label htmlFor="wo-gst">GST amount</label>
                  <input id="wo-gst" inputMode="decimal" onChange={(event) => setWoGstAmount(event.target.value)} value={woGstAmount} />
                </div>
                <div className="field">
                  <label htmlFor="wo-total">Total value</label>
                  <input id="wo-total" inputMode="decimal" onChange={(event) => setWoTotalValue(event.target.value)} value={woTotalValue} />
                </div>
                <div className="field field-wide">
                  <label htmlFor="wo-folder">Folder URL</label>
                  <input id="wo-folder" onChange={(event) => setWoFolderUrl(event.target.value)} value={woFolderUrl} />
                </div>
                <div className="field field-wide">
                  <label htmlFor="wo-description">Description</label>
                  <textarea id="wo-description" onChange={(event) => setWoDescription(event.target.value)} rows={3} value={woDescription} />
                </div>
              </div>
              <button className="primary-button action-row" disabled={creating} onClick={createWorkOrder} type="button">
                {creating ? 'Creating...' : 'Create work order'}
              </button>
              {message ? <div className="notice action-row">{message}</div> : null}
              {createError ? <div className="error action-row">{createError}</div> : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

export default function WorkOrdersPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <WorkOrderDashboard />
        </main>
      )}
    </ProtectedPage>
  );
}

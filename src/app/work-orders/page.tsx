'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { supabase } from '@/lib/supabase';
import { useCurrentUserAccess } from '@/lib/useCurrentUserAccess';

type Site = {
  id: string;
  site_code: string | null;
  name: string;
  location: string | null;
  status: string;
};

type Project = {
  id: string;
  project_code: string | null;
  name: string;
  site_id?: string | null;
  status: string;
  sites:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

type Vendor = {
  id: string;
  name: string;
  vendor_code: string | null;
};

type WorkOrder = {
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

function siteNameForProject(project: Project) {
  if (Array.isArray(project.sites)) return project.sites[0]?.name ?? '-';
  return project.sites?.name ?? '-';
}

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

function WorkOrderMasters() {
  const { isAdmin, loading: loadingAccess } = useCurrentUserAccess();
  const [sites, setSites] = useState<Site[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteCode, setSiteCode] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [projectSiteId, setProjectSiteId] = useState('');
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
  const [message, setMessage] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  async function loadMasters() {
    setLoading(true);
    setError('');

    const { data: siteData, error: siteError } = await supabase
      .from('sites')
      .select('id,site_code,name,location,status')
      .order('created_at', { ascending: false });

    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id,project_code,name,site_id,status,sites(name)')
      .order('created_at', { ascending: false });

    const { data: vendorData, error: vendorError } = await supabase
      .from('vendors')
      .select('id,vendor_code,name')
      .order('name', { ascending: true });

    const { data: workOrderData, error: workOrderError } = await supabase
      .from('work_orders')
      .select('id,wo_number,wo_type,description,folder_url,status,basic_value,gst_amount,total_value,projects(name),sites(name),vendors(name)')
      .order('created_at', { ascending: false });

    if (siteError || projectError || vendorError || workOrderError) {
      setError(siteError?.message || projectError?.message || vendorError?.message || workOrderError?.message || 'Could not load masters.');
    } else {
      setSites(siteData ?? []);
      setProjects((projectData ?? []) as Project[]);
      setVendors(vendorData ?? []);
      setWorkOrders((workOrderData ?? []) as WorkOrder[]);
      setProjectSiteId((current) => current || siteData?.[0]?.id || '');
      setWoSiteId((current) => current || siteData?.[0]?.id || '');
      setWoVendorId((current) => current || vendorData?.[0]?.id || '');
    }

    setLoading(false);
  }

  useEffect(() => {
    loadMasters();
  }, []);

  async function createSite() {
    setMessage('');
    setCreateError('');

    if (!siteName) {
      setCreateError('Site name is required.');
      return;
    }

    setCreating(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch('/.netlify/functions/create-site', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location: siteLocation,
        name: siteName,
        siteCode,
      }),
    });

    const result = (await response.json()) as { error?: string; message?: string };
    setCreating(false);

    if (!response.ok) {
      setCreateError(result.error ?? 'Could not create site.');
      return;
    }

    setMessage(result.message ?? 'Site created.');
    setSiteName('');
    setSiteCode('');
    setSiteLocation('');
    loadMasters();
  }

  async function createProject() {
    setMessage('');
    setCreateError('');

    if (!projectName || !projectSiteId) {
      setCreateError('Project name and site are required.');
      return;
    }

    setCreating(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch('/.netlify/functions/create-project', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        projectCode,
        siteId: projectSiteId,
      }),
    });

    const result = (await response.json()) as { error?: string; message?: string };
    setCreating(false);

    if (!response.ok) {
      setCreateError(result.error ?? 'Could not create project.');
      return;
    }

    setMessage(result.message ?? 'Project created.');
    setProjectName('');
    setProjectCode('');
    loadMasters();
  }

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

    const response = await fetch('/.netlify/functions/create-work-order', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
        'Content-Type': 'application/json',
      },
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
    loadMasters();
  }

  async function importTestSheetMasters() {
    setMessage('');
    setCreateError('');
    setImporting(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch('/.netlify/functions/import-test-sheet-masters', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
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
    loadMasters();
  }

  const projectsForSelectedSite = projects.filter((project) => !woSiteId || project.site_id === woSiteId);

  return (
    <section className="page">
      <div className="page-title">
        <h1>Work Orders</h1>
        <p>Create, review, and prepare work orders for billing and ledgers.</p>
      </div>

      <div className="stack">
        <div className="card">
          <div className="section-head">
            <div>
              <h2>Work Order Register</h2>
              <p>Live ERP work orders stored in Supabase.</p>
            </div>
            <span className="pill">{workOrders.length} work orders</span>
          </div>

          {loading ? <p>Loading work orders...</p> : null}
          {error ? <div className="error">{error}</div> : null}

          {!loading && !error ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>WO Number</th>
                    <th>Site</th>
                    <th>Project</th>
                    <th>Vendor</th>
                    <th>Type</th>
                    <th>Total Value</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.length ? (
                    workOrders.map((workOrder) => (
                      <tr key={workOrder.id}>
                        <td>
                          <Link className="table-link table-link-strong" href={`/work-orders/${workOrder.id}`}>
                            {workOrder.wo_number}
                          </Link>
                          {workOrder.folder_url ? (
                            <>
                              <br />
                              <a className="table-link" href={workOrder.folder_url} rel="noreferrer" target="_blank">
                                Folder
                              </a>
                            </>
                          ) : null}
                        </td>
                        <td>{relationName(workOrder.sites)}</td>
                        <td>{relationName(workOrder.projects)}</td>
                        <td>{relationName(workOrder.vendors)}</td>
                        <td>{workOrder.wo_type || '-'}</td>
                        <td>{money(workOrder.total_value)}</td>
                        <td>
                          <span className="status-pill">{workOrder.status}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7}>No work orders created yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div className="card">
          <h2>Create Work Order</h2>
          {loadingAccess ? <p>Checking admin access...</p> : null}
          {!loadingAccess && !isAdmin ? <p>Only Admin and Super Admin users can create work orders.</p> : null}
          {!loadingAccess && isAdmin ? (
            <>
              <div className="import-banner">
                <div>
                  <strong>Copied sheet import</strong>
                  <span>Import test vendors, sites, and work orders from the copied Google Sheet.</span>
                </div>
                <button className="ghost-button" disabled={importing || creating} onClick={importTestSheetMasters} type="button">
                  {importing ? 'Importing...' : 'Import test sheet'}
                </button>
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
            </>
          ) : null}
        </div>

        <div className="card">
          <div className="section-head">
            <div>
              <h2>Sites</h2>
              <p>Physical or operational locations where work orders are issued.</p>
            </div>
            <span className="pill">{sites.length} sites</span>
          </div>

          {loading ? <p>Loading sites...</p> : null}
          {error ? <div className="error">{error}</div> : null}

          {!loading && !error ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Code</th>
                    <th>Location</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.length ? (
                    sites.map((site) => (
                      <tr key={site.id}>
                        <td>{site.name}</td>
                        <td>{site.site_code || '-'}</td>
                        <td>{site.location || '-'}</td>
                        <td>
                          <span className="status-pill">{site.status}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>No sites created yet.</td>
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
              <h2>Projects</h2>
              <p>Projects belong to sites and will later contain work orders.</p>
            </div>
            <span className="pill">{projects.length} projects</span>
          </div>

          {!loading && !error ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Code</th>
                    <th>Site</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length ? (
                    projects.map((project) => (
                      <tr key={project.id}>
                        <td>{project.name}</td>
                        <td>{project.project_code || '-'}</td>
                        <td>{siteNameForProject(project)}</td>
                        <td>
                          <span className="status-pill">{project.status}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>No projects created yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div className="card">
          <h2>Create Site / Project</h2>
          {loadingAccess ? <p>Checking admin access...</p> : null}
          {!loadingAccess && !isAdmin ? <p>Only Admin and Super Admin users can create sites and projects.</p> : null}
          {!loadingAccess && isAdmin ? (
            <>
              <h3>New Site</h3>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="site-name">Site name</label>
                  <input id="site-name" onChange={(event) => setSiteName(event.target.value)} value={siteName} />
                </div>
                <div className="field">
                  <label htmlFor="site-code">Site code</label>
                  <input id="site-code" onChange={(event) => setSiteCode(event.target.value)} value={siteCode} />
                </div>
                <div className="field">
                  <label htmlFor="site-location">Location</label>
                  <input id="site-location" onChange={(event) => setSiteLocation(event.target.value)} value={siteLocation} />
                </div>
              </div>
              <button className="primary-button action-row" disabled={creating} onClick={createSite} type="button">
                {creating ? 'Creating...' : 'Create site'}
              </button>

              <h3>New Project</h3>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="project-name">Project name</label>
                  <input id="project-name" onChange={(event) => setProjectName(event.target.value)} value={projectName} />
                </div>
                <div className="field">
                  <label htmlFor="project-code">Project code</label>
                  <input id="project-code" onChange={(event) => setProjectCode(event.target.value)} value={projectCode} />
                </div>
                <div className="field">
                  <label htmlFor="project-site">Site</label>
                  <select id="project-site" onChange={(event) => setProjectSiteId(event.target.value)} value={projectSiteId}>
                    <option value="">Select site</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button className="primary-button action-row" disabled={creating} onClick={createProject} type="button">
                {creating ? 'Creating...' : 'Create project'}
              </button>

              {message ? <div className="notice">{message}</div> : null}
              {createError ? <div className="error">{createError}</div> : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default function WorkOrdersPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <WorkOrderMasters />
        </main>
      )}
    </ProtectedPage>
  );
}

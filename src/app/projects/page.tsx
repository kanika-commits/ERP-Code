'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { supabase } from '@/lib/supabase';

type RelationName = { name: string } | { name: string }[] | null;

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
  site_id: string | null;
  status: string;
  sites: RelationName;
};

type WorkOrder = {
  id: string;
  project_id: string | null;
  site_id: string | null;
  total_value: number | null;
};

const workflowAreas = [
  {
    description: 'Review site and project masters before opening the work order register for execution details.',
    href: '/work-orders',
    label: 'Project Setup',
    status: 'Open',
  },
  {
    description: 'Use work orders as the current execution layer for project scope, vendors, value, and ledgers.',
    href: '/work-orders',
    label: 'Execution Register',
    status: 'Open',
  },
  {
    description: 'Billing, invoices, payments, debit notes, and files are reached from each work order ledger.',
    href: '/work-orders',
    label: 'Commercial Tracking',
    status: 'Open',
  },
];

function relationName(relation: RelationName) {
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

function countBy(items: WorkOrder[], key: 'project_id' | 'site_id') {
  return items.reduce<Record<string, number>>((counts, item) => {
    const id = item[key];
    if (!id) return counts;
    counts[id] = (counts[id] ?? 0) + 1;
    return counts;
  }, {});
}

function valueBy(items: WorkOrder[], key: 'project_id' | 'site_id') {
  return items.reduce<Record<string, number>>((totals, item) => {
    const id = item[key];
    if (!id) return totals;
    totals[id] = (totals[id] ?? 0) + Number(item.total_value ?? 0);
    return totals;
  }, {});
}

function ProjectsContent() {
  const [sites, setSites] = useState<Site[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadProjects() {
      setLoading(true);
      setError('');

      const [siteResult, projectResult, workOrderResult] = await Promise.all([
        supabase.from('sites').select('id,site_code,name,location,status').order('created_at', { ascending: false }),
        supabase.from('projects').select('id,project_code,name,site_id,status,sites(name)').order('created_at', { ascending: false }),
        supabase.from('work_orders').select('id,project_id,site_id,total_value').order('created_at', { ascending: false }),
      ]);

      if (!mounted) return;

      if (siteResult.error || projectResult.error || workOrderResult.error) {
        setError(siteResult.error?.message || projectResult.error?.message || workOrderResult.error?.message || 'Could not load projects.');
      } else {
        setSites(siteResult.data ?? []);
        setProjects((projectResult.data ?? []) as Project[]);
        setWorkOrders((workOrderResult.data ?? []) as WorkOrder[]);
      }

      setLoading(false);
    }

    loadProjects();

    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const activeProjects = projects.filter((project) => project.status?.toLowerCase() === 'active').length;
    const activeSites = sites.filter((site) => site.status?.toLowerCase() === 'active').length;
    const totalValue = workOrders.reduce((total, workOrder) => total + Number(workOrder.total_value ?? 0), 0);

    return {
      activeProjects,
      activeSites,
      totalValue,
      workOrders: workOrders.length,
    };
  }, [projects, sites, workOrders]);

  const projectWorkOrderCounts = useMemo(() => countBy(workOrders, 'project_id'), [workOrders]);
  const projectWorkOrderValues = useMemo(() => valueBy(workOrders, 'project_id'), [workOrders]);
  const siteWorkOrderCounts = useMemo(() => countBy(workOrders, 'site_id'), [workOrders]);
  const siteWorkOrderValues = useMemo(() => valueBy(workOrders, 'site_id'), [workOrders]);
  const siteProjectCounts = useMemo(
    () =>
      projects.reduce<Record<string, number>>((counts, project) => {
        if (!project.site_id) return counts;
        counts[project.site_id] = (counts[project.site_id] ?? 0) + 1;
        return counts;
      }, {}),
    [projects],
  );

  return (
    <section className="page">
      <div className="page-title">
        <h1>Project Management</h1>
        <p>Track project and site masters, then move into work orders for execution, billing, and commercial follow-through.</p>
      </div>

      <div className="module-summary-grid">
        <div className="summary-item">
          <span>Projects</span>
          <strong>{loading ? '-' : projects.length}</strong>
        </div>
        <div className="summary-item">
          <span>Active Projects</span>
          <strong>{loading ? '-' : summary.activeProjects}</strong>
        </div>
        <div className="summary-item">
          <span>Sites</span>
          <strong>{loading ? '-' : sites.length}</strong>
        </div>
        <div className="summary-item">
          <span>Work Orders</span>
          <strong>{loading ? '-' : summary.workOrders}</strong>
        </div>
        <div className="summary-item">
          <span>WO Value</span>
          <strong>{loading ? '-' : money(summary.totalValue)}</strong>
        </div>
        <div className="summary-item">
          <span>Active Sites</span>
          <strong>{loading ? '-' : summary.activeSites}</strong>
        </div>
      </div>

      <div className="stack">
        <div className="card">
          <div className="section-head">
            <div>
              <h2>Project Workflow</h2>
              <p>Start from a project or site, then use the work order register for detailed execution records.</p>
            </div>
            <span className="pill">Module shell</span>
          </div>

          <div className="module-grid">
            {workflowAreas.map((area) => (
              <Link className="module-card module-card-active" href={area.href} key={area.label}>
                <div className="module-card-head">
                  <h3>{area.label}</h3>
                  <span className="module-status module-status-active">{area.status}</span>
                </div>
                <p>{area.description}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <div>
              <h2>Projects</h2>
              <p>Supabase project masters with linked site, status, and work order activity.</p>
            </div>
            <span className="pill">{projects.length} projects</span>
          </div>

          {loading ? <p>Loading projects...</p> : null}
          {error ? <div className="error">{error}</div> : null}

          {!loading && !error ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Code</th>
                    <th>Site</th>
                    <th>Work Orders</th>
                    <th>WO Value</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length ? (
                    projects.map((project) => (
                      <tr key={project.id}>
                        <td>{project.name}</td>
                        <td>{project.project_code || '-'}</td>
                        <td>{relationName(project.sites)}</td>
                        <td>{projectWorkOrderCounts[project.id] ?? 0}</td>
                        <td>{money(projectWorkOrderValues[project.id])}</td>
                        <td>
                          <span className="status-pill">{project.status}</span>
                        </td>
                        <td>
                          <Link className="ghost-button compact-button" href="/work-orders">
                            Work orders
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7}>No projects created yet.</td>
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
              <h2>Sites</h2>
              <p>Site masters with project coverage and work order totals.</p>
            </div>
            <span className="pill">{sites.length} sites</span>
          </div>

          {!loading && !error ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Code</th>
                    <th>Location</th>
                    <th>Projects</th>
                    <th>Work Orders</th>
                    <th>WO Value</th>
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
                        <td>{siteProjectCounts[site.id] ?? 0}</td>
                        <td>{siteWorkOrderCounts[site.id] ?? 0}</td>
                        <td>{money(siteWorkOrderValues[site.id])}</td>
                        <td>
                          <span className="status-pill">{site.status}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7}>No sites created yet.</td>
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

export default function ProjectsPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <ProjectsContent />
        </main>
      )}
    </ProtectedPage>
  );
}

'use client';

import { useEffect, useState } from 'react';
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

function siteNameForProject(project: Project) {
  if (Array.isArray(project.sites)) return project.sites[0]?.name ?? '-';
  return project.sites?.name ?? '-';
}

function WorkOrderMasters() {
  const { isAdmin, loading: loadingAccess } = useCurrentUserAccess();
  const [sites, setSites] = useState<Site[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteCode, setSiteCode] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [projectSiteId, setProjectSiteId] = useState('');
  const [message, setMessage] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  async function loadMasters() {
    setLoading(true);
    setError('');

    const { data: siteData, error: siteError } = await supabase
      .from('sites')
      .select('id,site_code,name,location,status')
      .order('created_at', { ascending: false });

    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id,project_code,name,status,sites(name)')
      .order('created_at', { ascending: false });

    if (siteError || projectError) {
      setError(siteError?.message || projectError?.message || 'Could not load masters.');
    } else {
      setSites(siteData ?? []);
      setProjects((projectData ?? []) as Project[]);
      setProjectSiteId((current) => current || siteData?.[0]?.id || '');
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

  return (
    <section className="page">
      <div className="page-title">
        <h1>Work Orders</h1>
        <p>Set up sites and projects before creating work orders.</p>
      </div>

      <div className="stack">
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

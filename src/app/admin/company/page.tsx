'use client';

import { useEffect, useState } from 'react';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { erpModules } from '@/lib/erpModules';
import { supabase } from '@/lib/supabase';
import { useCurrentUserAccess } from '@/lib/useCurrentUserAccess';

type CompanyRow = {
  company_code: string;
  email_domain: string | null;
  id: string;
  legal_name: string | null;
  name: string;
  status: string;
};

type SiteRow = {
  address: string | null;
  company_id: string | null;
  id: string;
  location: string | null;
  name: string;
  site_code: string | null;
  status: string;
};

type ModuleSettingRow = {
  enabled: boolean;
  erp_modules:
    | {
        module_code: string;
        name: string;
      }
    | {
        module_code: string;
        name: string;
      }[]
    | null;
};

function normalizeModule(row: ModuleSettingRow) {
  if (!row.erp_modules) return null;
  return Array.isArray(row.erp_modules) ? row.erp_modules[0] ?? null : row.erp_modules;
}

function CompanySettings() {
  const { isAdmin, isPlatformOwner, loading: loadingAccess } = useCurrentUserAccess();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [enabledCodes, setEnabledCodes] = useState<Set<string>>(new Set(erpModules.map((module) => module.code)));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [companyLegalName, setCompanyLegalName] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');
  const [editingCompanyId, setEditingCompanyId] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteCode, setSiteCode] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [siteCompanyId, setSiteCompanyId] = useState('');
  const [editingSiteId, setEditingSiteId] = useState('');
  const [masterMessage, setMasterMessage] = useState('');
  const [masterError, setMasterError] = useState('');
  const [savingMaster, setSavingMaster] = useState('');
  const [moduleMessage, setModuleMessage] = useState('');
  const [moduleError, setModuleError] = useState('');
  const [savingModuleCode, setSavingModuleCode] = useState('');

  const currentCompany = companies[0] ?? null;

  useEffect(() => {
    let mounted = true;

    async function loadCompanySettings() {
      setLoading(true);
      setError('');

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id,company_code,name,legal_name,email_domain,status')
        .order('created_at', { ascending: true });

      const { data: siteData, error: siteError } = await supabase
        .from('sites')
        .select('id,company_id,site_code,name,location,address,status')
        .order('name', { ascending: true });

      if (!mounted) return;

      if (companyError || siteError) {
        setError(companyError?.message || siteError?.message || 'Could not load company setup.');
        setLoading(false);
        return;
      }

      setCompanies(companyData ?? []);
      setSites((siteData ?? []) as SiteRow[]);
      const currentCompany = companyData?.[0];
      if (currentCompany) {
        setSiteCompanyId((current) => current || currentCompany.id);
      }

      if (!currentCompany) {
        setLoading(false);
        return;
      }

      const { data: moduleData, error: moduleError } = await supabase
        .from('company_modules')
        .select('enabled,erp_modules(module_code,name)')
        .eq('company_id', currentCompany.id);

      if (!mounted) return;

      if (moduleError) {
        setError(moduleError.message);
      } else {
        const activeCodes = new Set<string>();
        ((moduleData ?? []) as ModuleSettingRow[]).forEach((row) => {
          const module = normalizeModule(row);
          if (row.enabled && module?.module_code) activeCodes.add(module.module_code);
        });
        if (activeCodes.size) setEnabledCodes(activeCodes);
      }

      setLoading(false);
    }

    loadCompanySettings();

    return () => {
      mounted = false;
    };
  }, []);

  async function postJson(url: string, body: Record<string, unknown>) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = (await response.json()) as { error?: string; message?: string };

    if (!response.ok) {
      throw new Error(result.error ?? 'Action failed.');
    }

    return result.message ?? 'Saved.';
  }

  function editCompany(company: CompanyRow) {
    setEditingCompanyId(company.id);
    setCompanyName(company.name);
    setCompanyCode(company.company_code);
    setCompanyLegalName(company.legal_name || '');
    setCompanyDomain(company.email_domain || '');
    setMasterMessage(`Editing ${company.name}.`);
    setMasterError('');
  }

  async function saveCompany() {
    setSavingMaster('company');
    setMasterMessage('');
    setMasterError('');

    try {
      const message = await postJson('/api/upsert-company', {
        companyCode,
        companyId: editingCompanyId || undefined,
        emailDomain: companyDomain,
        legalName: companyLegalName,
        name: companyName,
      });
      setMasterMessage(message);
      setEditingCompanyId('');
      setCompanyName('');
      setCompanyCode('');
      setCompanyLegalName('');
      setCompanyDomain('');
      window.location.reload();
    } catch (saveError) {
      setMasterError(saveError instanceof Error ? saveError.message : 'Could not save company.');
    } finally {
      setSavingMaster('');
    }
  }

  function editSite(site: SiteRow) {
    setEditingSiteId(site.id);
    setSiteName(site.name);
    setSiteCode(site.site_code || '');
    setSiteLocation(site.location || '');
    setSiteAddress(site.address || '');
    setSiteCompanyId(site.company_id || currentCompany?.id || '');
    setMasterMessage(`Editing ${site.name}.`);
    setMasterError('');
  }

  async function saveSite() {
    setSavingMaster('site');
    setMasterMessage('');
    setMasterError('');

    try {
      const message = await postJson('/api/upsert-site', {
        address: siteAddress,
        companyId: siteCompanyId,
        location: siteLocation,
        name: siteName,
        siteCode,
        siteId: editingSiteId || undefined,
      });
      setMasterMessage(message);
      setEditingSiteId('');
      setSiteName('');
      setSiteCode('');
      setSiteLocation('');
      setSiteAddress('');
      window.location.reload();
    } catch (saveError) {
      setMasterError(saveError instanceof Error ? saveError.message : 'Could not save site.');
    } finally {
      setSavingMaster('');
    }
  }

  async function toggleModule(moduleCode: string, enabled: boolean) {
    if (!currentCompany) {
      setModuleError('Company setup is not ready yet.');
      return;
    }

    setSavingModuleCode(moduleCode);
    setModuleMessage('');
    setModuleError('');

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch('/api/update-company-module', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId: currentCompany.id,
        enabled,
        moduleCode,
      }),
    });

    const result = (await response.json()) as { error?: string; message?: string };
    setSavingModuleCode('');

    if (!response.ok) {
      setModuleError(result.error ?? 'Could not update module.');
      return;
    }

    setEnabledCodes((currentCodes) => {
      const nextCodes = new Set(currentCodes);
      if (enabled) nextCodes.add(moduleCode);
      else nextCodes.delete(moduleCode);
      return nextCodes;
    });
    setModuleMessage(result.message ?? 'Module updated.');
  }

  if (loadingAccess || loading) {
    return <div className="card">Loading company settings...</div>;
  }

  if (!isPlatformOwner) {
    return (
      <div className="card">
        <h2>Access Restricted</h2>
        <p>Only the ERP platform owner can view company package and module entitlement settings.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="section-head">
          <div>
            <h2>Company Master</h2>
            <p>Each ERP client company becomes a tenant with its own users, roles, modules, and future data scope.</p>
          </div>
          <span className="pill">{companies.length || 1} company</span>
        </div>

        {error ? <div className="error">{error}</div> : null}

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Code</th>
                <th>Domain</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.length ? (
                companies.map((company) => (
                  <tr key={company.id}>
                    <td>
                      <strong>{company.name}</strong>
                      <div className="muted-text">{company.legal_name || company.name}</div>
                    </td>
                    <td>{company.company_code}</td>
                    <td>{company.email_domain || 'Not set'}</td>
                    <td>
                      <span className="status-pill">{company.status}</span>
                    </td>
                    <td>
                      <button className="ghost-button compact-button" onClick={() => editCompany(company)} type="button">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td>MRC</td>
                  <td>mrc</td>
                  <td>mrcgroup.in</td>
                  <td>
                    <span className="status-pill">pending SQL</span>
                  </td>
                  <td>-</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="divider" />
        <h3>{editingCompanyId ? 'Edit Company' : 'Create Company'}</h3>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="company-name">Company name</label>
            <input id="company-name" onChange={(event) => setCompanyName(event.target.value)} value={companyName} />
          </div>
          <div className="field">
            <label htmlFor="company-code">Company code</label>
            <input id="company-code" disabled={Boolean(editingCompanyId)} onChange={(event) => setCompanyCode(event.target.value)} value={companyCode} />
          </div>
          <div className="field">
            <label htmlFor="company-legal">Legal name</label>
            <input id="company-legal" onChange={(event) => setCompanyLegalName(event.target.value)} value={companyLegalName} />
          </div>
          <div className="field">
            <label htmlFor="company-domain">Email domain</label>
            <input id="company-domain" onChange={(event) => setCompanyDomain(event.target.value)} placeholder="mrcgroup.in" value={companyDomain} />
          </div>
        </div>
        <button className="primary-button action-row" disabled={savingMaster === 'company'} onClick={saveCompany} type="button">
          {savingMaster === 'company' ? 'Saving...' : editingCompanyId ? 'Update company' : 'Create company'}
        </button>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Site Master</h2>
            <p>Sites belong to companies. User access can later be scoped to one or multiple sites.</p>
          </div>
          <span className="pill">{sites.length} sites</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Site</th>
                <th>Code</th>
                <th>Company</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.length ? (
                sites.map((site) => (
                  <tr key={site.id}>
                    <td>{site.name}</td>
                    <td>{site.site_code || '-'}</td>
                    <td>{companies.find((company) => company.id === site.company_id)?.name || 'Not linked'}</td>
                    <td>{site.location || '-'}</td>
                    <td>
                      <span className="status-pill">{site.status}</span>
                    </td>
                    <td>
                      <button className="ghost-button compact-button" onClick={() => editSite(site)} type="button">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>No sites created yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="divider" />
        <h3>{editingSiteId ? 'Edit Site' : 'Create Site'}</h3>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="site-company">Company</label>
            <select id="site-company" onChange={(event) => setSiteCompanyId(event.target.value)} value={siteCompanyId}>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
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
          <div className="field form-grid-wide">
            <label htmlFor="site-address">Address</label>
            <input id="site-address" onChange={(event) => setSiteAddress(event.target.value)} value={siteAddress} />
          </div>
        </div>
        <button className="primary-button action-row" disabled={savingMaster === 'site'} onClick={saveSite} type="button">
          {savingMaster === 'site' ? 'Saving...' : editingSiteId ? 'Update site' : 'Create site'}
        </button>
        {masterMessage ? <div className="notice">{masterMessage}</div> : null}
        {masterError ? <div className="error">{masterError}</div> : null}
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Enabled Modules</h2>
            <p>
              Module entitlements are controlled by the ERP platform owner. Client admins can see what is enabled, but they
              should not control their own package.
            </p>
          </div>
          <span className="pill">{isPlatformOwner ? 'Owner control' : 'Read only'}</span>
        </div>

        <div className="module-switch-grid">
          {erpModules.map((module) => {
            const enabled = enabledCodes.has(module.code);
            const isCoreModule = ['admin', 'masters'].includes(module.code);
            return (
              <article className={`module-switch ${enabled ? 'module-switch-enabled' : ''}`} key={module.code}>
                <div>
                  <h3>{module.name}</h3>
                  <p>{module.description}</p>
                </div>
                <div className="module-control">
                  <span className={enabled ? 'status-pill' : 'pill'}>{enabled ? 'Enabled' : 'Off'}</span>
                  {isCoreModule ? (
                    <span className="muted-text">Required</span>
                  ) : (
                    <button
                      className={enabled ? 'ghost-button compact-button' : 'primary-button compact-button'}
                      disabled={savingModuleCode === module.code}
                      type="button"
                      onClick={() => toggleModule(module.code, !enabled)}
                    >
                      {savingModuleCode === module.code ? 'Saving...' : enabled ? 'Turn off' : 'Turn on'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {moduleMessage ? <div className="notice">{moduleMessage}</div> : null}
        {moduleError ? <div className="error">{moduleError}</div> : null}
      </div>

      <div className="card">
        <h2>Product Owner Rule</h2>
        <p>
          For future client companies, module changes should be handled from the product-owner backend, not by client-side
          company admins. This keeps subscription/package control with your ERP business.
        </p>
      </div>
    </div>
  );
}

export default function CompanyPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <section className="page">
            <div className="page-title">
              <h1>Company Setup</h1>
              <p>Manage the company master and module entitlement layer for future ERP clients.</p>
            </div>
            <CompanySettings />
          </section>
        </main>
      )}
    </ProtectedPage>
  );
}

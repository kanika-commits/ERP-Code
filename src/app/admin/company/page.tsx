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
  const [enabledCodes, setEnabledCodes] = useState<Set<string>>(new Set(erpModules.map((module) => module.code)));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

      if (!mounted) return;

      if (companyError) {
        setError(companyError.message);
        setLoading(false);
        return;
      }

      setCompanies(companyData ?? []);
      const currentCompany = companyData?.[0];

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
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

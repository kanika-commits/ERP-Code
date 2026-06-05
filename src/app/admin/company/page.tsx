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
  const { isAdmin, loading: loadingAccess } = useCurrentUserAccess();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [enabledCodes, setEnabledCodes] = useState<Set<string>>(new Set(erpModules.map((module) => module.code)));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loadingAccess || loading) {
    return <div className="card">Loading company settings...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="card">
        <h2>Access Restricted</h2>
        <p>Only Admin and Super Admin users can view company and module settings.</p>
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
            <p>These switches decide what this company sees in the ERP module directory and future access checks.</p>
          </div>
          <span className="pill">{enabledCodes.size} enabled</span>
        </div>

        <div className="module-switch-grid">
          {erpModules.map((module) => {
            const enabled = enabledCodes.has(module.code);
            return (
              <article className={`module-switch ${enabled ? 'module-switch-enabled' : ''}`} key={module.code}>
                <div>
                  <h3>{module.name}</h3>
                  <p>{module.description}</p>
                </div>
                <span className={enabled ? 'status-pill' : 'pill'}>{enabled ? 'Enabled' : 'Off'}</span>
              </article>
            );
          })}
        </div>
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

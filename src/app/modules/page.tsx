'use client';

import Link from 'next/link';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { can } from '@/lib/accessControl';
import type { ErpModule } from '@/lib/erpModules';
import { useEnabledModules } from '@/lib/useEnabledModules';
import { useCurrentUserAccess } from '@/lib/useCurrentUserAccess';

const moduleViewResources: Partial<Record<ErpModule['code'], string[]>> = {
  admin: ['companies', 'sites', 'vendors'],
  contract_management: ['work_orders', 'ra_bills', 'invoices', 'payments', 'debit_notes', 'files', 'reports'],
  finance: ['payments', 'invoices', 'debit_notes', 'reports'],
  masters: ['companies', 'sites', 'vendors'],
  projects: ['sites', 'work_orders'],
  reports: ['reports'],
};

function canViewModule(access: ReturnType<typeof useCurrentUserAccess>, module: ErpModule) {
  if (access.isPlatformOwner || access.isSuperAdmin) return true;
  if (module.code === 'admin') return access.isAdmin;

  const resources = moduleViewResources[module.code] ?? [];
  const assignedModuleCodes = new Set(
    (access.accessAssignments ?? [])
      .filter((assignment) => assignment.status === 'active' && assignment.module_code)
      .map((assignment) => assignment.module_code as string),
  );
  const permittedResources = assignedModuleCodes.size
    ? resources.filter((resource) => assignedModuleCodes.has(resource))
    : resources;

  if (!permittedResources.length) return false;

  return permittedResources.some((resource) => can(access, resource, 'view'));
}

function ModulesContent() {
  const { companyName, error, loading, modules } = useEnabledModules();
  const access = useCurrentUserAccess();
  const unfinishedModules = new Set(['procurement', 'purchase', 'hr']);
  const visibleModules = modules.filter((module) => {
    if (unfinishedModules.has(module.code) && !access.isSuperAdmin && !access.isPlatformOwner) return false;
    return canViewModule(access, module);
  });

  return (
    <section className="page">
      <div className="page-title">
        <h1>Modules</h1>
        <p>Open your assigned {companyName} workspaces. Each module keeps its own records, reports, and workflows.</p>
      </div>

      <div className="module-launcher-head">
        <div className="section-head">
          <div>
            <h2>App Launcher</h2>
            <p>This is the ERP menu. The dashboard stays focused on alerts, deadlines, messages, and reports.</p>
          </div>
          <span className="pill">{loading ? 'Checking' : `${visibleModules.length} modules`}</span>
        </div>
        {error ? <div className="notice">Using default module access until company module settings are applied.</div> : null}
      </div>

      <div className="module-grid module-launcher-grid">
        {visibleModules.map((module) => (
          <Link className="module-card module-card-active module-launcher-card" href={module.href} key={module.name}>
            <div className="module-card-head">
              <h3>{module.name}</h3>
              {module.status.toLowerCase() !== 'active' ? (
                <span className={`module-status module-status-${module.status.toLowerCase()}`}>{module.status}</span>
              ) : null}
            </div>
            <p>{module.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function ModulesPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <ModulesContent />
        </main>
      )}
    </ProtectedPage>
  );
}

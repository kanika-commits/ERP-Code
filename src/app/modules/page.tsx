'use client';

import Link from 'next/link';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { useEnabledModules } from '@/lib/useEnabledModules';
import { useCurrentUserAccess } from '@/lib/useCurrentUserAccess';

function ModulesContent() {
  const { companyName, error, loading, modules } = useEnabledModules();
  const { isAdmin, isSuperAdmin } = useCurrentUserAccess();
  const unfinishedModules = new Set(['procurement', 'purchase', 'hr']);
  const visibleModules = modules.filter((module) => {
    if (module.code === 'admin' && !isAdmin) return false;
    if (unfinishedModules.has(module.code) && !isSuperAdmin) return false;
    return true;
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

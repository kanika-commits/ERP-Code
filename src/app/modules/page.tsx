'use client';

import Link from 'next/link';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { erpModules } from '@/lib/erpModules';

function ModulesContent() {
  return (
    <section className="page">
      <div className="page-title">
        <h1>ERP Modules</h1>
        <p>Open a module to work inside its masters, registers, ledgers, reports, and workflows.</p>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Module Directory</h2>
            <p>This is the ERP menu. The dashboard stays focused on alerts, summaries, and pending work.</p>
          </div>
          <span className="pill">{erpModules.length} modules</span>
        </div>

        <div className="module-grid">
          {erpModules.map((module) => (
            <Link className="module-card module-card-active" href={module.href} key={module.name}>
              <div className="module-card-head">
                <h3>{module.name}</h3>
                <span className={`module-status module-status-${module.status.toLowerCase()}`}>{module.status}</span>
              </div>
              <p>{module.description}</p>
            </Link>
          ))}
        </div>
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

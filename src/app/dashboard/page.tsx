'use client';

import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';

export default function DashboardPage() {
  return (
    <ProtectedPage>
      {(user) => (
        <main className="app-shell">
          <AppTopbar />
          <section className="page">
            <div className="page-title">
              <h1>ERP Dashboard</h1>
              <p>Logged in as {user.email}. The foundation is connected to Supabase Auth.</p>
            </div>

            <div className="grid">
              <article className="card">
                <h2>Auth Foundation</h2>
                <p>Login, logout, protected routing, and session detection are ready for development.</p>
                <div className="metric">Ready</div>
              </article>

              <article className="card">
                <h2>Database</h2>
                <p>Supabase tables are created for users, vendors, sites, work orders, finance, files, approvals, and audit logs.</p>
                <div className="metric">23</div>
              </article>

              <article className="card">
                <h2>Next Build</h2>
                <p>Admin bootstrap and role assignment come next, followed by vendor/site/project masters.</p>
                <div className="metric">M1</div>
              </article>
            </div>
          </section>
        </main>
      )}
    </ProtectedPage>
  );
}


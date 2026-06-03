'use client';

import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';

export default function UsersPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <section className="page">
            <div className="page-title">
              <h1>Users</h1>
              <p>Admin bootstrap and user-role assignment will be built here next.</p>
            </div>
            <div className="card">
              <h2>Milestone 1</h2>
              <p>This page will manage profiles, roles, vendor links, and site/project scopes.</p>
            </div>
          </section>
        </main>
      )}
    </ProtectedPage>
  );
}


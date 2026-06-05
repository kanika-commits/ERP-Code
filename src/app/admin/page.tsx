'use client';

import Link from 'next/link';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { useCurrentUserAccess } from '@/lib/useCurrentUserAccess';

const adminAreas = [
  {
    description: 'Invite users, change roles, remove normal roles, and deactivate/reactivate ERP users.',
    href: '/admin/users',
    name: 'Users',
    status: '',
  },
  {
    description: 'Control client company setup and turn modules on or off for a company package.',
    href: '/admin/company',
    name: 'Company & Modules',
    status: '',
  },
  {
    description: 'Review role templates, permission actions, and user-specific override foundations.',
    href: '/admin/permissions',
    name: 'Roles & Permissions',
    status: '',
  },
  {
    description: 'Approval rules, numbering formats, audit logs, and owner settings will live here as the ERP matures.',
    href: '/admin',
    name: 'System Settings',
    status: 'Planned',
  },
] as const;

function AdminHome() {
  const { isAdmin, loading } = useCurrentUserAccess();

  if (loading) {
    return <div className="card">Checking admin access...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="card">
        <h2>Access Restricted</h2>
        <p>Only ERP admins can open Admin & Settings.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="section-head">
          <div>
            <h2>Owner Control Panel</h2>
            <p>Manage the parts of the ERP that should stay with company admins and platform owners.</p>
          </div>
          <span className="pill">Admin module</span>
        </div>
        <div className="module-grid">
          {adminAreas.map((area) =>
            area.status ? (
              <article className="module-card" key={area.name}>
                <div className="module-card-head">
                  <h3>{area.name}</h3>
                  <span className="module-status module-status-planned">{area.status}</span>
                </div>
                <p>{area.description}</p>
              </article>
            ) : (
              <Link className="module-card module-card-active" href={area.href} key={area.name}>
                <div className="module-card-head">
                  <h3>{area.name}</h3>
                  <span className="module-status module-status-active">Open</span>
                </div>
                <p>{area.description}</p>
              </Link>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <section className="page">
            <div className="page-title">
              <h1>Admin & Settings</h1>
              <p>Users, roles, company packages, permissions, and system controls.</p>
            </div>
            <AdminHome />
          </section>
        </main>
      )}
    </ProtectedPage>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { ROLE_LABELS, type RoleCode } from '@/lib/roles';
import { supabase } from '@/lib/supabase';

type Profile = {
  full_name: string | null;
  email: string;
  status: string;
};

type UserRoleRow = {
  scope_type: string;
  roles: {
    code: RoleCode;
    name: string;
  } | null;
};

type SupabaseUserRoleRow = {
  scope_type: string;
  roles:
    | {
        code: RoleCode;
        name: string;
      }
    | {
        code: RoleCode;
        name: string;
      }[]
    | null;
};

const modules = [
  {
    description: 'Central ERP lists for vendors, sites, projects, users, roles, files, and future control masters.',
    href: '/masters',
    name: 'Master Data',
    status: 'Active',
  },
  {
    description: 'Cross-module exceptions for outstanding, overbilling, missing documents, KYC gaps, GST, and ITC.',
    href: '/reports',
    name: 'Reports & Exceptions',
    status: 'Active',
  },
  {
    description: 'Projects, sites, project dashboards, progress, documents, and project-level cost tracking.',
    href: '/projects',
    name: 'Project Management',
    status: 'Active',
  },
  {
    description: 'Work orders, RA bills, invoices, payments, debit notes, files, approvals, and ledgers.',
    href: '/contract-management',
    name: 'Contract Management',
    status: 'Active',
  },
  {
    description: 'Vendor requests, RFQs, quotations, comparative statements, and procurement approvals.',
    href: '/procurement',
    name: 'Procurement',
    status: 'Active',
  },
  {
    description: 'Purchase orders, delivery/receipt tracking, vendor bills, and three-way matching.',
    href: '/purchase',
    name: 'Purchase',
    status: 'Active',
  },
  {
    description: 'Payables, receivables, GST/ITC, TDS, bank payments, reconciliations, and finance reports.',
    href: '/finance',
    name: 'Finance & Accounts',
    status: 'Active',
  },
  {
    description: 'Employees, attendance, leave, payroll, reimbursements, documents, and internal HR workflows.',
    href: '/hr',
    name: 'HR',
    status: 'Active',
  },
  {
    description: 'Users, roles, permissions, number formats, approval rules, audit logs, and company settings.',
    href: '/admin/users',
    name: 'Admin & Settings',
    status: 'Active',
  },
];

function DashboardContent({ userEmail }: { userEmail?: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRoleRow[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setLoadingProfile(true);
      setProfileError('');

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!user || userError) {
        if (!mounted) return;
        setProfileError(userError?.message || 'No signed-in user.');
        setLoadingProfile(false);
        return;
      }

      const { data: profileData, error: profileLoadError } = await supabase
        .from('profiles')
        .select('full_name,email,status')
        .eq('id', user.id)
        .single();

      const { data: roleData, error: roleLoadError } = await supabase
        .from('user_roles')
        .select('scope_type,roles(code,name)')
        .eq('user_id', user.id);

      if (!mounted) return;

      if (profileLoadError) {
        setProfileError(profileLoadError.message);
      } else {
        setProfile(profileData);
      }

      if (!roleLoadError && roleData) {
        const normalizedRoles = (roleData as SupabaseUserRoleRow[]).map((row) => ({
          scope_type: row.scope_type,
          roles: Array.isArray(row.roles) ? row.roles[0] ?? null : row.roles,
        }));
        setRoles(normalizedRoles);
      }

      setLoadingProfile(false);
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const roleLabels = roles
    .map((row) => row.roles?.code)
    .filter((code): code is RoleCode => Boolean(code))
    .map((code) => ROLE_LABELS[code] ?? code);

  return (
    <section className="page">
      <div className="page-title">
        <h1>ERP Dashboard</h1>
        <p>Logged in as {profile?.email ?? userEmail}. The foundation is connected to Supabase Auth.</p>
      </div>

      <div className="grid">
        <article className="card">
          <h2>Auth Foundation</h2>
          <p>Login, logout, protected routing, and session detection are ready for development.</p>
          <div className="metric">Ready</div>
        </article>

        <article className="card">
          <h2>Admin Bootstrap</h2>
          {loadingProfile ? <p>Checking your ERP profile...</p> : null}
          {!loadingProfile && profile ? (
            <>
              <p>{profile.full_name || profile.email} is active in the ERP profile table.</p>
              <div className="metric">{roleLabels[0] ?? 'User'}</div>
            </>
          ) : null}
          {!loadingProfile && profileError ? (
            <>
              <p>Run the bootstrap SQL once in Supabase to create your ERP profile and role.</p>
              <div className="metric">Pending</div>
            </>
          ) : null}
        </article>

        <article className="card">
          <h2>Next Build</h2>
          <p>Masters and exception reporting are active. Next comes deeper procurement, purchase, approval, and HR transaction schemas.</p>
          <div className="metric">M2</div>
        </article>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>ERP Modules</h2>
            <p>Build the ERP module by module, starting with the contract workflows already imported from Sheets and Drive.</p>
          </div>
          <span className="pill">{modules.length} modules</span>
        </div>

        <div className="module-grid">
          {modules.map((module) => {
            const content = (
              <>
                <div className="module-card-head">
                  <h3>{module.name}</h3>
                  <span className={`module-status module-status-${module.status.toLowerCase()}`}>{module.status}</span>
                </div>
                <p>{module.description}</p>
              </>
            );

            return module.href ? (
              <Link className="module-card module-card-active" href={module.href} key={module.name}>
                {content}
              </Link>
            ) : (
              <article className="module-card" key={module.name}>
                {content}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedPage>
      {(user) => (
        <main className="app-shell">
          <AppTopbar />
          <DashboardContent userEmail={user.email} />
        </main>
      )}
    </ProtectedPage>
  );
}

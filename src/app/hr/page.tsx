'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { ROLE_LABELS, type RoleCode } from '@/lib/roles';
import { supabase } from '@/lib/supabase';

type Profile = {
  email: string;
  full_name: string | null;
  id: string;
  status: string;
};

type RoleRow = {
  profiles:
    | {
        email: string;
        full_name: string | null;
        status: string;
      }
    | {
        email: string;
        full_name: string | null;
        status: string;
      }[]
    | null;
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
  scope_type: string;
};

const hrWorkflows = [
  {
    description: 'Employee master, joining details, departments, documents, and employment status.',
    label: 'Employee Records',
    status: 'Planned',
  },
  {
    description: 'Daily attendance, site allocation, leave requests, approvals, and monthly summaries.',
    label: 'Attendance & Leave',
    status: 'Planned',
  },
  {
    description: 'Salary structure, payroll runs, reimbursements, advances, and payslip records.',
    label: 'Payroll & Reimbursements',
    status: 'Planned',
  },
];

function relationOne<T>(relation: T | T[] | null) {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation;
}

function HrContent() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadPeople() {
      setLoading(true);
      setError('');

      const [profileResult, roleResult] = await Promise.all([
        supabase.from('profiles').select('id,full_name,email,status').order('full_name', { ascending: true }),
        supabase.from('user_roles').select('scope_type,profiles(full_name,email,status),roles(code,name)'),
      ]);

      if (!mounted) return;

      const loadError = profileResult.error || roleResult.error;
      if (loadError) {
        setError(loadError.message);
      } else {
        setProfiles((profileResult.data ?? []) as Profile[]);
        setRoles((roleResult.data ?? []) as RoleRow[]);
      }

      setLoading(false);
    }

    loadPeople();

    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const activePeople = profiles.filter((profile) => profile.status?.toLowerCase() === 'active').length;
    const internalRoles = roles.filter((row) => row.scope_type === 'global').length;
    const vendorScopedRoles = roles.filter((row) => row.scope_type !== 'global').length;

    return {
      activePeople,
      internalRoles,
      totalPeople: profiles.length,
      vendorScopedRoles,
    };
  }, [profiles, roles]);

  return (
    <section className="page">
      <div className="page-title">
        <h1>HR</h1>
        <p>Start with people, access, and role visibility now; employee, attendance, leave, and payroll workflows come after HR schema is added.</p>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="module-summary-grid">
        <div className="summary-item">
          <span>People</span>
          <strong>{loading ? '-' : summary.totalPeople}</strong>
        </div>
        <div className="summary-item">
          <span>Active People</span>
          <strong>{loading ? '-' : summary.activePeople}</strong>
        </div>
        <div className="summary-item">
          <span>Internal Roles</span>
          <strong>{loading ? '-' : summary.internalRoles}</strong>
        </div>
        <div className="summary-item">
          <span>Scoped Access</span>
          <strong>{loading ? '-' : summary.vendorScopedRoles}</strong>
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>HR Workflows</h2>
            <p>These workflows are planned as separate HR data tables. Current live data is the people and role directory.</p>
          </div>
          <span className="pill">Planned module</span>
        </div>

        <div className="module-grid">
          {hrWorkflows.map((workflow) => (
            <article className="module-card" key={workflow.label}>
              <div className="module-card-head">
                <h3>{workflow.label}</h3>
                <span className="module-status module-status-planned">{workflow.status}</span>
              </div>
              <p>{workflow.description}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>People & Access Directory</h2>
            <p>Current users and ERP roles. This becomes the base for HR employee records later.</p>
          </div>
          <span className="pill">{profiles.length} people</span>
        </div>

        {loading ? <p>Loading people...</p> : null}

        {!loading && !error ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Role</th>
                  <th>Access Scope</th>
                </tr>
              </thead>
              <tbody>
                {roles.length ? (
                  roles.map((row, index) => {
                    const profile = relationOne(row.profiles);
                    const role = relationOne(row.roles);
                    return (
                      <tr key={`${profile?.email ?? 'user'}-${role?.code ?? index}`}>
                        <td>{profile?.full_name || profile?.email || '-'}</td>
                        <td>{profile?.email || '-'}</td>
                        <td>
                          <span className="status-pill">{profile?.status || '-'}</span>
                        </td>
                        <td>{role?.code ? ROLE_LABELS[role.code] ?? role.name : '-'}</td>
                        <td>{row.scope_type === 'global' ? 'Internal / global' : row.scope_type}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5}>No people roles found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function HrPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <HrContent />
        </main>
      )}
    </ProtectedPage>
  );
}

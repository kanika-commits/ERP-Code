'use client';

import { useEffect, useState } from 'react';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { ROLE_LABELS, type RoleCode } from '@/lib/roles';
import { supabase } from '@/lib/supabase';

type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  status: string;
  vendor_id: string | null;
};

type UserRoleRow = {
  user_id: string;
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

function normalizeRole(row: UserRoleRow) {
  return Array.isArray(row.roles) ? row.roles[0] ?? null : row.roles;
}

function UsersDirectory() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      setLoading(true);
      setError('');

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id,full_name,email,status,vendor_id')
        .order('created_at', { ascending: true });

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id,scope_type,roles(code,name)');

      if (!mounted) return;

      if (profileError || roleError) {
        setError(profileError?.message || roleError?.message || 'Could not load users.');
      } else {
        setProfiles(profileData ?? []);
        setUserRoles((roleData ?? []) as UserRoleRow[]);
      }

      setLoading(false);
    }

    loadUsers();

    return () => {
      mounted = false;
    };
  }, []);

  function rolesForUser(userId: string) {
    return userRoles
      .filter((row) => row.user_id === userId)
      .map((row) => {
        const role = normalizeRole(row);
        if (!role) return null;
        const label = ROLE_LABELS[role.code] ?? role.name;
        return row.scope_type === 'global' ? label : `${label} (${row.scope_type})`;
      })
      .filter((role): role is string => Boolean(role));
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>User Access Rules</h2>
        <p>
          MRC employees can receive internal roles. Vendors can also be added, but their access should be scoped to one vendor
          so they only see their own work orders, invoices, payments, files, and ledgers.
        </p>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>ERP Users</h2>
            <p>Profiles and assigned roles from Supabase.</p>
          </div>
          <span className="pill">{profiles.length} users</span>
        </div>

        {loading ? <p>Loading users...</p> : null}
        {error ? <div className="error">{error}</div> : null}

        {!loading && !error ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Roles</th>
                  <th>Access Type</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => {
                  const assignedRoles = rolesForUser(profile.id);
                  return (
                    <tr key={profile.id}>
                      <td>{profile.full_name || 'Not set'}</td>
                      <td>{profile.email}</td>
                      <td>
                        <span className="status-pill">{profile.status}</span>
                      </td>
                      <td>{assignedRoles.length ? assignedRoles.join(', ') : 'No role assigned'}</td>
                      <td>{profile.vendor_id ? 'Vendor-scoped' : 'Internal / global'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="card">
        <h2>Current Invite Method</h2>
        <p>
          For now, create Auth users in Supabase Authentication, then assign their profile and role with SQL. The next build
          will add a controlled admin invite flow so this can be done from inside the ERP.
        </p>
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <section className="page">
            <div className="page-title">
              <h1>Users</h1>
              <p>Manage internal MRC users and vendor-scoped ERP access.</p>
            </div>
            <UsersDirectory />
          </section>
        </main>
      )}
    </ProtectedPage>
  );
}

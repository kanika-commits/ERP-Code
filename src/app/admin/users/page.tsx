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
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviting, setInviting] = useState(false);
  const [assignEmail, setAssignEmail] = useState('');
  const [assignName, setAssignName] = useState('');
  const [assignRole, setAssignRole] = useState<RoleCode>('viewer');
  const [assignMessage, setAssignMessage] = useState('');
  const [assignError, setAssignError] = useState('');
  const [assigning, setAssigning] = useState(false);

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

  async function inviteUser() {
    setInviteMessage('');
    setInviteError('');

    if (!inviteEmail) {
      setInviteError('Enter an email address.');
      return;
    }

    setInviting(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch('/.netlify/functions/invite-user', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: inviteEmail,
        fullName: inviteName,
      }),
    });

    const result = (await response.json()) as { error?: string; message?: string };
    setInviting(false);

    if (!response.ok) {
      setInviteError(result.error ?? 'Could not send invite.');
      return;
    }

    setInviteMessage(result.message ?? 'Invite sent.');
    setInviteEmail('');
    setInviteName('');
  }

  async function assignRoleToUser() {
    setAssignMessage('');
    setAssignError('');

    if (!assignEmail || !assignRole) {
      setAssignError('Enter an email and choose a role.');
      return;
    }

    setAssigning(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch('/.netlify/functions/assign-user-role', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: assignEmail,
        fullName: assignName,
        roleCode: assignRole,
      }),
    });

    const result = (await response.json()) as { error?: string; message?: string };
    setAssigning(false);

    if (!response.ok) {
      setAssignError(result.error ?? 'Could not assign role.');
      return;
    }

    setAssignMessage(result.message ?? 'Role assigned.');
    setAssignEmail('');
    setAssignName('');
    setAssignRole('viewer');
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
        <h2>Invite User</h2>
        <p>Send a Supabase invite email. After the user accepts, assign their ERP role and access scope.</p>

        <div className="form-row">
          <div className="field">
            <label htmlFor="invite-name">Full name</label>
            <input
              id="invite-name"
              onChange={(event) => setInviteName(event.target.value)}
              placeholder="User name"
              value={inviteName}
            />
          </div>
          <div className="field">
            <label htmlFor="invite-email">Email</label>
            <input
              id="invite-email"
              inputMode="email"
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="user@company.com"
              type="email"
              value={inviteEmail}
            />
          </div>
          <button className="primary-button form-row-button" disabled={inviting} onClick={inviteUser} type="button">
            {inviting ? 'Sending...' : 'Send invite'}
          </button>
        </div>

        {inviteMessage ? <div className="notice">{inviteMessage}</div> : null}
        {inviteError ? <div className="error">{inviteError}</div> : null}
      </div>

      <div className="card">
        <h2>Assign Role</h2>
        <p>Create or update an ERP profile for an existing Supabase Auth user.</p>

        <div className="form-row role-form-row">
          <div className="field">
            <label htmlFor="assign-name">Full name</label>
            <input
              id="assign-name"
              onChange={(event) => setAssignName(event.target.value)}
              placeholder="User name"
              value={assignName}
            />
          </div>
          <div className="field">
            <label htmlFor="assign-email">Email</label>
            <input
              id="assign-email"
              inputMode="email"
              onChange={(event) => setAssignEmail(event.target.value)}
              placeholder="user@company.com"
              type="email"
              value={assignEmail}
            />
          </div>
          <div className="field">
            <label htmlFor="assign-role">Role</label>
            <select id="assign-role" onChange={(event) => setAssignRole(event.target.value as RoleCode)} value={assignRole}>
              {Object.entries(ROLE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button className="primary-button form-row-button" disabled={assigning} onClick={assignRoleToUser} type="button">
            {assigning ? 'Assigning...' : 'Assign role'}
          </button>
        </div>

        {assignMessage ? <div className="notice">{assignMessage}</div> : null}
        {assignError ? <div className="error">{assignError}</div> : null}
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

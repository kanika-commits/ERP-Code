'use client';

import { useEffect, useState } from 'react';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { ROLE_LABELS, type RoleCode } from '@/lib/roles';
import { supabase } from '@/lib/supabase';
import { useCurrentUserAccess } from '@/lib/useCurrentUserAccess';

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

type ApiResult = {
  error?: string;
  message?: string;
};

function normalizeRole(row: UserRoleRow) {
  return Array.isArray(row.roles) ? row.roles[0] ?? null : row.roles;
}

function UsersDirectory() {
  const { isAdmin, isPlatformOwner, loading: loadingAccess } = useCurrentUserAccess();
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
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyUserId, setBusyUserId] = useState('');

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

    if (profileError || roleError) {
      setError(profileError?.message || roleError?.message || 'Could not load users.');
    } else {
      setProfiles(profileData ?? []);
      setUserRoles((roleData ?? []) as UserRoleRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function roleRowsForUser(userId: string) {
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

  function rolesForUser(userId: string) {
    return userRoles
      .filter((row) => row.user_id === userId)
      .map((row) => {
        const role = normalizeRole(row);
        if (!role) return null;
        return {
          code: role.code,
          label: ROLE_LABELS[role.code] ?? role.name,
          scopeLabel: row.scope_type === 'global' ? 'Global' : row.scope_type,
        };
      })
      .filter((role): role is { code: RoleCode; label: string; scopeLabel: string } => Boolean(role));
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

    const response = await fetch('/api/invite-user', {
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
    await loadUsers();
  }

  function editUser(profile: Profile) {
    const editableRole = rolesForUser(profile.id).find((role) => !['platform_owner', 'super_admin'].includes(role.code));
    setAssignEmail(profile.email);
    setAssignName(profile.full_name || '');
    setAssignRole(editableRole?.code ?? 'viewer');
    setAssignMessage('');
    setAssignError('');
    setActionMessage(`Editing ${profile.full_name || profile.email}. Choose a role and save.`);
    setActionError('');
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

    const response = await fetch('/api/assign-user-role', {
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
    await loadUsers();
  }

  async function postAdminAction(url: string, body: Record<string, unknown>) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = (await response.json()) as ApiResult;

    if (!response.ok) {
      throw new Error(result.error ?? 'Action failed.');
    }

    return result.message ?? 'Updated.';
  }

  async function removeRole(profile: Profile, roleCode: RoleCode) {
  setActionMessage('');
  setActionError('');

  if (!isPlatformOwner && ['platform_owner', 'super_admin'].includes(roleCode)) {
    setActionError('Only Platform Owner can remove protected roles.');
    return;
  }

  if (roleCode === 'platform_owner') {
    const platformOwnerCount = userRoles.filter((row) => {
      const role = normalizeRole(row);
      return role?.code === 'platform_owner';
    }).length;

    if (platformOwnerCount <= 1) {
      setActionError('Cannot remove the last Platform Owner.');
      return;
    }
  }

  setBusyUserId(profile.id);

  try {
    const message = await postAdminAction('/api/remove-user-role', {
      roleCode,
      userId: profile.id,
    });
    setActionMessage(`${message} ${profile.full_name || profile.email} updated.`);
    await loadUsers();
  } catch (action) {
    setActionError(action instanceof Error ? action.message : 'Could not remove role.');
  } finally {
    setBusyUserId('');
  }
}

  async function updateUserStatus(profile: Profile, status: 'active' | 'inactive') {
    setActionMessage('');
    setActionError('');
    setBusyUserId(profile.id);

    try {
      const message = await postAdminAction('/api/update-user-status', {
        status,
        userId: profile.id,
      });
      setActionMessage(`${message} ${profile.full_name || profile.email} updated.`);
      await loadUsers();
    } catch (action) {
      setActionError(action instanceof Error ? action.message : 'Could not update user.');
    } finally {
      setBusyUserId('');
    }
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
                  <th>Actions</th>
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
                      <td>
                        {assignedRoles.length ? (
                          <div className="role-chip-list">
                            {assignedRoles.map((role) => (
                              <span className="role-chip" key={`${profile.id}-${role.code}`}>
                                {role.label}
                                <small>{role.scopeLabel}</small>
                              </span>
                            ))}
                          </div>
                        ) : (
                          'No role assigned'
                        )}
                      </td>
                      <td>{profile.vendor_id ? 'Vendor-scoped' : 'Internal / global'}</td>
                      <td>
                        <div className="row-actions">
                          <button className="ghost-button compact-button" type="button" onClick={() => editUser(profile)}>
                            Edit role
                          </button>
                          {assignedRoles
                            .filter((role) => isPlatformOwner || !['platform_owner', 'super_admin'].includes(role.code))
                            .map((role) => (
                              <button
                                className="ghost-button compact-button"
                                disabled={busyUserId === profile.id}
                                key={`remove-${profile.id}-${role.code}`}
                                type="button"
                                onClick={() => removeRole(profile, role.code)}
                              >
                                Remove {role.label}
                              </button>
                            ))}
                          <button
                            className="ghost-button compact-button"
                            disabled={busyUserId === profile.id}
                            type="button"
                            onClick={() => updateUserStatus(profile, profile.status === 'active' ? 'inactive' : 'active')}
                          >
                            {profile.status === 'active' ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {actionMessage ? <div className="notice">{actionMessage}</div> : null}
        {actionError ? <div className="error">{actionError}</div> : null}
      </div>

      <div className="card">
        <h2>Invite User</h2>
        {loadingAccess ? <p>Checking admin access...</p> : null}
        {!loadingAccess && !isAdmin ? <p>Only Admin and Super Admin users can invite new ERP users.</p> : null}
        {!loadingAccess && isAdmin ? (
          <>
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
          </>
        ) : null}
      </div>

      <div className="card">
        <h2>Assign Role</h2>
        {loadingAccess ? <p>Checking admin access...</p> : null}
        {!loadingAccess && !isAdmin ? <p>Only Admin and Super Admin users can assign ERP roles.</p> : null}
        {!loadingAccess && isAdmin ? (
          <>
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
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { isAdmin, isPlatformOwner, loading } = useCurrentUserAccess();

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
            {isPlatformOwner ? (
              <div className="import-banner">
                <div>
                  <strong>Company and module setup</strong>
                  <span>Review company setup. Module packages are controlled by the ERP product owner.</span>
                </div>
                <a className="ghost-button compact-button" href="/admin/company">
                  Open company setup
                </a>
              </div>
            ) : null}
            {isAdmin ? (
              <div className="import-banner">
                <div>
                  <strong>Permission setup</strong>
                  <span>Review role templates, permission actions, and the user-specific override model.</span>
                </div>
                <a className="ghost-button compact-button" href="/admin/permissions">
                  Open permissions
                </a>
              </div>
            ) : null}
            {loading ? (
              <div className="card">Checking access...</div>
            ) : isAdmin ? (
              <UsersDirectory />
            ) : (
              <div className="card">
                <h2>Access Restricted</h2>
                <p>Only Admin and Super Admin users can manage ERP users and roles.</p>
              </div>
            )}
          </section>
        </main>
      )}
    </ProtectedPage>
  );
}

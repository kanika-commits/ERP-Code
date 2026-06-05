'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { accessActions, accessModules, permissionCode } from '@/lib/accessControl';
import { ROLE_LABELS } from '@/lib/roles';
import { supabase } from '@/lib/supabase';
import { useCurrentUserAccess } from '@/lib/useCurrentUserAccess';

type RoleRow = {
  code: string;
  description: string | null;
  id: string;
  is_system: boolean | null;
  name: string;
};

type PermissionRow = {
  action: string;
  code: string;
  id: string;
  is_sensitive: boolean;
  module_code: string;
  name: string;
  resource: string;
};

type RolePermissionRow = {
  permission_id: string;
  role_id: string;
};

type CompanyRow = {
  company_code: string;
  id: string;
  name: string;
};

type SiteRow = {
  company_id: string | null;
  id: string;
  name: string;
};

type ApiResult = {
  error?: string;
  message?: string;
};

function roleLabel(role: RoleRow) {
  return ROLE_LABELS[role.code] ?? role.name;
}

function PermissionsBuilder() {
  const { isAdmin, loading: loadingAccess } = useCurrentUserAccess();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [selectedRoleCode, setSelectedRoleCode] = useState('');
  const [selectedPermissionCodes, setSelectedPermissionCodes] = useState<Set<string>>(new Set());
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [assignEmail, setAssignEmail] = useState('');
  const [assignRoleCode, setAssignRoleCode] = useState('');
  const [assignModuleCode, setAssignModuleCode] = useState('work_orders');
  const [assignCompanyIds, setAssignCompanyIds] = useState<Set<string>>(new Set());
  const [assignSiteIds, setAssignSiteIds] = useState<Set<string>>(new Set());
  const [approvalCompanyId, setApprovalCompanyId] = useState('');
  const [approvalModuleCode, setApprovalModuleCode] = useState('payments');
  const [approvalAction, setApprovalAction] = useState('add');
  const [approvalRoleCode, setApprovalRoleCode] = useState('');
  const [approvalSiteId, setApprovalSiteId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedRole = roles.find((role) => role.code === selectedRoleCode);

  const rolePermissionIds = useMemo(() => {
    const role = roles.find((item) => item.code === selectedRoleCode);
    if (!role) return new Set<string>();
    return new Set(rolePermissions.filter((item) => item.role_id === role.id).map((item) => item.permission_id));
  }, [rolePermissions, roles, selectedRoleCode]);

  async function loadBuilderData() {
    setLoading(true);
    setError('');

    const [roleResult, permissionResult, rolePermissionResult, companyResult, siteResult] = await Promise.all([
      supabase.from('roles').select('id,code,name,description,is_system').order('name', { ascending: true }),
      supabase.from('permissions').select('id,code,module_code,resource,action,name,is_sensitive').order('module_code', { ascending: true }),
      supabase.from('role_permissions').select('role_id,permission_id'),
      supabase.from('companies').select('id,company_code,name').order('name', { ascending: true }),
      supabase.from('sites').select('id,name,company_id').order('name', { ascending: true }),
    ]);

    const loadError =
      roleResult.error?.message ||
      permissionResult.error?.message ||
      rolePermissionResult.error?.message ||
      companyResult.error?.message ||
      siteResult.error?.message ||
      '';

    if (loadError) {
      setError(`${loadError}. Run supabase/master-access-control-schema.sql if this page is not ready yet.`);
    } else {
      const loadedRoles = (roleResult.data ?? []) as RoleRow[];
      setRoles(loadedRoles);
      setPermissions((permissionResult.data ?? []) as PermissionRow[]);
      setRolePermissions((rolePermissionResult.data ?? []) as RolePermissionRow[]);
      setCompanies((companyResult.data ?? []) as CompanyRow[]);
      setSites((siteResult.data ?? []) as SiteRow[]);
      setSelectedRoleCode((current) => current || loadedRoles.find((role) => role.code === 'viewer')?.code || loadedRoles[0]?.code || '');
      setAssignRoleCode((current) => current || loadedRoles.find((role) => role.code === 'viewer')?.code || loadedRoles[0]?.code || '');
      setApprovalRoleCode((current) => current || loadedRoles.find((role) => role.code === 'accounts')?.code || loadedRoles[0]?.code || '');
      setApprovalCompanyId((current) => current || companyResult.data?.[0]?.id || '');
      setAssignCompanyIds((current) => {
        if (current.size) return current;
        const firstCompany = companyResult.data?.[0]?.id;
        return firstCompany ? new Set([firstCompany]) : current;
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    loadBuilderData();
  }, []);

  useEffect(() => {
    const codes = permissions.filter((permission) => rolePermissionIds.has(permission.id)).map((permission) => permission.code);
    setSelectedPermissionCodes(new Set(codes));
  }, [permissions, rolePermissionIds]);

  async function postJson(url: string, body: Record<string, unknown>) {
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

    return result.message ?? 'Saved.';
  }

  async function createRole() {
    setSaving('role');
    setMessage('');
    setError('');

    try {
      const saveMessage = await postJson('/api/create-custom-role', {
        description: newRoleDescription,
        name: newRoleName,
      });
      setMessage(saveMessage);
      setNewRoleName('');
      setNewRoleDescription('');
      await loadBuilderData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not create role.');
    } finally {
      setSaving('');
    }
  }

  function togglePermission(code: string) {
    setSelectedPermissionCodes((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function saveRolePermissions() {
    if (!selectedRoleCode) return;

    setSaving('permissions');
    setMessage('');
    setError('');

    try {
      const saveMessage = await postJson('/api/save-role-permissions', {
        permissionCodes: Array.from(selectedPermissionCodes),
        roleCode: selectedRoleCode,
      });
      setMessage(saveMessage);
      await loadBuilderData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save permissions.');
    } finally {
      setSaving('');
    }
  }

  async function assignUserAccess() {
    setSaving('assign');
    setMessage('');
    setError('');

    try {
      const saveMessage = await postJson('/api/assign-user-access', {
        companyIds: Array.from(assignCompanyIds),
        email: assignEmail,
        moduleCode: assignModuleCode,
        roleCode: assignRoleCode,
        siteIds: Array.from(assignSiteIds),
      });
      setMessage(saveMessage);
      setAssignEmail('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not assign user access.');
    } finally {
      setSaving('');
    }
  }

  async function saveApprovalControl() {
    setSaving('approval');
    setMessage('');
    setError('');

    try {
      const saveMessage = await postJson('/api/save-approval-control', {
        action: approvalAction,
        companyId: approvalCompanyId,
        moduleCode: approvalModuleCode,
        roleCode: approvalRoleCode,
        siteId: approvalSiteId || null,
      });
      setMessage(saveMessage);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save approval control.');
    } finally {
      setSaving('');
    }
  }

  function toggleSetValue(setter: (next: Set<string>) => void, current: Set<string>, value: string) {
    const next = new Set(current);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  if (loadingAccess || loading) {
    return <div className="card">Loading access control...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="card">
        <h2>Access Restricted</h2>
        <p>Only ERP admins can manage roles, scopes, and approval controls.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      {message ? <div className="notice">{message}</div> : null}
      {error ? <div className="error">{error}</div> : null}

      <div className="grid">
        <article className="card">
          <h2>Custom Role Builder</h2>
          <p>Create roles such as Payment Entry User, Invoice Reviewer, Work Order Approver, Site RA Bill Entry User, or Vendor Manager.</p>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="role-name">Role name</label>
              <input id="role-name" onChange={(event) => setNewRoleName(event.target.value)} placeholder="Payment Entry User" value={newRoleName} />
            </div>
            <div className="field">
              <label htmlFor="role-description">Description</label>
              <input
                id="role-description"
                onChange={(event) => setNewRoleDescription(event.target.value)}
                placeholder="Can add payments but cannot approve"
                value={newRoleDescription}
              />
            </div>
          </div>
          <button className="primary-button action-row" disabled={saving === 'role'} onClick={createRole} type="button">
            {saving === 'role' ? 'Saving...' : 'Create role'}
          </button>
        </article>

        <article className="card">
          <h2>User Scope Assignment</h2>
          <p>Assign a role to one or multiple companies/sites. Site-scoped roles will later hide records outside those sites.</p>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="assign-email">User email</label>
              <input id="assign-email" onChange={(event) => setAssignEmail(event.target.value)} placeholder="user@company.com" value={assignEmail} />
            </div>
            <div className="field">
              <label htmlFor="assign-role">Role</label>
              <select id="assign-role" onChange={(event) => setAssignRoleCode(event.target.value)} value={assignRoleCode}>
                {roles.map((role) => (
                  <option key={role.id} value={role.code}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="assign-module">Module</label>
              <select id="assign-module" onChange={(event) => setAssignModuleCode(event.target.value)} value={assignModuleCode}>
                {accessModules.map((module) => (
                  <option key={module.code} value={module.code}>
                    {module.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="check-grid">
            <div>
              <strong>Companies</strong>
              {companies.map((company) => (
                <label className="check-row" key={company.id}>
                  <input
                    checked={assignCompanyIds.has(company.id)}
                    onChange={() => toggleSetValue(setAssignCompanyIds, assignCompanyIds, company.id)}
                    type="checkbox"
                  />
                  {company.name}
                </label>
              ))}
            </div>
            <div>
              <strong>Sites</strong>
              {sites.map((site) => (
                <label className="check-row" key={site.id}>
                  <input
                    checked={assignSiteIds.has(site.id)}
                    onChange={() => toggleSetValue(setAssignSiteIds, assignSiteIds, site.id)}
                    type="checkbox"
                  />
                  {site.name}
                </label>
              ))}
            </div>
          </div>
          <button className="primary-button action-row" disabled={saving === 'assign'} onClick={assignUserAccess} type="button">
            {saving === 'assign' ? 'Assigning...' : 'Assign access'}
          </button>
        </article>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Role Permission Matrix</h2>
            <p>Choose exactly what a role can do by module and action. Super Admin sees everything; other users see only assigned permissions.</p>
          </div>
          <div className="field inline-field">
            <label htmlFor="selected-role">Role</label>
            <select id="selected-role" onChange={(event) => setSelectedRoleCode(event.target.value)} value={selectedRoleCode}>
              {roles.map((role) => (
                <option key={role.id} value={role.code}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedRole ? (
          <p className="muted-text">
            Editing {roleLabel(selectedRole)}
            {selectedRole.description ? `: ${selectedRole.description}` : ''}
          </p>
        ) : null}

        <div className="table-wrap">
          <table className="data-table permission-matrix">
            <thead>
              <tr>
                <th>Module</th>
                {accessActions.map((action) => (
                  <th key={action}>{action}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accessModules.map((module) => (
                <tr key={module.code}>
                  <td>
                    <strong>{module.name}</strong>
                  </td>
                  {accessActions.map((action) => {
                    const code = permissionCode(module.code, action);
                    const permission = permissions.find((item) => item.code === code);
                    const checked = selectedPermissionCodes.has(code);
                    return (
                      <td key={code}>
                        {permission ? (
                          <label className="matrix-check">
                            <input checked={checked} onChange={() => togglePermission(code)} type="checkbox" />
                            <span className={permission.is_sensitive ? 'danger-pill' : 'status-pill'}>{code}</span>
                          </label>
                        ) : (
                          <span className="muted-text">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button className="primary-button action-row" disabled={saving === 'permissions'} onClick={saveRolePermissions} type="button">
          {saving === 'permissions' ? 'Saving...' : 'Save role permissions'}
        </button>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Approval Control</h2>
            <p>Decide who can add, approve, reject, or only view records for each module. This is where maker-checker rules begin.</p>
          </div>
          <span className="pill">Maker / Checker</span>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="approval-company">Company</label>
            <select id="approval-company" onChange={(event) => setApprovalCompanyId(event.target.value)} value={approvalCompanyId}>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="approval-module">Module</label>
            <select id="approval-module" onChange={(event) => setApprovalModuleCode(event.target.value)} value={approvalModuleCode}>
              {accessModules.map((module) => (
                <option key={module.code} value={module.code}>
                  {module.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="approval-action">Action</label>
            <select id="approval-action" onChange={(event) => setApprovalAction(event.target.value)} value={approvalAction}>
              {accessActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="approval-role">Allowed role</label>
            <select id="approval-role" onChange={(event) => setApprovalRoleCode(event.target.value)} value={approvalRoleCode}>
              {roles.map((role) => (
                <option key={role.id} value={role.code}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="approval-site">Site scope</label>
            <select id="approval-site" onChange={(event) => setApprovalSiteId(event.target.value)} value={approvalSiteId}>
              <option value="">All assigned sites</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className="primary-button action-row" disabled={saving === 'approval'} onClick={saveApprovalControl} type="button">
          {saving === 'approval' ? 'Saving...' : 'Save approval control'}
        </button>
      </div>
    </div>
  );
}

export default function PermissionsPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <section className="page">
            <div className="page-title">
              <h1>Role & Permission Builder</h1>
              <p>Create custom roles, assign company/site/module access, and set maker-checker approval rules.</p>
            </div>
            <PermissionsBuilder />
          </section>
        </main>
      )}
    </ProtectedPage>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { contractPermissions, defaultRolePermissionCodes, permissionActions } from '@/lib/permissionDefinitions';
import { ROLE_LABELS } from '@/lib/roles';
import { supabase } from '@/lib/supabase';
import { useCurrentUserAccess } from '@/lib/useCurrentUserAccess';

type PermissionCountState = {
  assignments: number | null;
  error: string;
  overrides: number | null;
  permissions: number | null;
  rolePermissions: number | null;
};

const deletePermissionCodes = new Set<string>(
  contractPermissions.filter((permission) => permission.action === 'delete').map((permission) => permission.code),
);

function countPermissions(roleCode: string) {
  const codes = defaultRolePermissionCodes[roleCode] ?? [];
  return {
    deleteCount: codes.filter((code) => deletePermissionCodes.has(code)).length,
    total: codes.length,
  };
}

function PermissionSettings() {
  const { isAdmin, loading: loadingAccess } = useCurrentUserAccess();
  const [counts, setCounts] = useState<PermissionCountState>({
    assignments: null,
    error: '',
    overrides: null,
    permissions: null,
    rolePermissions: null,
  });

  const resources = useMemo(() => Array.from(new Set(contractPermissions.map((permission) => permission.resource))), []);

  useEffect(() => {
    let mounted = true;

    async function loadCounts() {
      const [permissions, rolePermissions, assignments, overrides] = await Promise.all([
        supabase.from('permissions').select('id', { count: 'exact', head: true }),
        supabase.from('role_permissions').select('id', { count: 'exact', head: true }),
        supabase.from('user_access_assignments').select('id', { count: 'exact', head: true }),
        supabase.from('user_permission_overrides').select('id', { count: 'exact', head: true }),
      ]);

      if (!mounted) return;

      const error =
        permissions.error?.message ||
        rolePermissions.error?.message ||
        assignments.error?.message ||
        overrides.error?.message ||
        '';

      setCounts({
        assignments: assignments.count,
        error,
        overrides: overrides.count,
        permissions: permissions.count,
        rolePermissions: rolePermissions.count,
      });
    }

    loadCounts();

    return () => {
      mounted = false;
    };
  }, []);

  if (loadingAccess) {
    return <div className="card">Checking permission access...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="card">
        <h2>Access Restricted</h2>
        <p>Only ERP admins can review permission setup.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="grid">
        <div className="card">
          <h2>Role Templates</h2>
          <p>Roles create a sensible starting point, such as Viewer, Module Admin, Accounts, or Approver.</p>
          <div className="metric">{Object.keys(defaultRolePermissionCodes).length}</div>
        </div>
        <div className="card">
          <h2>User Overrides</h2>
          <p>One user can be given a special allow or deny without changing everyone else with the same role.</p>
          <div className="metric">{counts.overrides ?? 0}</div>
        </div>
        <div className="card">
          <h2>Delete Guard</h2>
          <p>Delete is treated as sensitive. By default it is reserved for Platform Owner and Super Admin.</p>
          <div className="metric">Locked</div>
        </div>
      </div>

      {counts.error ? (
        <div className="error">
          Permission tables are not fully ready yet. Run the Supabase permission SQL, then refresh this page.
        </div>
      ) : null}

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Permission Storage</h2>
            <p>These numbers come from Supabase and confirm that the backend permission layer exists.</p>
          </div>
          <span className="pill">Contract Management</span>
        </div>
        <div className="module-summary-grid">
          <div className="summary-item">
            <span>Permissions</span>
            <strong>{counts.permissions ?? 'Run SQL'}</strong>
          </div>
          <div className="summary-item">
            <span>Role Defaults</span>
            <strong>{counts.rolePermissions ?? 'Run SQL'}</strong>
          </div>
          <div className="summary-item">
            <span>Scoped Assignments</span>
            <strong>{counts.assignments ?? 'Run SQL'}</strong>
          </div>
          <div className="summary-item">
            <span>User Overrides</span>
            <strong>{counts.overrides ?? 'Run SQL'}</strong>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Contract Permission Matrix</h2>
            <p>Every workflow action gets its own permission, so buttons and API routes can be controlled cleanly.</p>
          </div>
          <span className="pill">{contractPermissions.length} actions</span>
        </div>

        <div className="table-wrap">
          <table className="data-table permission-matrix">
            <thead>
              <tr>
                <th>Resource</th>
                {permissionActions.map((action) => (
                  <th key={action}>{action}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => (
                <tr key={resource}>
                  <td>
                    <strong>{resource}</strong>
                  </td>
                  {permissionActions.map((action) => {
                    const permission = contractPermissions.find((item) => item.resource === resource && item.action === action);
                    return (
                      <td key={`${resource}-${action}`}>
                        {permission ? (
                          <span className={action === 'delete' ? 'danger-pill' : 'status-pill'}>{permission.code}</span>
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
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Role Defaults</h2>
            <p>Defaults give speed. User-specific overrides give flexibility when two people have the same role but different rights.</p>
          </div>
          <span className="pill">Templates</span>
        </div>

        <div className="role-template-grid">
          {Object.entries(defaultRolePermissionCodes).map(([roleCode, permissionCodes]) => {
            const totals = countPermissions(roleCode);
            return (
              <article className="summary-item" key={roleCode}>
                <span>{ROLE_LABELS[roleCode as keyof typeof ROLE_LABELS] ?? roleCode}</span>
                <strong>{totals.total} permissions</strong>
                <p>{totals.deleteCount ? `${totals.deleteCount} delete permissions included` : 'No delete permission by default'}</p>
              </article>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h2>How Final Access Works</h2>
        <p>
          First the ERP checks company and module access, then role defaults, then user overrides. A deny override should win
          over an allow, and delete remains the most restricted action.
        </p>
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
              <h1>Permissions</h1>
              <p>Design the role, scope, and per-user override layer for ERP access control.</p>
            </div>
            <PermissionSettings />
          </section>
        </main>
      )}
    </ProtectedPage>
  );
}

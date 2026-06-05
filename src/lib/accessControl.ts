export const accessModules = [
  { code: 'companies', name: 'Companies' },
  { code: 'sites', name: 'Sites' },
  { code: 'vendors', name: 'Vendors' },
  { code: 'work_orders', name: 'Work Orders' },
  { code: 'ra_bills', name: 'RA Bills' },
  { code: 'invoices', name: 'Invoices' },
  { code: 'payments', name: 'Payments' },
  { code: 'debit_notes', name: 'Debit Notes' },
  { code: 'files', name: 'Files' },
  { code: 'reports', name: 'Reports' },
] as const;

export const accessActions = ['view', 'add', 'edit', 'delete', 'upload', 'approve', 'reject'] as const;

export type AccessModuleCode = (typeof accessModules)[number]['code'];
export type AccessAction = (typeof accessActions)[number];

export type AccessAssignment = {
  company_id: string | null;
  module_code: string | null;
  scope_id: string | null;
  scope_type: string;
  status: string;
};

export type CurrentUserPermissionContext = {
  accessAssignments?: AccessAssignment[];
  isAdmin?: boolean;
  isCompanyOwner?: boolean;
  isPlatformOwner?: boolean;
  isSuperAdmin?: boolean;
  permissionCodes?: string[];
  roles?: string[];
};

export function permissionCode(moduleCode: string, action: string) {
  return `${moduleCode}.${action}`;
}

export function can(user: CurrentUserPermissionContext, resource: string, action: string) {
  if (user.isPlatformOwner || user.isSuperAdmin) return true;

  const code = permissionCode(resource, action);
  return Boolean(user.permissionCodes?.includes(code));
}

export function canAccessRecord(
  user: CurrentUserPermissionContext,
  companyId?: string | null,
  siteId?: string | null,
) {
  if (user.isPlatformOwner || user.isSuperAdmin) return true;

  const assignments = user.accessAssignments ?? [];
  if (!companyId && !siteId) return assignments.length > 0 || Boolean(user.isAdmin || user.isCompanyOwner);

  return assignments.some((assignment) => {
    if (assignment.status !== 'active') return false;
    if (siteId && assignment.scope_type === 'site' && assignment.scope_id === siteId) return true;
    if (companyId && assignment.company_id === companyId) return true;
    return false;
  });
}

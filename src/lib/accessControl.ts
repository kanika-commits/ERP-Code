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

export function permissionCode(moduleCode: string, action: string) {
  return `${moduleCode}.${action}`;
}

export type RoleCode =
  | 'super_admin'
  | 'admin'
  | 'project_manager'
  | 'site_engineer'
  | 'accounts'
  | 'approver'
  | 'vendor'
  | 'viewer';

export const ROLE_LABELS: Record<RoleCode, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  project_manager: 'Project Manager',
  site_engineer: 'Site Engineer',
  accounts: 'Accounts',
  approver: 'Approver',
  vendor: 'Vendor',
  viewer: 'Viewer',
};


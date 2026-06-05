export type RoleCode =
  | 'platform_owner'
  | 'company_owner'
  | 'super_admin'
  | 'admin'
  | 'module_admin'
  | 'manager'
  | 'project_manager'
  | 'site_engineer'
  | 'accounts'
  | 'approver'
  | 'staff'
  | 'vendor'
  | 'viewer';

export const ROLE_LABELS: Record<RoleCode, string> = {
  platform_owner: 'Platform Owner',
  company_owner: 'Company Owner',
  super_admin: 'Super Admin',
  admin: 'Admin',
  module_admin: 'Module Admin',
  manager: 'Manager',
  project_manager: 'Project Manager',
  site_engineer: 'Site Engineer',
  accounts: 'Accounts',
  approver: 'Approver',
  staff: 'Staff',
  vendor: 'Vendor',
  viewer: 'Viewer',
};

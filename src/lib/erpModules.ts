export const erpModules = [
  {
    code: 'masters',
    description: 'Central ERP lists for vendors, sites, projects, users, roles, files, and future control masters.',
    href: '/masters',
    name: 'Master Data',
    status: 'Active',
  },
  {
    code: 'reports',
    description: 'Cross-module exceptions for outstanding, overbilling, missing documents, KYC gaps, GST, and ITC.',
    href: '/reports',
    name: 'Reports & Exceptions',
    status: 'Active',
  },
  {
    code: 'projects',
    description: 'Projects, sites, project dashboards, progress, documents, and project-level cost tracking.',
    href: '/projects',
    name: 'Project Management',
    status: 'Active',
  },
  {
    code: 'contract_management',
    description: 'Work orders, RA bills, invoices, payments, debit notes, files, approvals, and ledgers.',
    href: '/contract-management',
    name: 'Contract Management',
    status: 'Active',
  },
  {
    code: 'procurement',
    description: 'Vendor requests, RFQs, quotations, comparative statements, and procurement approvals.',
    href: '/procurement',
    name: 'Procurement',
    status: 'Active',
  },
  {
    code: 'purchase',
    description: 'Purchase orders, delivery/receipt tracking, vendor bills, and three-way matching.',
    href: '/purchase',
    name: 'Purchase',
    status: 'Active',
  },
  {
    code: 'finance',
    description: 'Payables, receivables, GST/ITC, TDS, bank payments, reconciliations, and finance reports.',
    href: '/finance',
    name: 'Finance & Accounts',
    status: 'Active',
  },
  {
    code: 'hr',
    description: 'Employees, attendance, leave, payroll, reimbursements, documents, and internal HR workflows.',
    href: '/hr',
    name: 'HR',
    status: 'Active',
  },
  {
    code: 'admin',
    description: 'Users, roles, permissions, number formats, approval rules, audit logs, and company settings.',
    href: '/admin/users',
    name: 'Admin & Settings',
    status: 'Active',
  },
] as const;

export type ErpModuleCode = (typeof erpModules)[number]['code'];
export type ErpModule = (typeof erpModules)[number];

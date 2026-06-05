'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AccessAssignment } from '@/lib/accessControl';
import { supabase } from '@/lib/supabase';
import type { RoleCode } from '@/lib/roles';

type Profile = {
  full_name: string | null;
  email: string;
  status: string;
};

type UserRoleRow = {
  scope_type: string;
  roles:
    | {
        id: string;
        code: RoleCode;
        name: string;
      }
    | {
        id: string;
        code: RoleCode;
        name: string;
      }[]
    | null;
};

type RolePermissionRow = {
  allowed: boolean;
  permissions:
    | {
        code: string;
      }
    | {
        code: string;
      }[]
    | null;
};

function normalizeRole(row: UserRoleRow) {
  return Array.isArray(row.roles) ? row.roles[0] ?? null : row.roles;
}

function isRole(role: ReturnType<typeof normalizeRole>): role is NonNullable<ReturnType<typeof normalizeRole>> {
  return Boolean(role);
}

function normalizePermission(row: RolePermissionRow) {
  return Array.isArray(row.permissions) ? row.permissions[0] ?? null : row.permissions;
}

export function useCurrentUserAccess() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<RoleCode[]>([]);
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);
  const [accessAssignments, setAccessAssignments] = useState<AccessAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadAccess() {
      setLoading(true);
      setError('');

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!user || userError) {
        if (!mounted) return;
        setError(userError?.message || 'No signed-in user.');
        setProfile(null);
        setRoles([]);
        setPermissionCodes([]);
        setAccessAssignments([]);
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name,email,status')
        .eq('id', user.id)
        .single();

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('scope_type,roles(id,code,name)')
        .eq('user_id', user.id);

      const normalizedRoles = ((roleData ?? []) as UserRoleRow[]).map(normalizeRole).filter(isRole);
      const roleIds = normalizedRoles.map((role) => role.id);

      const [rolePermissionResult, assignmentResult] = await Promise.all([
        roleIds.length
          ? supabase
              .from('role_permissions')
              .select('allowed,permissions(code)')
              .in('role_id', roleIds)
              .eq('allowed', true)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('user_access_assignments')
          .select('company_id,module_code,scope_id,scope_type,status')
          .eq('user_id', user.id)
          .eq('status', 'active'),
      ]);

      if (!mounted) return;

      if (profileError || roleError || rolePermissionResult.error || assignmentResult.error) {
        setError(
          profileError?.message ||
            roleError?.message ||
            rolePermissionResult.error?.message ||
            assignmentResult.error?.message ||
            'Could not load access.',
        );
        setProfile(null);
        setRoles([]);
        setPermissionCodes([]);
        setAccessAssignments([]);
      } else {
        const roleCodes = normalizedRoles
          .map((role) => role?.code)
          .filter((code): code is RoleCode => Boolean(code));
        const codes = ((rolePermissionResult.data ?? []) as RolePermissionRow[])
          .filter((row) => row.allowed)
          .map(normalizePermission)
          .map((permission) => permission?.code)
          .filter((code): code is string => Boolean(code));

        setProfile(profileData);
        setRoles(roleCodes);
        setPermissionCodes(Array.from(new Set(codes)));
        setAccessAssignments((assignmentResult.data ?? []) as AccessAssignment[]);
      }

      setLoading(false);
    }

    loadAccess();

    return () => {
      mounted = false;
    };
  }, []);

  const access = useMemo(() => {
    const isPlatformOwner = roles.includes('platform_owner');
    const isSuperAdmin = roles.includes('super_admin');
    const isCompanyOwner = roles.includes('company_owner') || isSuperAdmin;
    const isAdmin = isPlatformOwner || isCompanyOwner || roles.includes('admin');
    const isInternal =
      isAdmin ||
      roles.includes('accounts') ||
      roles.includes('company_owner') ||
      roles.includes('manager') ||
      roles.includes('module_admin') ||
      roles.includes('project_manager') ||
      roles.includes('site_engineer') ||
      roles.includes('approver') ||
      roles.includes('staff') ||
      roles.includes('viewer');
    const isVendor = roles.includes('vendor');

    return {
      isAdmin,
      isCompanyOwner,
      isInternal,
      isPlatformOwner,
      isSuperAdmin,
      isVendor,
    };
  }, [roles]);

  return {
    ...access,
    error,
    accessAssignments,
    loading,
    permissionCodes,
    profile,
    roles,
  };
}

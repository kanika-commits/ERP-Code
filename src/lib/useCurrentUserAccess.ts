'use client';

import { useEffect, useMemo, useState } from 'react';
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

export function useCurrentUserAccess() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<RoleCode[]>([]);
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
        .select('scope_type,roles(code,name)')
        .eq('user_id', user.id);

      if (!mounted) return;

      if (profileError || roleError) {
        setError(profileError?.message || roleError?.message || 'Could not load access.');
        setProfile(null);
        setRoles([]);
      } else {
        const roleCodes = ((roleData ?? []) as UserRoleRow[])
          .map(normalizeRole)
          .map((role) => role?.code)
          .filter((code): code is RoleCode => Boolean(code));

        setProfile(profileData);
        setRoles(roleCodes);
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
    const isAdmin = isPlatformOwner || isSuperAdmin || roles.includes('admin');
    const isInternal =
      isAdmin ||
      roles.includes('accounts') ||
      roles.includes('project_manager') ||
      roles.includes('site_engineer') ||
      roles.includes('approver') ||
      roles.includes('viewer');
    const isVendor = roles.includes('vendor');

    return {
      isAdmin,
      isInternal,
      isPlatformOwner,
      isSuperAdmin,
      isVendor,
    };
  }, [roles]);

  return {
    ...access,
    error,
    loading,
    profile,
    roles,
  };
}

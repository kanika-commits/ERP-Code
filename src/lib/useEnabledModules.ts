'use client';

import { useEffect, useMemo, useState } from 'react';
import { erpModules, type ErpModule, type ErpModuleCode } from '@/lib/erpModules';
import { supabase } from '@/lib/supabase';

type ProfileCompanyRow = {
  company_id: string | null;
  companies:
    | {
        company_code: string;
        name: string;
      }
    | {
        company_code: string;
        name: string;
      }[]
    | null;
};

type CompanyModuleRow = {
  enabled: boolean;
  erp_modules:
    | {
        module_code: string;
      }
    | {
        module_code: string;
      }[]
    | null;
};

function normalizeCompany(row: ProfileCompanyRow | null) {
  if (!row?.companies) return null;
  return Array.isArray(row.companies) ? row.companies[0] ?? null : row.companies;
}

function normalizeModule(row: CompanyModuleRow) {
  if (!row.erp_modules) return null;
  return Array.isArray(row.erp_modules) ? row.erp_modules[0] ?? null : row.erp_modules;
}

export function useEnabledModules() {
  const [enabledCodes, setEnabledCodes] = useState<Set<ErpModuleCode> | null>(null);
  const [companyName, setCompanyName] = useState('MRC');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadModules() {
      setLoading(true);
      setError('');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!mounted) return;
        setEnabledCodes(new Set(erpModules.map((module) => module.code)));
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('company_id,companies(company_code,name)')
        .eq('id', user.id)
        .maybeSingle();

      if (!mounted) return;

      if (profileError || !profileData?.company_id) {
        setEnabledCodes(new Set(erpModules.map((module) => module.code)));
        setError(profileError?.message || '');
        setLoading(false);
        return;
      }

      const company = normalizeCompany(profileData as ProfileCompanyRow);
      if (company?.name) setCompanyName(company.name);

      const { data: moduleData, error: moduleError } = await supabase
        .from('company_modules')
        .select('enabled,erp_modules(module_code)')
        .eq('company_id', profileData.company_id);

      if (!mounted) return;

      if (moduleError) {
        setEnabledCodes(new Set(erpModules.map((module) => module.code)));
        setError(moduleError.message);
      } else {
        const codes = new Set<ErpModuleCode>();
        ((moduleData ?? []) as CompanyModuleRow[]).forEach((row) => {
          const module = normalizeModule(row);
          const code = module?.module_code as ErpModuleCode | undefined;
          if (row.enabled && code && erpModules.some((localModule) => localModule.code === code)) {
            codes.add(code);
          }
        });
        setEnabledCodes(codes.size ? codes : new Set(erpModules.map((module) => module.code)));
      }

      setLoading(false);
    }

    loadModules();

    return () => {
      mounted = false;
    };
  }, []);

  const modules = useMemo<ErpModule[]>(() => {
    if (!enabledCodes) return [...erpModules];
    return erpModules.filter((module) => enabledCodes.has(module.code));
  }, [enabledCodes]);

  return {
    companyName,
    error,
    loading,
    modules,
  };
}

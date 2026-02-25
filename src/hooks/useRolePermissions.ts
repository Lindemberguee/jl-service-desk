import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole, Permission } from '@/lib/permissions';

export interface RolePermissionRow {
  id: string;
  role: AppRole;
  permission: Permission;
  granted: boolean;
}

const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${data.session?.access_token}`,
    'Content-Type': 'application/json',
  };
}

export function useRolePermissions() {
  const qc = useQueryClient();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['role_permissions'],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${BASE_URL}/rest/v1/role_permissions?select=id,role,permission,granted&order=role,permission`,
        { headers }
      );
      if (!res.ok) throw new Error('Erro ao carregar permissões');
      return (await res.json()) as RolePermissionRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const togglePermission = useMutation({
    mutationFn: async ({ role, permission, granted }: { role: AppRole; permission: Permission; granted: boolean }) => {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${BASE_URL}/rest/v1/role_permissions?role=eq.${role}&permission=eq.${permission}`,
        {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({ granted, updated_at: new Date().toISOString() }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || 'Erro ao atualizar');
      }
    },
    onMutate: async ({ role, permission, granted }) => {
      await qc.cancelQueries({ queryKey: ['role_permissions'] });
      const prev = qc.getQueryData<RolePermissionRow[]>(['role_permissions']);
      qc.setQueryData<RolePermissionRow[]>(['role_permissions'], old =>
        old?.map(p => p.role === role && p.permission === permission ? { ...p, granted } : p) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['role_permissions'], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['role_permissions'] });
    },
  });

  const isGranted = (role: AppRole, permission: Permission): boolean => {
    const row = permissions.find(p => p.role === role && p.permission === permission);
    return row?.granted ?? false;
  };

  return { permissions, isLoading, togglePermission, isGranted };
}

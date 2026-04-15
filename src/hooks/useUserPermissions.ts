import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Permission } from '@/lib/permissions';

export interface UserPermissionRow {
  id: string;
  user_id: string;
  tenant_id: string;
  permission: string;
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

export function useUserPermissions(tenantId?: string) {
  const qc = useQueryClient();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['user_permissions', tenantId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      let url = `${BASE_URL}/rest/v1/user_permissions?select=id,user_id,tenant_id,permission,granted&order=user_id,permission`;
      if (tenantId) url += `&tenant_id=eq.${tenantId}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('Erro ao carregar permissões de usuário');
      return (await res.json()) as UserPermissionRow[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const togglePermission = useMutation({
    mutationFn: async ({ user_id, tenant_id, permission, granted }: { user_id: string; tenant_id: string; permission: Permission; granted: boolean }) => {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${BASE_URL}/rest/v1/user_permissions?on_conflict=user_id,tenant_id,permission`,
        {
          method: 'POST',
          headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ user_id, tenant_id, permission, granted, updated_at: new Date().toISOString() }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || 'Erro ao atualizar');
      }
    },
    onMutate: async ({ user_id, permission, granted }) => {
      await qc.cancelQueries({ queryKey: ['user_permissions', tenantId] });
      const prev = qc.getQueryData<UserPermissionRow[]>(['user_permissions', tenantId]);
      qc.setQueryData<UserPermissionRow[]>(['user_permissions', tenantId], old => {
        if (!old) return [];
        const existing = old.find(p => p.user_id === user_id && p.permission === permission);
        if (existing) {
          return old.map(p => p.user_id === user_id && p.permission === permission ? { ...p, granted } : p);
        }
        return [...old, { id: crypto.randomUUID(), user_id, tenant_id: tenantId!, permission, granted }];
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['user_permissions', tenantId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['user_permissions', tenantId] });
    },
  });

  const getUserPermission = (userId: string, permission: Permission): boolean | undefined => {
    const row = permissions.find(p => p.user_id === userId && p.permission === permission);
    return row ? row.granted : undefined;
  };

  const removePermission = useMutation({
    mutationFn: async ({ user_id, permission }: { user_id: string; permission: Permission }) => {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${BASE_URL}/rest/v1/user_permissions?user_id=eq.${user_id}&permission=eq.${permission}&tenant_id=eq.${tenantId}`,
        { method: 'DELETE', headers: { ...headers, Prefer: 'return=minimal' } }
      );
      if (!res.ok) throw new Error('Erro ao remover permissão');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['user_permissions', tenantId] });
    },
  });

  return { permissions, isLoading, togglePermission, getUserPermission, removePermission };
}

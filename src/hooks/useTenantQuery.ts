import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useTenantQuery<T>(
  key: string,
  table: string,
  options?: { select?: string; orderBy?: string; filters?: Record<string, any> }
) {
  const { currentTenantId } = useAuth();

  return useQuery({
    queryKey: [key, currentTenantId, options?.filters],
    queryFn: async () => {
      if (!currentTenantId) return [] as T[];
      let query = (supabase.from as any)(table)
        .select(options?.select || '*')
        .eq('tenant_id', currentTenantId);

      if (options?.filters) {
        Object.entries(options.filters).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            query = query.eq(k, v);
          }
        });
      }

      if (options?.orderBy) {
        query = query.order(options.orderBy, { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as T[];
    },
    enabled: !!currentTenantId,
  });
}

export function useTenantInsert(table: string, invalidateKeys: string[]) {
  const { currentTenantId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      if (!currentTenantId) throw new Error('No tenant selected');
      const { data, error } = await (supabase.from as any)(table)
        .insert({ ...values, tenant_id: currentTenantId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateKeys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useTenantUpdate(table: string, invalidateKeys: string[]) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }: Record<string, any> & { id: string }) => {
      const { data, error } = await (supabase.from as any)(table)
        .update(values)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateKeys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useTenantDelete(table: string, invalidateKeys: string[]) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateKeys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

/**
 * Fetches data from ALL tenants the user belongs to.
 * Useful for showing work orders across multiple departments.
 */
export function useAllTenantsQuery<T>(
  key: string,
  table: string,
  options?: { select?: string; orderBy?: string; filters?: Record<string, any> }
) {
  const { memberships } = useAuth();
  const tenantIds = memberships.map(m => m.tenant_id);

  return useQuery({
    queryKey: [key, 'all_tenants', tenantIds, options?.filters],
    queryFn: async () => {
      if (tenantIds.length === 0) return [] as T[];
      let query = (supabase.from as any)(table)
        .select(options?.select || '*')
        .in('tenant_id', tenantIds);

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
    enabled: tenantIds.length > 0,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Kpi {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  unit: string;
  category: string;
  direction: 'higher_is_better' | 'lower_is_better' | 'target_is_best';
  target_value: number;
  warning_threshold: number | null;
  critical_threshold: number | null;
  data_source: string;
  is_active: boolean;
  color: string;
  icon: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface KpiEntry {
  id: string;
  kpi_id: string;
  tenant_id: string;
  period_start: string;
  period_end: string;
  value: number;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export function useKpis() {
  const { currentTenantId } = useAuth();
  const qc = useQueryClient();

  const { data: kpis = [], isLoading } = useQuery({
    queryKey: ['kpis', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const { data, error } = await supabase
        .from('kpis')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .order('category')
        .order('name');
      if (error) throw error;
      return data as Kpi[];
    },
    enabled: !!currentTenantId,
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['kpi_entries', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const { data, error } = await supabase
        .from('kpi_entries')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .order('period_end', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as KpiEntry[];
    },
    enabled: !!currentTenantId,
  });

  const createKpi = useMutation({
    mutationFn: async (kpi: Partial<Kpi>) => {
      const { data, error } = await supabase
        .from('kpis')
        .insert({ ...kpi, tenant_id: currentTenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as Kpi;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpis', currentTenantId] }),
  });

  const updateKpi = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<Kpi> & { id: string }) => {
      const { error } = await supabase
        .from('kpis')
        .update(rest as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpis', currentTenantId] }),
  });

  const deleteKpi = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kpis').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpis', currentTenantId] }),
  });

  const addEntry = useMutation({
    mutationFn: async (entry: Partial<KpiEntry>) => {
      const { data, error } = await supabase
        .from('kpi_entries')
        .insert({ ...entry, tenant_id: currentTenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as KpiEntry;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpi_entries', currentTenantId] }),
  });

  return { kpis, entries, isLoading, entriesLoading, createKpi, updateKpi, deleteKpi, addEntry };
}

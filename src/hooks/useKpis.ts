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

const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function getHeaders() {
  const { data } = await supabase.auth.getSession();
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${data.session?.access_token}`,
    'Content-Type': 'application/json',
  };
}

export function useKpis() {
  const { currentTenantId } = useAuth();
  const qc = useQueryClient();

  const { data: kpis = [], isLoading } = useQuery({
    queryKey: ['kpis', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const headers = await getHeaders();
      const res = await fetch(
        `${BASE_URL}/rest/v1/kpis?tenant_id=eq.${currentTenantId}&order=category,name`,
        { headers }
      );
      if (!res.ok) throw new Error('Erro ao carregar KPIs');
      return (await res.json()) as Kpi[];
    },
    enabled: !!currentTenantId,
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['kpi_entries', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const headers = await getHeaders();
      const res = await fetch(
        `${BASE_URL}/rest/v1/kpi_entries?tenant_id=eq.${currentTenantId}&order=period_end.desc&limit=500`,
        { headers }
      );
      if (!res.ok) throw new Error('Erro ao carregar entradas');
      return (await res.json()) as KpiEntry[];
    },
    enabled: !!currentTenantId,
  });

  const createKpi = useMutation({
    mutationFn: async (kpi: Partial<Kpi>) => {
      const headers = await getHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/kpis`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ ...kpi, tenant_id: currentTenantId }),
      });
      if (!res.ok) throw new Error('Erro ao criar KPI');
      return (await res.json())[0] as Kpi;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpis'] }),
  });

  const updateKpi = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Kpi> & { id: string }) => {
      const headers = await getHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/kpis?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao atualizar KPI');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpis'] }),
  });

  const deleteKpi = useMutation({
    mutationFn: async (id: string) => {
      const headers = await getHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/kpis?id=eq.${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Erro ao excluir KPI');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpis'] }),
  });

  const addEntry = useMutation({
    mutationFn: async (entry: Partial<KpiEntry>) => {
      const headers = await getHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/kpi_entries`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ ...entry, tenant_id: currentTenantId }),
      });
      if (!res.ok) throw new Error('Erro ao registrar valor');
      return (await res.json())[0] as KpiEntry;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpi_entries'] }),
  });

  return { kpis, entries, isLoading, entriesLoading, createKpi, updateKpi, deleteKpi, addEntry };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OkrCycle {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  starts_at: string;
  ends_at: string;
  status: string;
  created_by: string | null;
  created_at: string;
}

export interface OkrObjective {
  id: string;
  cycle_id: string;
  tenant_id: string;
  title: string;
  description: string;
  owner_user_id: string | null;
  category: string;
  priority: string;
  progress: number;
  status: string;
  sort_order: number;
  created_at: string;
  area: string;
  indicator: string;
  target_label: string;
  responsible_name: string;
}

export interface OkrKeyResult {
  id: string;
  objective_id: string;
  tenant_id: string;
  title: string;
  description: string;
  unit: string;
  start_value: number;
  target_value: number;
  current_value: number;
  confidence_level: number;
  owner_user_id: string | null;
  kpi_id: string | null;
  status: string;
  sort_order: number;
  created_at: string;
  area: string;
  support_team: string;
  start_date: string | null;
  end_date: string | null;
  delivery_date: string | null;
  activity_status: string;
  responsible_name: string;
}

export interface OkrCheckin {
  id: string;
  key_result_id: string;
  tenant_id: string;
  value: number;
  confidence_level: number;
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

function createRestQuery<T>(key: string, table: string, tenantId: string | null, extra = '') {
  return {
    queryKey: [key, tenantId],
    queryFn: async () => {
      if (!tenantId) return [] as T[];
      const headers = await getHeaders();
      const res = await fetch(
        `${BASE_URL}/rest/v1/${table}?tenant_id=eq.${tenantId}${extra}`,
        { headers }
      );
      if (!res.ok) throw new Error(`Erro ao carregar ${table}`);
      return (await res.json()) as T[];
    },
    enabled: !!tenantId,
  };
}

function createRestMutation(table: string, method: 'POST' | 'PATCH' | 'DELETE', tenantId: string | null, invalidateKeys: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const headers = await getHeaders();
      let url = `${BASE_URL}/rest/v1/${table}`;
      const opts: RequestInit = { method, headers: { ...headers } };

      if (method === 'POST') {
        (opts.headers as any).Prefer = 'return=representation';
        opts.body = JSON.stringify({ ...payload, tenant_id: tenantId });
      } else if (method === 'PATCH') {
        const { id, ...data } = payload;
        url += `?id=eq.${id}`;
        (opts.headers as any).Prefer = 'return=minimal';
        opts.body = JSON.stringify(data);
      } else {
        url += `?id=eq.${payload}`;
      }

      const res = await fetch(url, opts);
      if (!res.ok) throw new Error(`Erro na operação ${table}`);
      if (method === 'POST') return (await res.json())[0];
    },
    onSuccess: () => {
      invalidateKeys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useOkrs() {
  const { currentTenantId } = useAuth();
  const qc = useQueryClient();

  const { data: cycles = [], isLoading: cyclesLoading } = useQuery(
    createRestQuery<OkrCycle>('okr_cycles', 'okr_cycles', currentTenantId, '&order=starts_at.desc')
  );

  const { data: objectives = [], isLoading: objectivesLoading } = useQuery(
    createRestQuery<OkrObjective>('okr_objectives', 'okr_objectives', currentTenantId, '&order=sort_order')
  );

  const { data: keyResults = [], isLoading: krLoading } = useQuery(
    createRestQuery<OkrKeyResult>('okr_key_results', 'okr_key_results', currentTenantId, '&order=sort_order')
  );

  const { data: checkins = [] } = useQuery(
    createRestQuery<OkrCheckin>('okr_checkins', 'okr_checkins', currentTenantId, '&order=created_at.desc&limit=200')
  );

  // Mutations using direct fetch calls for flexibility
  const createCycle = useMutation({
    mutationFn: async (cycle: Partial<OkrCycle>) => {
      const headers = await getHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/okr_cycles`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ ...cycle, tenant_id: currentTenantId }),
      });
      if (!res.ok) throw new Error('Erro ao criar ciclo');
      return (await res.json())[0];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['okr_cycles'] }),
  });

  const updateCycle = useMutation({
    mutationFn: async ({ id, ...data }: Partial<OkrCycle> & { id: string }) => {
      const headers = await getHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/okr_cycles?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao atualizar ciclo');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['okr_cycles'] }),
  });

  const deleteCycle = useMutation({
    mutationFn: async (id: string) => {
      const headers = await getHeaders();
      await fetch(`${BASE_URL}/rest/v1/okr_cycles?id=eq.${id}`, { method: 'DELETE', headers });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['okr_cycles'] }),
  });

  const createObjective = useMutation({
    mutationFn: async (obj: Partial<OkrObjective>) => {
      const headers = await getHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/okr_objectives`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ ...obj, tenant_id: currentTenantId }),
      });
      if (!res.ok) throw new Error('Erro ao criar objetivo');
      return (await res.json())[0];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['okr_objectives'] }),
  });

  const updateObjective = useMutation({
    mutationFn: async ({ id, ...data }: Partial<OkrObjective> & { id: string }) => {
      const headers = await getHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/okr_objectives?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao atualizar objetivo');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['okr_objectives'] }),
  });

  const deleteObjective = useMutation({
    mutationFn: async (id: string) => {
      const headers = await getHeaders();
      await fetch(`${BASE_URL}/rest/v1/okr_objectives?id=eq.${id}`, { method: 'DELETE', headers });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['okr_objectives'] }),
  });

  const createKeyResult = useMutation({
    mutationFn: async (kr: Partial<OkrKeyResult>) => {
      const headers = await getHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/okr_key_results`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ ...kr, tenant_id: currentTenantId }),
      });
      if (!res.ok) throw new Error('Erro ao criar key result');
      return (await res.json())[0];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['okr_key_results'] }),
  });

  const updateKeyResult = useMutation({
    mutationFn: async ({ id, ...data }: Partial<OkrKeyResult> & { id: string }) => {
      const headers = await getHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/okr_key_results?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao atualizar key result');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['okr_key_results'] }),
  });

  const deleteKeyResult = useMutation({
    mutationFn: async (id: string) => {
      const headers = await getHeaders();
      await fetch(`${BASE_URL}/rest/v1/okr_key_results?id=eq.${id}`, { method: 'DELETE', headers });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['okr_key_results'] }),
  });

  const addCheckin = useMutation({
    mutationFn: async (checkin: Partial<OkrCheckin>) => {
      const headers = await getHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/okr_checkins`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ ...checkin, tenant_id: currentTenantId }),
      });
      if (!res.ok) throw new Error('Erro ao registrar check-in');
      return (await res.json())[0];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['okr_checkins'] });
      qc.invalidateQueries({ queryKey: ['okr_key_results'] });
    },
  });

  const isLoading = cyclesLoading || objectivesLoading || krLoading;

  return {
    cycles, objectives, keyResults, checkins, isLoading,
    createCycle, updateCycle, deleteCycle,
    createObjective, updateObjective, deleteObjective,
    createKeyResult, updateKeyResult, deleteKeyResult,
    addCheckin,
  };
}

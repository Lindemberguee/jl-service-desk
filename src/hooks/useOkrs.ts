import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/lib/audit';

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

export function useOkrs() {
  const { currentTenantId } = useAuth();
  const qc = useQueryClient();

  const { data: cycles = [], isLoading: cyclesLoading } = useQuery({
    queryKey: ['okr_cycles', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const { data, error } = await supabase
        .from('okr_cycles')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .order('starts_at', { ascending: false });
      if (error) throw error;
      return data as OkrCycle[];
    },
    enabled: !!currentTenantId,
  });

  const { data: objectives = [], isLoading: objectivesLoading } = useQuery({
    queryKey: ['okr_objectives', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const { data, error } = await supabase
        .from('okr_objectives')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .order('sort_order');
      if (error) throw error;
      return data as OkrObjective[];
    },
    enabled: !!currentTenantId,
  });

  const { data: keyResults = [], isLoading: krLoading } = useQuery({
    queryKey: ['okr_key_results', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const { data, error } = await supabase
        .from('okr_key_results')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .order('sort_order');
      if (error) throw error;
      return data as OkrKeyResult[];
    },
    enabled: !!currentTenantId,
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ['okr_checkins', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const { data, error } = await supabase
        .from('okr_checkins')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as OkrCheckin[];
    },
    enabled: !!currentTenantId,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['okr_cycles', currentTenantId] });
    qc.invalidateQueries({ queryKey: ['okr_objectives', currentTenantId] });
    qc.invalidateQueries({ queryKey: ['okr_key_results', currentTenantId] });
    qc.invalidateQueries({ queryKey: ['okr_checkins', currentTenantId] });
  };

  const createCycle = useMutation({
    mutationFn: async (cycle: Partial<OkrCycle>) => {
      const { data, error } = await supabase
        .from('okr_cycles')
        .insert({ ...cycle, tenant_id: currentTenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      invalidateAll();
      logAudit({ entity: 'okr_cycle', entityId: data?.id, action: 'okr_cycle.created', tenantId: currentTenantId, diff: { name: data?.name } });
    },
  });

  const updateCycle = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<OkrCycle> & { id: string }) => {
      const { error } = await supabase.from('okr_cycles').update(rest as any).eq('id', id);
      if (error) throw error;
      return { id, ...rest };
    },
    onSuccess: (_, vars) => {
      invalidateAll();
      logAudit({ entity: 'okr_cycle', entityId: vars.id, action: 'okr_cycle.updated', tenantId: currentTenantId, diff: vars });
    },
  });

  const deleteCycle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('okr_cycles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      invalidateAll();
      logAudit({ entity: 'okr_cycle', entityId: id, action: 'okr_cycle.deleted', tenantId: currentTenantId });
    },
  });

  const createObjective = useMutation({
    mutationFn: async (obj: Partial<OkrObjective>) => {
      const { data, error } = await supabase
        .from('okr_objectives')
        .insert({ ...obj, tenant_id: currentTenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      invalidateAll();
      logAudit({ entity: 'okr_objective', entityId: data?.id, action: 'okr_objective.created', tenantId: currentTenantId, diff: { title: data?.title } });
    },
  });

  const updateObjective = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<OkrObjective> & { id: string }) => {
      const { error } = await supabase.from('okr_objectives').update(rest as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      invalidateAll();
      logAudit({ entity: 'okr_objective', entityId: vars.id, action: 'okr_objective.updated', tenantId: currentTenantId, diff: vars });
    },
  });

  const deleteObjective = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('okr_objectives').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      invalidateAll();
      logAudit({ entity: 'okr_objective', entityId: id, action: 'okr_objective.deleted', tenantId: currentTenantId });
    },
  });

  const createKeyResult = useMutation({
    mutationFn: async (kr: Partial<OkrKeyResult>) => {
      const { data, error } = await supabase
        .from('okr_key_results')
        .insert({ ...kr, tenant_id: currentTenantId } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      invalidateAll();
      logAudit({ entity: 'okr_key_result', entityId: data?.id, action: 'okr_key_result.created', tenantId: currentTenantId, diff: { title: data?.title } });
    },
  });

  const updateKeyResult = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<OkrKeyResult> & { id: string }) => {
      const { error } = await supabase.from('okr_key_results').update(rest as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      invalidateAll();
      logAudit({ entity: 'okr_key_result', entityId: vars.id, action: 'okr_key_result.updated', tenantId: currentTenantId, diff: vars });
    },
  });

  const deleteKeyResult = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('okr_key_results').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      invalidateAll();
      logAudit({ entity: 'okr_key_result', entityId: id, action: 'okr_key_result.deleted', tenantId: currentTenantId });
    },
  });

  const addCheckin = useMutation({
    mutationFn: async (checkin: Partial<OkrCheckin> & { key_result_id: string }) => {
      // 1. Insert checkin
      const { data: checkinData, error: checkinError } = await supabase
        .from('okr_checkins')
        .insert({ ...checkin, tenant_id: currentTenantId } as any)
        .select()
        .single();
      if (checkinError) throw checkinError;

      // 2. Update key result's current_value
      const { error: krError } = await supabase
        .from('okr_key_results')
        .update({ current_value: checkin.value, confidence_level: checkin.confidence_level ?? 70 } as any)
        .eq('id', checkin.key_result_id);
      if (krError) throw krError;

      // 3. Recalculate objective progress
      const { data: kr } = await supabase
        .from('okr_key_results')
        .select('objective_id')
        .eq('id', checkin.key_result_id)
        .single();
      
      if (kr) {
        const { data: allKrs } = await supabase
          .from('okr_key_results')
          .select('start_value, target_value, current_value')
          .eq('objective_id', kr.objective_id);
        
        if (allKrs && allKrs.length > 0) {
          const totalProgress = allKrs.reduce((sum, k) => {
            const range = k.target_value - k.start_value;
            if (range === 0) return sum;
            const pct = Math.min(((k.current_value - k.start_value) / range) * 100, 100);
            return sum + Math.max(pct, 0);
          }, 0);
          const avgProgress = Math.round(totalProgress / allKrs.length);

          await supabase
            .from('okr_objectives')
            .update({ progress: avgProgress } as any)
            .eq('id', kr.objective_id);
        }
      }

      return checkinData;
    },
    onSuccess: (data, vars) => {
      invalidateAll();
      qc.invalidateQueries({ queryKey: ['kpis', currentTenantId] });
      qc.invalidateQueries({ queryKey: ['kpi_entries', currentTenantId] });
      logAudit({ entity: 'okr_checkin', entityId: data?.id, action: 'okr_checkin.created', tenantId: currentTenantId, diff: { key_result_id: vars.key_result_id, value: vars.value } });
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

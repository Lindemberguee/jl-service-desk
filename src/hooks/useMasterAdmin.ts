import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

async function callMasterAdmin(action: string, data: Record<string, unknown> = {}) {
  const { data: result, error } = await supabase.functions.invoke('master-admin', {
    body: { action, ...data },
  });
  if (error) throw new Error(error.message);
  if (result?.error) throw new Error(result.error);
  return result;
}

export function useMasterTenants() {
  return useQuery({
    queryKey: ['master-tenants'],
    queryFn: () => callMasterAdmin('list_tenants'),
    select: (data: any) => data.tenants || [],
    staleTime: 30_000,
  });
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => callMasterAdmin('platform_stats'),
    staleTime: 60_000,
  });
}

export function useOnboardTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      tenant_name: string; tenant_slug: string; plan?: string;
      max_users?: number; enabled_modules?: string[];
      admin_email: string; admin_password: string; admin_name: string;
      monthly_price?: number; trial_days?: number;
    }) => callMasterAdmin('onboard_tenant', data),
    onSuccess: () => {
      toast.success('Empresa criada com sucesso!');
      qc.invalidateQueries({ queryKey: ['master-tenants'] });
      qc.invalidateQueries({ queryKey: ['platform-stats'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      tenant_id: string; plan?: string; max_users?: number;
      enabled_modules?: string[]; status?: string; monthly_price?: number; notes?: string;
    }) => callMasterAdmin('update_subscription', data),
    onSuccess: () => {
      toast.success('Plano atualizado!');
      qc.invalidateQueries({ queryKey: ['master-tenants'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

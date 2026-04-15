import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useSidebarPreferences() {
  const { user, currentTenantId } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const { data: hiddenPaths = [], isLoading } = useQuery({
    queryKey: ['sidebar-preferences', userId, currentTenantId],
    queryFn: async () => {
      if (!userId || !currentTenantId) return [];
      const { data, error } = await supabase
        .from('sidebar_preferences' as any)
        .select('hidden_paths')
        .eq('user_id', userId)
        .eq('tenant_id', currentTenantId)
        .maybeSingle();
      if (error) throw error;
      return ((data as any)?.hidden_paths as string[]) ?? [];
    },
    enabled: !!userId && !!currentTenantId,
    staleTime: 5 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: async (paths: string[]) => {
      if (!userId || !currentTenantId) return;
      const { error } = await supabase
        .from('sidebar_preferences' as any)
        .upsert(
          { user_id: userId, tenant_id: currentTenantId, hidden_paths: paths } as any,
          { onConflict: 'user_id,tenant_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sidebar-preferences', userId, currentTenantId] });
    },
  });

  return { hiddenPaths, isLoading, setHiddenPaths: mutation.mutate, isSaving: mutation.isPending };
}

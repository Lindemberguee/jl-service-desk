import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePlatformSetting(key: string) {
  return useQuery({
    queryKey: ['platform-setting', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings' as any)
        .select('*')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.value ?? null;
    },
    staleTime: 60_000,
  });
}

export function useUpdatePlatformSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('platform_settings' as any)
        .upsert({ key, value, updated_at: new Date().toISOString() } as any, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: (_, { key }) => {
      qc.invalidateQueries({ queryKey: ['platform-setting', key] });
      toast.success('Configuração atualizada');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

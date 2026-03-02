import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface VaultEntry {
  id: string;
  title: string;
  service_name: string;
  url: string;
  category: string;
  tags: string[];
  created_by: string;
  last_rotated_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DecryptedEntry extends VaultEntry {
  username: string;
  password: string;
  notes: string;
}

export function useVault() {
  const { currentTenantId } = useAuth();
  const queryClient = useQueryClient();

  const listQuery = useQuery<VaultEntry[]>({
    queryKey: ['vault-entries', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const { data, error } = await supabase.functions.invoke('vault-crypto', {
        body: { action: 'list', tenant_id: currentTenantId },
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenantId,
  });

  const decryptEntry = async (entryId: string): Promise<DecryptedEntry> => {
    const { data, error } = await supabase.functions.invoke('vault-crypto', {
      body: { action: 'read', entry_id: entryId, tenant_id: currentTenantId },
    });
    if (error) throw error;
    return data;
  };

  const createEntry = useMutation({
    mutationFn: async (entry: { title: string; service_name?: string; url?: string; username?: string; password?: string; notes?: string; category?: string; tags?: string[] }) => {
      const { data, error } = await supabase.functions.invoke('vault-crypto', {
        body: { action: 'create', tenant_id: currentTenantId, ...entry },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-entries', currentTenantId] });
      toast({ title: 'Credencial salva com segurança' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao salvar credencial', description: err.message, variant: 'destructive' });
    },
  });

  const updateEntry = useMutation({
    mutationFn: async (params: { entry_id: string } & Record<string, any>) => {
      const { data, error } = await supabase.functions.invoke('vault-crypto', {
        body: { action: 'update', tenant_id: currentTenantId, ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-entries', currentTenantId] });
      toast({ title: 'Credencial atualizada' });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { data, error } = await supabase.functions.invoke('vault-crypto', {
        body: { action: 'delete', entry_id: entryId, tenant_id: currentTenantId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-entries', currentTenantId] });
      toast({ title: 'Credencial excluída' });
    },
  });

  return { listQuery, decryptEntry, createEntry, updateEntry, deleteEntry };
}

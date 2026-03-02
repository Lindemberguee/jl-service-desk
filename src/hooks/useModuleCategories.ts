import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function useModuleCategories(module: 'library' | 'vault' | 'knowledge') {
  const { currentTenantId } = useAuth();
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ['module-categories', currentTenantId, module],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const { data, error } = await supabase
        .from('module_categories')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .eq('module', module)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenantId,
  });

  const categories = (categoriesQuery.data || []).map((c: any) => c.name as string);

  const addCategory = useMutation({
    mutationFn: async (name: string) => {
      if (!currentTenantId) throw new Error('No tenant');
      const maxOrder = (categoriesQuery.data || []).reduce((max: number, c: any) => Math.max(max, c.sort_order), -1);
      const { error } = await supabase.from('module_categories').insert({
        tenant_id: currentTenantId,
        module,
        name: name.trim(),
        sort_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-categories', currentTenantId, module] });
      toast({ title: 'Categoria adicionada' });
    },
    onError: (err: any) => {
      const msg = err.message?.includes('duplicate') ? 'Categoria já existe' : err.message;
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    },
  });

  const removeCategory = useMutation({
    mutationFn: async (name: string) => {
      if (!currentTenantId) throw new Error('No tenant');
      const { error } = await supabase
        .from('module_categories')
        .delete()
        .eq('tenant_id', currentTenantId)
        .eq('module', module)
        .eq('name', name);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-categories', currentTenantId, module] });
      toast({ title: 'Categoria removida' });
    },
  });

  return { categories, categoriesQuery, addCategory, removeCategory };
}

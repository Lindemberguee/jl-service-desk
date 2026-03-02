import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function useKnowledgeBase() {
  const { currentTenantId, user } = useAuth();
  const queryClient = useQueryClient();

  const articlesQuery = useQuery({
    queryKey: ['kb-articles', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const { data, error } = await supabase
        .from('knowledge_articles')
        .select('*, profiles!knowledge_articles_author_id_fkey(name)')
        .eq('tenant_id', currentTenantId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenantId,
  });

  const createArticle = useMutation({
    mutationFn: async (article: { title: string; content: string; category?: string; tags?: string[]; is_published?: boolean }) => {
      if (!currentTenantId || !user) throw new Error('Not authenticated');
      const { data, error } = await supabase.from('knowledge_articles').insert({
        tenant_id: currentTenantId,
        author_id: user.id,
        ...article,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles', currentTenantId] });
      toast({ title: 'Artigo criado com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar artigo', description: err.message, variant: 'destructive' });
    },
  });

  const updateArticle = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; content?: string; category?: string; tags?: string[]; is_published?: boolean }) => {
      const { data, error } = await supabase.from('knowledge_articles').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles', currentTenantId] });
      toast({ title: 'Artigo atualizado' });
    },
  });

  const deleteArticle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('knowledge_articles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles', currentTenantId] });
      toast({ title: 'Artigo excluído' });
    },
  });

  return { articlesQuery, createArticle, updateArticle, deleteArticle };
}

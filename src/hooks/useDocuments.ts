import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function useDocuments() {
  const { currentTenantId, user } = useAuth();
  const queryClient = useQueryClient();

  const documentsQuery = useQuery({
    queryKey: ['documents', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const { data, error } = await supabase
        .from('documents')
        .select('*, profiles!documents_user_id_fkey(name)')
        .eq('tenant_id', currentTenantId)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenantId,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ file, title, description, folder, category, tags, work_order_id, asset_id }: {
      file: File; title: string; description?: string; folder?: string; category?: string;
      tags?: string[]; work_order_id?: string; asset_id?: string;
    }) => {
      if (!currentTenantId || !user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const storageKey = `${currentTenantId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storageKey, file);
      if (uploadError) throw uploadError;

      const { data, error } = await supabase.from('documents').insert({
        tenant_id: currentTenantId,
        user_id: user.id,
        title,
        description: description || '',
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_key: storageKey,
        folder: folder || 'Geral',
        category: category || 'Geral',
        tags: tags || [],
        work_order_id: work_order_id || null,
        asset_id: asset_id || null,
      }).select().single();
      if (error) throw error;

      // Create version 1
      await supabase.from('document_versions').insert({
        document_id: data.id,
        tenant_id: currentTenantId,
        version_number: 1,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_key: storageKey,
        change_notes: 'Versão inicial',
        uploaded_by: user.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', currentTenantId] });
      toast({ title: 'Documento enviado com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao enviar documento', description: err.message, variant: 'destructive' });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (docId: string) => {
      const { data: doc } = await supabase.from('documents').select('storage_key').eq('id', docId).single();
      if (doc?.storage_key) {
        await supabase.storage.from('documents').remove([doc.storage_key]);
      }
      const { error } = await supabase.from('documents').delete().eq('id', docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', currentTenantId] });
      toast({ title: 'Documento excluído' });
    },
  });

  const versionsQuery = (documentId: string) => useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_versions')
        .select('*, profiles!document_versions_uploaded_by_fkey(name)')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!documentId,
  });

  return { documentsQuery, uploadDocument, deleteDocument, versionsQuery };
}

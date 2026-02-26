import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface NoteShare {
  id: string;
  note_id: string;
  shared_with_user_id: string;
  shared_by: string;
  permission: 'view' | 'edit';
  created_at: string;
  profile?: { id: string; name: string; email: string; avatar_url: string | null };
}

export function useNoteShares(noteId: string | null) {
  const { user, currentTenantId } = useAuth();
  const [shares, setShares] = useState<NoteShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<{ id: string; name: string; email: string; avatar_url: string | null }[]>([]);

  const fetchShares = useCallback(async () => {
    if (!noteId || !currentTenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('note_shares')
      .select('*')
      .eq('note_id', noteId)
      .eq('tenant_id', currentTenantId);

    if (!error && data) {
      // Fetch profiles for shared users
      const userIds = data.map(s => s.shared_with_user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map(p => [p.id, p]));
        setShares(data.map(s => ({
          ...s,
          permission: s.permission as 'view' | 'edit',
          profile: profileMap.get(s.shared_with_user_id),
        })));
      } else {
        setShares([]);
      }
    }
    setLoading(false);
  }, [noteId, currentTenantId]);

  const fetchTenantUsers = useCallback(async () => {
    if (!currentTenantId || !user) return;
    const { data } = await supabase
      .from('user_memberships')
      .select('user_id')
      .eq('tenant_id', currentTenantId)
      .eq('is_active', true);

    if (data) {
      const ids = data.map(d => d.user_id).filter(id => id !== user.id);
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url')
          .in('id', ids);
        setTenantUsers(profiles || []);
      }
    }
  }, [currentTenantId, user]);

  useEffect(() => { fetchShares(); }, [fetchShares]);
  useEffect(() => { fetchTenantUsers(); }, [fetchTenantUsers]);

  const addShare = useCallback(async (userId: string, permission: 'view' | 'edit') => {
    if (!noteId || !currentTenantId || !user) return;
    const { error } = await supabase.from('note_shares').insert({
      note_id: noteId,
      shared_with_user_id: userId,
      shared_by: user.id,
      permission,
      tenant_id: currentTenantId,
    });
    if (error) {
      if (error.code === '23505') toast.error('Usuário já tem acesso');
      else toast.error('Erro ao compartilhar');
    } else {
      toast.success('Nota compartilhada!');
      fetchShares();
    }
  }, [noteId, currentTenantId, user, fetchShares]);

  const updatePermission = useCallback(async (shareId: string, permission: 'view' | 'edit') => {
    const { error } = await supabase.from('note_shares').update({ permission }).eq('id', shareId);
    if (error) toast.error('Erro ao atualizar');
    else fetchShares();
  }, [fetchShares]);

  const removeShare = useCallback(async (shareId: string) => {
    const { error } = await supabase.from('note_shares').delete().eq('id', shareId);
    if (error) toast.error('Erro ao remover');
    else { toast.success('Acesso removido'); fetchShares(); }
  }, [fetchShares]);

  return { shares, loading, tenantUsers, addShare, updatePermission, removeShare, fetchShares };
}

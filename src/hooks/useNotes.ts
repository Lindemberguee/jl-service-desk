import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Note {
  id: string;
  title: string;
  content: string;
  folder: string;
  tags: string[];
  is_pinned: boolean;
  editor_mode: string;
  created_at: string;
  updated_at: string;
}

export function useNotes() {
  const { user, currentTenantId } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const fetchNotes = useCallback(async () => {
    if (!user || !currentTenantId) return;
    // Don't fetch while a save is in-flight to avoid overwriting local state
    if (savingRef.current) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('tenant_id', currentTenantId)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) toast.error('Erro ao carregar anotações');
    else setNotes((data || []) as Note[]);
    setLoading(false);
  }, [user, currentTenantId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const createNote = useCallback(async (folder: string = 'Geral') => {
    if (!user || !currentTenantId) return null;
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: user.id, tenant_id: currentTenantId, folder })
      .select()
      .single();

    if (error) { toast.error('Erro ao criar nota'); return null; }
    const note = data as Note;
    // Update local state immediately
    setNotes(prev => [note, ...prev]);
    return note;
  }, [user, currentTenantId]);

  const updateNote = useCallback(async (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'folder' | 'tags' | 'is_pinned' | 'editor_mode'>>) => {
    const now = new Date().toISOString();
    
    // Optimistic: update local state immediately
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updated_at: now } : n));

    setSaving(true);
    savingRef.current = true;
    const { error } = await supabase
      .from('notes')
      .update({ ...updates, updated_at: now })
      .eq('id', id);

    if (error) toast.error('Erro ao salvar');
    setSaving(false);
    savingRef.current = false;
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    // Optimistic removal
    setNotes(prev => prev.filter(n => n.id !== id));
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); fetchNotes(); }
    else toast.success('Nota excluída');
  }, [fetchNotes]);

  const folders = [...new Set(notes.map(n => n.folder))].sort();
  const allTags = [...new Set(notes.flatMap(n => n.tags))].sort();

  return { notes, loading, saving, createNote, updateNote, deleteNote, fetchNotes, folders, allTags };
}

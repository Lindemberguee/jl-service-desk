import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─── Types ───

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

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

type NoteUpdates = Partial<Pick<Note, 'title' | 'content' | 'folder' | 'tags' | 'is_pinned' | 'editor_mode'>>;

interface QueueItem {
  noteId: string;
  updates: NoteUpdates;
  timestamp: number;
}

// ─── Hook ───

export function useNotesEngine() {
  const { user, currentTenantId } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // Save queue – merges updates for the same note
  const queueRef = useRef<Map<string, QueueItem>>(new Map());
  const processingRef = useRef(false);
  const retryCountRef = useRef<Map<string, number>>(new Map());
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Fetch ───

  const fetchNotes = useCallback(async () => {
    if (!user || !currentTenantId) return;
    // Don't fetch while queue has pending items
    if (queueRef.current.size > 0 || processingRef.current) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('tenant_id', currentTenantId)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar anotações');
    } else if (mountedRef.current) {
      setNotes((data || []) as Note[]);
    }
    if (mountedRef.current) setLoading(false);
  }, [user, currentTenantId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  // ─── Queue Processor ───

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    if (queueRef.current.size === 0) {
      if (mountedRef.current) {
        setSyncStatus('saved');
        clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setSyncStatus('idle');
        }, 2000);
      }
      return;
    }

    processingRef.current = true;
    if (mountedRef.current) setSyncStatus('saving');

    // Take oldest item
    const entries = [...queueRef.current.entries()];
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const [noteId, item] = entries[0];

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('notes')
      .update({ ...item.updates, updated_at: now })
      .eq('id', noteId);

    if (error) {
      const retries = retryCountRef.current.get(noteId) || 0;
      if (retries < 3) {
        retryCountRef.current.set(noteId, retries + 1);
        // Keep in queue for retry
        console.warn(`[Notes] Retry ${retries + 1}/3 for note ${noteId}`);
      } else {
        // Give up on this item
        queueRef.current.delete(noteId);
        retryCountRef.current.delete(noteId);
        if (mountedRef.current) setSyncStatus('error');
        toast.error('Erro ao salvar nota. Tente novamente.');
      }
    } else {
      queueRef.current.delete(noteId);
      retryCountRef.current.delete(noteId);
      // Update local note with server timestamp
      if (mountedRef.current) {
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...item.updates, updated_at: now } : n));
      }
    }

    processingRef.current = false;

    // Continue processing if more items
    if (queueRef.current.size > 0) {
      // Small delay between saves to avoid hammering
      setTimeout(() => processQueue(), 100);
    } else {
      if (mountedRef.current) {
        setSyncStatus('saved');
        clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setSyncStatus('idle');
        }, 2000);
      }
    }
  }, []);

  // ─── Enqueue Update ───

  const enqueueUpdate = useCallback((noteId: string, updates: NoteUpdates) => {
    const existing = queueRef.current.get(noteId);
    const merged = existing ? { ...existing.updates, ...updates } : updates;
    queueRef.current.set(noteId, { noteId, updates: merged, timestamp: Date.now() });

    // Optimistic local update
    setNotes(prev => prev.map(n =>
      n.id === noteId ? { ...n, ...updates, updated_at: new Date().toISOString() } : n
    ));
  }, []);

  // ─── Debounced Save Trigger ───

  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const updateNote = useCallback((noteId: string, updates: NoteUpdates) => {
    enqueueUpdate(noteId, updates);
    if (mountedRef.current) setSyncStatus('saving');

    // Debounce the actual DB write
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      processQueue();
    }, 600);
  }, [enqueueUpdate, processQueue]);

  // ─── Immediate Flush (for note switches, navigation) ───

  const flush = useCallback(async () => {
    clearTimeout(saveTimerRef.current);
    if (queueRef.current.size === 0 && !processingRef.current) return;

    // Process all remaining items synchronously
    while (queueRef.current.size > 0 || processingRef.current) {
      if (!processingRef.current && queueRef.current.size > 0) {
        await processQueue();
      } else {
        // Wait briefly for current processing to finish
        await new Promise(r => setTimeout(r, 50));
      }
      // Safety valve
      if (queueRef.current.size === 0) break;
    }
  }, [processQueue]);

  // ─── Create ───

  const createNote = useCallback(async (folder: string = 'Geral') => {
    if (!user || !currentTenantId) return null;
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: user.id, tenant_id: currentTenantId, folder })
      .select()
      .single();

    if (error) { toast.error('Erro ao criar nota'); return null; }
    const note = data as Note;
    setNotes(prev => [note, ...prev]);
    return note;
  }, [user, currentTenantId]);

  // ─── Delete ───

  const deleteNote = useCallback(async (id: string) => {
    // Remove from queue if pending
    queueRef.current.delete(id);
    retryCountRef.current.delete(id);

    setNotes(prev => prev.filter(n => n.id !== id));
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); fetchNotes(); }
    else toast.success('Nota excluída');
  }, [fetchNotes]);

  // ─── beforeunload Protection ───

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (queueRef.current.size > 0 || processingRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // ─── Cleanup on unmount ───

  useEffect(() => {
    return () => {
      clearTimeout(saveTimerRef.current);
      clearTimeout(savedTimerRef.current);
    };
  }, []);

  // ─── Computed ───

  const folders = [...new Set(notes.map(n => n.folder))].sort();
  const allTags = [...new Set(notes.flatMap(n => n.tags))].sort();

  return {
    notes,
    loading,
    syncStatus,
    createNote,
    updateNote,
    deleteNote,
    flush,
    fetchNotes,
    folders,
    allTags,
  };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─── Types ───

export interface Reminder {
  id: string;
  title: string;
  description: string;
  priority: 'baixa' | 'media' | 'alta' | 'critica';
  category: string;
  tags: string[];
  due_at: string | null;
  is_completed: boolean;
  completed_at: string | null;
  recurrence_type: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  recurrence_interval: number;
  recurrence_end_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

type ReminderUpdates = Partial<Pick<Reminder,
  'title' | 'description' | 'priority' | 'category' | 'tags' |
  'due_at' | 'is_completed' | 'completed_at' |
  'recurrence_type' | 'recurrence_interval' | 'recurrence_end_at'
>>;

interface QueueItem {
  noteId: string;
  updates: ReminderUpdates;
  timestamp: number;
}

// ─── Hook ───

export function useRemindersEngine() {
  const { user, currentTenantId } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const queueRef = useRef<Map<string, QueueItem>>(new Map());
  const processingRef = useRef(false);
  const retryCountRef = useRef<Map<string, number>>(new Map());
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Fetch ───

  const fetchReminders = useCallback(async () => {
    if (!user || !currentTenantId) return;
    if (queueRef.current.size > 0 || processingRef.current) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .eq('tenant_id', currentTenantId)
      .order('is_completed', { ascending: true })
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) toast.error('Erro ao carregar lembretes');
    else if (mountedRef.current) setReminders((data || []) as Reminder[]);
    if (mountedRef.current) setLoading(false);
  }, [user, currentTenantId]);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);

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

    const entries = [...queueRef.current.entries()];
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const [remId, item] = entries[0];

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('reminders')
      .update({ ...item.updates, updated_at: now })
      .eq('id', remId);

    if (error) {
      const retries = retryCountRef.current.get(remId) || 0;
      if (retries < 3) {
        retryCountRef.current.set(remId, retries + 1);
      } else {
        queueRef.current.delete(remId);
        retryCountRef.current.delete(remId);
        if (mountedRef.current) setSyncStatus('error');
        toast.error('Erro ao salvar lembrete.');
      }
    } else {
      queueRef.current.delete(remId);
      retryCountRef.current.delete(remId);
      if (mountedRef.current) {
        setReminders(prev => prev.map(r => r.id === remId ? { ...r, ...item.updates, updated_at: now } : r));
      }
    }

    processingRef.current = false;

    if (queueRef.current.size > 0) {
      setTimeout(() => processQueue(), 100);
    } else if (mountedRef.current) {
      setSyncStatus('saved');
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setSyncStatus('idle');
      }, 2000);
    }
  }, []);

  // ─── Enqueue ───

  const enqueueUpdate = useCallback((id: string, updates: ReminderUpdates) => {
    const existing = queueRef.current.get(id);
    const merged = existing ? { ...existing.updates, ...updates } : updates;
    queueRef.current.set(id, { noteId: id, updates: merged, timestamp: Date.now() });

    setReminders(prev => prev.map(r =>
      r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
    ));
  }, []);

  const updateReminder = useCallback((id: string, updates: ReminderUpdates) => {
    enqueueUpdate(id, updates);
    if (mountedRef.current) setSyncStatus('saving');

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => processQueue(), 400);
  }, [enqueueUpdate, processQueue]);

  // ─── Flush ───

  const flush = useCallback(async () => {
    clearTimeout(saveTimerRef.current);
    if (queueRef.current.size === 0 && !processingRef.current) return;

    while (queueRef.current.size > 0 || processingRef.current) {
      if (!processingRef.current && queueRef.current.size > 0) {
        await processQueue();
      } else {
        await new Promise(r => setTimeout(r, 50));
      }
      if (queueRef.current.size === 0) break;
    }
  }, [processQueue]);

  // ─── Create ───

  const createReminder = useCallback(async (defaults?: Partial<ReminderUpdates>) => {
    if (!user || !currentTenantId) return null;
    const { data, error } = await supabase
      .from('reminders')
      .insert({ user_id: user.id, tenant_id: currentTenantId, ...defaults })
      .select()
      .single();

    if (error) { toast.error('Erro ao criar lembrete'); return null; }
    const reminder = data as Reminder;
    setReminders(prev => [reminder, ...prev]);
    return reminder;
  }, [user, currentTenantId]);

  // ─── Delete ───

  const deleteReminder = useCallback(async (id: string) => {
    queueRef.current.delete(id);
    retryCountRef.current.delete(id);

    setReminders(prev => prev.filter(r => r.id !== id));
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); fetchReminders(); }
    else toast.success('Lembrete excluído');
  }, [fetchReminders]);

  // ─── Toggle Complete ───

  const toggleComplete = useCallback((id: string) => {
    const rem = reminders.find(r => r.id === id);
    if (!rem) return;

    const isCompleted = !rem.is_completed;
    const completedAt = isCompleted ? new Date().toISOString() : null;
    updateReminder(id, { is_completed: isCompleted, completed_at: completedAt });
  }, [reminders, updateReminder]);

  // ─── beforeunload ───

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

  useEffect(() => {
    return () => {
      clearTimeout(saveTimerRef.current);
      clearTimeout(savedTimerRef.current);
    };
  }, []);

  // ─── Computed ───

  const categories = [...new Set(reminders.map(r => r.category))].sort();
  const allTags = [...new Set(reminders.flatMap(r => r.tags))].sort();

  // Count overdue
  const now = new Date();
  const overdueCount = reminders.filter(r =>
    !r.is_completed && r.due_at && new Date(r.due_at) < now
  ).length;

  const pendingCount = reminders.filter(r => !r.is_completed).length;

  return {
    reminders,
    loading,
    syncStatus,
    createReminder,
    updateReminder,
    deleteReminder,
    toggleComplete,
    flush,
    fetchReminders,
    categories,
    allTags,
    overdueCount,
    pendingCount,
  };
}

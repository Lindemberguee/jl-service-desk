import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { statusLabels } from '@/lib/permissions';

const RECENT_TOAST_WINDOW_MS = 4000;
const recentToastKeys = new Map<string, number>();

function shouldEmitToast(key: string) {
  const now = Date.now();

  for (const [cachedKey, timestamp] of recentToastKeys.entries()) {
    if (now - timestamp > RECENT_TOAST_WINDOW_MS) {
      recentToastKeys.delete(cachedKey);
    }
  }

  if (recentToastKeys.has(key)) return false;

  recentToastKeys.set(key, now);
  return true;
}

export function useRealtimeWorkOrders() {
  const { currentTenantId, memberships, user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!currentTenantId) return;

    // Subscribe once per unique tenant to avoid duplicate realtime events
    const tenantIds = Array.from(new Set(memberships.map((m) => m.tenant_id).filter(Boolean)));
    if (tenantIds.length === 0) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    for (const tenantId of tenantIds) {
      const channel = supabase
        .channel(`work_orders_realtime_${tenantId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'work_orders',
            filter: `tenant_id=eq.${tenantId}`,
          },
          (payload) => {
            const oldRow = payload.old as any;
            const newRow = payload.new as any;
            const code = newRow?.code || '';
            const title = newRow?.title || '';

            // Status change notification
            if (oldRow?.status && newRow?.status && oldRow.status !== newRow.status) {
              const statusToastKey = `wo-status:${newRow?.id}:${newRow?.status}:${tenantId}`;
              if (shouldEmitToast(statusToastKey)) {
                toast({
                  title: `${code} — Status alterado`,
                  description: `${title}: ${statusLabels[oldRow.status] || oldRow.status} → ${statusLabels[newRow.status] || newRow.status}`,
                });
              }
            }

            // Assignment notification — only notify the assigned user
            if (oldRow?.assigned_to_id !== newRow?.assigned_to_id && newRow?.assigned_to_id === user?.id) {
              const assignmentToastKey = `wo-assigned:${newRow?.id}:${newRow?.assigned_to_id}:${tenantId}`;
              if (shouldEmitToast(assignmentToastKey)) {
                toast({
                  title: `${code} — Atribuída a você`,
                  description: title,
                  variant: 'default',
                });
              }
            }

            // Invalidate all relevant queries
            qc.invalidateQueries({ queryKey: ['work_orders'] });
            qc.invalidateQueries({ queryKey: ['work_orders_all'] });
            qc.invalidateQueries({ queryKey: ['work_order', newRow?.id] });
            qc.invalidateQueries({ queryKey: ['portal_work_orders'] });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'work_orders',
            filter: `tenant_id=eq.${tenantId}`,
          },
          (payload) => {
            const newRow = payload.new as any;
            const code = newRow?.code || '';

            const insertToastKey = `wo-created:${newRow?.id}:${tenantId}`;
            if (shouldEmitToast(insertToastKey)) {
              toast({
                title: 'Nova OS criada',
                description: `${code} — ${newRow?.title || ''}`,
              });
            }

            // If assigned to current user on creation
            if (newRow?.assigned_to_id === user?.id) {
              const assignedOnCreateKey = `wo-created-assigned:${newRow?.id}:${newRow?.assigned_to_id}:${tenantId}`;
              if (shouldEmitToast(assignedOnCreateKey)) {
                toast({
                  title: `${code} — Atribuída a você`,
                  description: newRow?.title || '',
                });
              }
            }

            qc.invalidateQueries({ queryKey: ['work_orders'] });
            qc.invalidateQueries({ queryKey: ['work_orders_all'] });
            qc.invalidateQueries({ queryKey: ['portal_work_orders'] });
          }
        )
        .subscribe();

      channels.push(channel);
    }

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [currentTenantId, memberships, qc, user?.id]);
}

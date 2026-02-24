import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { statusLabels } from '@/lib/permissions';

export function useRealtimeWorkOrders() {
  const { currentTenantId, user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!currentTenantId) return;

    const channel = supabase
      .channel('work_orders_realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'work_orders',
          filter: `tenant_id=eq.${currentTenantId}`,
        },
        (payload) => {
          const oldRow = payload.old as any;
          const newRow = payload.new as any;
          const code = newRow?.code || '';
          const title = newRow?.title || '';

          // Status change notification
          if (oldRow?.status && newRow?.status && oldRow.status !== newRow.status) {
            toast({
              title: `${code} — Status alterado`,
              description: `${title}: ${statusLabels[oldRow.status] || oldRow.status} → ${statusLabels[newRow.status] || newRow.status}`,
            });
          }

          // Assignment notification — only notify the assigned user
          if (oldRow?.assigned_to_id !== newRow?.assigned_to_id && newRow?.assigned_to_id === user?.id) {
            toast({
              title: `${code} — Atribuída a você`,
              description: title,
              variant: 'default',
            });
          }

          // Invalidate queries to refresh data
          qc.invalidateQueries({ queryKey: ['work_orders'] });
          qc.invalidateQueries({ queryKey: ['work_order', newRow?.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'work_orders',
          filter: `tenant_id=eq.${currentTenantId}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          const code = newRow?.code || '';
          toast({
            title: 'Nova OS criada',
            description: `${code} — ${newRow?.title || ''}`,
          });

          // If assigned to current user on creation
          if (newRow?.assigned_to_id === user?.id) {
            toast({
              title: `${code} — Atribuída a você`,
              description: newRow?.title || '',
            });
          }

          qc.invalidateQueries({ queryKey: ['work_orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenantId, qc, user]);
}

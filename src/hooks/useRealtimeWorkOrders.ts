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
          const oldStatus = (payload.old as any)?.status;
          const newStatus = (payload.new as any)?.status;
          const code = (payload.new as any)?.code || '';
          const title = (payload.new as any)?.title || '';

          // Only notify if status actually changed and not by current user
          if (oldStatus && newStatus && oldStatus !== newStatus) {
            toast({
              title: `${code} — Status alterado`,
              description: `${title}: ${statusLabels[oldStatus] || oldStatus} → ${statusLabels[newStatus] || newStatus}`,
            });
          }

          // Invalidate queries to refresh data
          qc.invalidateQueries({ queryKey: ['work_orders'] });
          qc.invalidateQueries({ queryKey: ['work_order', (payload.new as any)?.id] });
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
          const code = (payload.new as any)?.code || '';
          toast({
            title: 'Nova OS criada',
            description: `${code} — ${(payload.new as any)?.title || ''}`,
          });
          qc.invalidateQueries({ queryKey: ['work_orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenantId, qc, user]);
}

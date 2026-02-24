import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { statusLabels } from '@/lib/permissions';

export function useRealtimeWorkOrders() {
  const { currentTenantId, memberships, user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!currentTenantId) return;

    // Subscribe to all tenants the user belongs to (important for solicitantes with multi-dept access)
    const tenantIds = memberships.map(m => m.tenant_id);
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
            qc.invalidateQueries({ queryKey: ['work_orders_all'] });
            qc.invalidateQueries({ queryKey: ['portal_work_orders'] });
          }
        )
        .subscribe();

      channels.push(channel);
    }

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [currentTenantId, memberships, qc, user]);
}

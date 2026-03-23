import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { registerStockMovement } from '@/lib/stockMovementService';

export interface Disposal {
  id: string;
  tenant_id: string;
  origin_type: 'estoque' | 'ativo' | 'manual';
  stock_item_id: string | null;
  asset_id: string | null;
  item_name: string;
  item_description: string | null;
  quantity: number;
  unit: string;
  reason: string;
  reason_detail: string | null;
  category: string;
  residual_value: number;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'efetivado';
  attachments: any[];
  approved_by: string | null;
  approved_at: string | null;
  rejection_note: string | null;
  stock_movement_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${data.session?.access_token}`,
    'Content-Type': 'application/json',
  };
}

export function useDisposals() {
  const { currentTenantId, user } = useAuth();
  const qc = useQueryClient();

  const { data: disposals = [], isLoading } = useQuery({
    queryKey: ['disposals', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${BASE_URL}/rest/v1/disposals?tenant_id=eq.${currentTenantId}&order=created_at.desc`,
        { headers }
      );
      if (!res.ok) throw new Error('Erro ao carregar descartes');
      return (await res.json()) as Disposal[];
    },
    enabled: !!currentTenantId,
  });

  const createDisposal = useMutation({
    mutationFn: async (data: Partial<Disposal>) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/disposals`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({
          ...data,
          tenant_id: currentTenantId,
          created_by: user?.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || 'Erro ao registrar descarte');
      }
      return (await res.json())[0];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disposals'] });
      toast.success('Descarte registrado com sucesso');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateDisposal = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Disposal> & { id: string }) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/disposals?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || 'Erro ao atualizar descarte');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disposals'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const approveDisposal = useMutation({
    mutationFn: async ({ id, createStockMovement }: { id: string; createStockMovement?: boolean }) => {
      const headers = await getAuthHeaders();

      const res = await fetch(`${BASE_URL}/rest/v1/disposals?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({
          status: 'aprovado',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error('Erro ao aprovar descarte');

      const disposal = (await res.json())[0] as Disposal;

      if (disposal.asset_id) {
        await fetch(`${BASE_URL}/rest/v1/assets?id=eq.${disposal.asset_id}`, {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'descartado' }),
        });
      }

      if (createStockMovement && disposal.stock_item_id && currentTenantId) {
        const movementResult = await registerStockMovement({
          tenantId: currentTenantId,
          stockItemId: disposal.stock_item_id,
          type: 'out',
          qty: disposal.quantity,
          userId: user?.id,
          reference: `Descarte #${disposal.id.slice(0, 8)}`,
        });

        await fetch(`${BASE_URL}/rest/v1/disposals?id=eq.${id}`, {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({
            stock_movement_id: movementResult.movementId,
            status: 'efetivado',
          }),
        });
      } else {
        await fetch(`${BASE_URL}/rest/v1/disposals?id=eq.${id}`, {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'efetivado' }),
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disposals'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['stock_items'] });
      qc.invalidateQueries({ queryKey: ['stock_movements'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Descarte aprovado e efetivado');
    },
    onError: (err: any) => {
      if (err?.message === 'INSUFFICIENT_STOCK') toast.error('Estoque insuficiente para efetivar descarte');
      else toast.error(err.message);
    },
  });

  const reopenDisposal = useMutation({
    mutationFn: async (id: string) => {
      const headers = await getAuthHeaders();

      const dRes = await fetch(`${BASE_URL}/rest/v1/disposals?id=eq.${id}&select=*`, { headers });
      if (!dRes.ok) throw new Error('Erro ao buscar descarte');
      const disposal = (await dRes.json())[0] as Disposal;
      if (!disposal) throw new Error('Descarte não encontrado');

      if (disposal.status === 'efetivado') {
        if (disposal.origin_type === 'estoque' && disposal.stock_item_id) {
          const stockRes = await fetch(
            `${BASE_URL}/rest/v1/stock_items?id=eq.${disposal.stock_item_id}&select=current_level`,
            { headers }
          );
          if (stockRes.ok) {
            const stockData = await stockRes.json();
            const currentLevel = stockData[0]?.current_level || 0;
            const restoredLevel = currentLevel + disposal.quantity;
            await fetch(`${BASE_URL}/rest/v1/stock_items?id=eq.${disposal.stock_item_id}`, {
              method: 'PATCH',
              headers: { ...headers, Prefer: 'return=minimal' },
              body: JSON.stringify({ current_level: restoredLevel, status: 'ativo' }),
            });
          }

          if (disposal.stock_movement_id) {
            await fetch(`${BASE_URL}/rest/v1/stock_movements?id=eq.${disposal.stock_movement_id}`, {
              method: 'DELETE',
              headers,
            });
          }
        }

        if (disposal.origin_type === 'ativo' && disposal.asset_id) {
          await fetch(`${BASE_URL}/rest/v1/assets?id=eq.${disposal.asset_id}`, {
            method: 'PATCH',
            headers: { ...headers, Prefer: 'return=minimal' },
            body: JSON.stringify({ status: 'ativo' }),
          });
        }
      }

      const res = await fetch(`${BASE_URL}/rest/v1/disposals?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({
          status: 'pendente',
          approved_by: null,
          approved_at: null,
          rejection_note: null,
          stock_movement_id: null,
        }),
      });
      if (!res.ok) throw new Error('Erro ao reabrir descarte');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disposals'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['stock_items'] });
      qc.invalidateQueries({ queryKey: ['stock_movements'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Descarte reaberto — alterações de estoque/ativo revertidas');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const rejectDisposal = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/disposals?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({
          status: 'rejeitado',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejection_note: note,
        }),
      });
      if (!res.ok) throw new Error('Erro ao rejeitar descarte');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disposals'] });
      toast.success('Descarte rejeitado');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteDisposal = useMutation({
    mutationFn: async (id: string) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE_URL}/rest/v1/disposals?id=eq.${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Erro ao excluir descarte');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disposals'] });
      toast.success('Descarte excluído');
    },
    onError: (err: any) => toast.error(err.message),
  });

  return {
    disposals,
    isLoading,
    createDisposal,
    updateDisposal,
    approveDisposal,
    rejectDisposal,
    reopenDisposal,
    deleteDisposal,
  };
}

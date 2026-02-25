import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Node, Edge } from '@xyflow/react';

export interface CanvasBoard {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
  created_at: string;
  updated_at: string;
}

export function useCanvasBoards() {
  const { user, currentTenantId } = useAuth();
  const [boards, setBoards] = useState<CanvasBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchBoards = useCallback(async () => {
    if (!user || !currentTenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('canvas_boards')
      .select('*')
      .eq('user_id', user.id)
      .eq('tenant_id', currentTenantId)
      .order('updated_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar canvas');
    } else {
      setBoards((data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        nodes: (d.nodes || []) as Node[],
        edges: (d.edges || []) as Edge[],
        viewport: (d.viewport || { x: 0, y: 0, zoom: 1 }) as any,
        created_at: d.created_at,
        updated_at: d.updated_at,
      })));
    }
    setLoading(false);
  }, [user, currentTenantId]);

  useEffect(() => { fetchBoards(); }, [fetchBoards]);

  const createBoard = useCallback(async (name: string) => {
    if (!user || !currentTenantId) return null;
    const { data, error } = await supabase
      .from('canvas_boards')
      .insert({ user_id: user.id, tenant_id: currentTenantId, name })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar canvas');
      return null;
    }
    await fetchBoards();
    toast.success('Canvas criado!');
    return data;
  }, [user, currentTenantId, fetchBoards]);

  const saveBoard = useCallback(async (id: string, nodes: Node[], edges: Edge[], viewport: { x: number; y: number; zoom: number }) => {
    setSaving(true);
    const { error } = await supabase
      .from('canvas_boards')
      .update({ nodes: nodes as any, edges: edges as any, viewport: viewport as any })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao salvar');
    } else {
      toast.success('Canvas salvo!');
    }
    setSaving(false);
  }, []);

  const deleteBoard = useCallback(async (id: string) => {
    const { error } = await supabase.from('canvas_boards').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir');
    } else {
      toast.success('Canvas excluído');
      await fetchBoards();
    }
  }, [fetchBoards]);

  const renameBoard = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from('canvas_boards').update({ name }).eq('id', id);
    if (error) toast.error('Erro ao renomear');
    else await fetchBoards();
  }, [fetchBoards]);

  return { boards, loading, saving, createBoard, saveBoard, deleteBoard, renameBoard, fetchBoards };
}

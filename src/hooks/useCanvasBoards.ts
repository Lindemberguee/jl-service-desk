import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Node, Edge } from '@xyflow/react';

export interface CanvasBoard {
  id: string;
  name: string;
  user_id: string;
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
  created_at: string;
  updated_at: string;
  is_shared?: boolean;
  share_permission?: 'view' | 'edit';
  owner_name?: string;
}

interface SaveBoardOptions {
  removedNodeIds?: string[];
  removedEdgeIds?: string[];
}

function mapBoard(d: any, userId?: string): CanvasBoard {
  return {
    id: d.id,
    name: d.name,
    user_id: d.user_id,
    nodes: (d.nodes || []) as Node[],
    edges: (d.edges || []) as Edge[],
    viewport: (d.viewport || { x: 0, y: 0, zoom: 1 }) as any,
    created_at: d.created_at,
    updated_at: d.updated_at,
    is_shared: userId ? d.user_id !== userId : false,
  };
}

function mergeNodes(serverNodes: Node[], localNodes: Node[], removedNodeIds: Set<string>) {
  const merged = new Map<string, Node>();

  serverNodes.forEach((node) => {
    if (!removedNodeIds.has(node.id)) merged.set(node.id, node);
  });

  localNodes.forEach((node) => {
    if (!removedNodeIds.has(node.id)) merged.set(node.id, node);
  });

  return Array.from(merged.values());
}

function mergeEdges(serverEdges: Edge[], localEdges: Edge[], removedEdgeIds: Set<string>, validNodeIds: Set<string>) {
  const merged = new Map<string, Edge>();

  serverEdges.forEach((edge) => {
    if (!removedEdgeIds.has(edge.id)) merged.set(edge.id, edge);
  });

  localEdges.forEach((edge) => {
    if (!removedEdgeIds.has(edge.id)) merged.set(edge.id, edge);
  });

  return Array.from(merged.values()).filter((edge) => validNodeIds.has(edge.source) && validNodeIds.has(edge.target));
}

export function useCanvasBoards() {
  const { user, currentTenantId } = useAuth();
  const [boards, setBoards] = useState<CanvasBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchBoards = useCallback(async () => {
    if (!user || !currentTenantId) return;
    setLoading(true);

    const { data: ownData } = await supabase
      .from('canvas_boards')
      .select('*')
      .eq('user_id', user.id)
      .eq('tenant_id', currentTenantId)
      .order('updated_at', { ascending: false });

    const { data: shareData } = await supabase
      .from('canvas_board_shares')
      .select('board_id, permission')
      .eq('shared_with_user_id', user.id)
      .eq('tenant_id', currentTenantId);

    let sharedBoards: CanvasBoard[] = [];
    if (shareData && shareData.length > 0) {
      const boardIds = shareData.map((s) => s.board_id);
      const { data: sharedData } = await supabase
        .from('canvas_boards')
        .select('*')
        .in('id', boardIds)
        .order('updated_at', { ascending: false });

      if (sharedData) {
        const ownerIds = [...new Set(sharedData.map((b) => b.user_id))];
        const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', ownerIds);
        const profileMap = new Map((profiles || []).map((p) => [p.id, p.name]));
        const shareMap = new Map(shareData.map((s) => [s.board_id, s.permission]));

        sharedBoards = sharedData.map((d) => ({
          ...mapBoard(d, user.id),
          is_shared: true,
          share_permission: shareMap.get(d.id) as 'view' | 'edit',
          owner_name: profileMap.get(d.user_id) || 'Desconhecido',
        }));
      }
    }

    const own = (ownData || []).map((d) => mapBoard(d, user.id));
    setBoards([...own, ...sharedBoards]);
    setLoading(false);
  }, [user, currentTenantId]);

  useEffect(() => {
    if (!user || !currentTenantId) return;

    const channel = supabase
      .channel(`canvas-realtime-${currentTenantId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'canvas_boards', filter: `tenant_id=eq.${currentTenantId}`,
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as any;
          setBoards((prev) => prev.map((b) =>
            b.id === updated.id
              ? {
                  ...b,
                  name: updated.name,
                  updated_at: updated.updated_at,
                  nodes: b.id === updated.id ? (updated.nodes || b.nodes) : b.nodes,
                  edges: b.id === updated.id ? (updated.edges || b.edges) : b.edges,
                  viewport: b.id === updated.id ? (updated.viewport || b.viewport) : b.viewport,
                }
              : b
          ));
        } else if (payload.eventType === 'DELETE') {
          setBoards((prev) => prev.filter((b) => b.id !== (payload.old as any).id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, currentTenantId]);

  useEffect(() => { fetchBoards(); }, [fetchBoards]);

  const createBoard = useCallback(async (name: string) => {
    if (!user || !currentTenantId) return null;
    const { data, error } = await supabase.from('canvas_boards').insert({ user_id: user.id, tenant_id: currentTenantId, name }).select().single();
    if (error) { toast.error('Erro ao criar canvas'); return null; }
    await fetchBoards();
    toast.success('Canvas criado!');
    return data;
  }, [user, currentTenantId, fetchBoards]);

  const saveBoard = useCallback(async (
    id: string,
    nodes: Node[],
    edges: Edge[],
    viewport: { x: number; y: number; zoom: number },
    options?: SaveBoardOptions,
  ) => {
    setSaving(true);
    const now = new Date().toISOString();
    const removedNodeIds = new Set(options?.removedNodeIds || []);
    const removedEdgeIds = new Set(options?.removedEdgeIds || []);

    const { data: serverBoard, error: fetchError } = await supabase
      .from('canvas_boards')
      .select('nodes, edges, viewport')
      .eq('id', id)
      .single();

    if (fetchError) {
      setSaving(false);
      toast.error('Erro ao preparar salvamento colaborativo');
      return now;
    }

    const mergedNodes = mergeNodes((serverBoard?.nodes || []) as unknown as Node[], nodes, removedNodeIds);
    const validNodeIds = new Set(mergedNodes.map((node) => node.id));
    const mergedEdges = mergeEdges((serverBoard?.edges || []) as unknown as Edge[], edges, removedEdgeIds, validNodeIds);

    const { error } = await supabase
      .from('canvas_boards')
      .update({
        nodes: mergedNodes as any,
        edges: mergedEdges as any,
        viewport: viewport as any,
        updated_at: now,
      })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao salvar');
    } else {
      setBoards((prev) => prev.map((b) =>
        b.id === id ? { ...b, nodes: mergedNodes, edges: mergedEdges, viewport, updated_at: now } : b
      ));
    }

    setSaving(false);
    return now;
  }, []);

  const deleteBoard = useCallback(async (id: string) => {
    const { error } = await supabase.from('canvas_boards').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir');
    else { toast.success('Canvas excluído'); await fetchBoards(); }
  }, [fetchBoards]);

  const renameBoard = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from('canvas_boards').update({ name }).eq('id', id);
    if (error) toast.error('Erro ao renomear');
    else await fetchBoards();
  }, [fetchBoards]);

  return { boards, loading, saving, createBoard, saveBoard, deleteBoard, renameBoard, fetchBoards };
}

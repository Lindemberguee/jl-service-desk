import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  type OnConnect,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toast } from 'sonner';
import CanvasNode, { getPreset, type CanvasNodeData } from './CanvasNode';
import CustomEdge, { type EdgeStyle, type CustomEdgeData } from './CustomEdge';
import NodePalette from './NodePalette';
import CanvasToolbar from './CanvasToolbar';
import CanvasContextMenu from './CanvasContextMenu';
import QuickNodeMenu from './QuickNodeMenu';
import EdgeSettingsPanel from './EdgeSettingsPanel';
import CanvasCursors from './CanvasCursors';
import CanvasPresenceBar from './CanvasPresenceBar';
import CanvasInspector from './CanvasInspector';
import { useCanvasHistory } from '@/hooks/useCanvasHistory';
import { useCanvasRealtime, type CanvasOp } from '@/hooks/useCanvasRealtime';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, PanelLeftOpen, Settings2, Workflow, Shapes, PlusCircle, Share2, ShieldCheck, Eye, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface CanvasBoardProps {
  boardId: string;
  boardName: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  initialViewport?: { x: number; y: number; zoom: number };
  onSave: (nodes: Node[], edges: Edge[], viewport: { x: number; y: number; zoom: number }) => Promise<any>;
  saving: boolean;
  readOnly?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

let nodeId = 0;
const getNodeId = () => `node_${Date.now()}_${nodeId++}`;

const createEdgeMarker = (color: string) => ({
  type: MarkerType.ArrowClosed,
  color,
  width: 16,
  height: 16,
});

const isEqualJson = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function CanvasBoardInner({
  boardId,
  boardName,
  initialNodes,
  initialEdges,
  initialViewport,
  onSave,
  saving,
  readOnly = false,
  isFullscreen,
  onToggleFullscreen,
}: CanvasBoardProps) {
  const nodeTypeMap = useMemo(() => ({ canvasNode: CanvasNode }), []);
  const edgeTypeMap = useMemo(() => ({ custom: CustomEdge }), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const hasChangesRef = useRef(false);
  const [hasChanges, setHasChanges] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const localChangeCountRef = useRef(0);
  const lastSavedAtRef = useRef<string | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const isApplyingRemoteRef = useRef(false);
  const prevNodesSnapshotRef = useRef<Node[]>(initialNodes);
  const prevEdgesSnapshotRef = useRef<Edge[]>(initialEdges);
  const hasSyncedSnapshotRef = useRef(false);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const [edgeStyle, setEdgeStyle] = useState<EdgeStyle>('bezier');
  const [showPalette, setShowPalette] = useState(true);
  const [showInspector, setShowInspector] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [quickMenu, setQuickMenu] = useState<{ screen: { x: number; y: number }; flow: { x: number; y: number } } | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<{ id: string; position: { x: number; y: number } } | null>(null);
  const [shareInfo, setShareInfo] = useState<{ publicToken: string | null; sharesCount: number }>({ publicToken: null, sharesCount: 0 });
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const contextMenuPos = useRef({ x: 0, y: 0 });
  const { screenToFlowPosition, getViewport, flowToScreenPosition } = useReactFlow();
  const { user, currentTenantId } = useAuth();
  const history = useCanvasHistory();
  const [, setUndoKey] = useState(0);

  const userName = user?.user_metadata?.name || user?.email || 'Usuário';

  const handleRemoteOp = useCallback((op: CanvasOp, _senderId: string) => {
    isApplyingRemoteRef.current = true;
    try {
      switch (op.type) {
        case 'node:add':
          setNodes((nds) => {
            if (nds.find((n) => n.id === op.node.id)) return nds;
            return [...nds, op.node];
          });
          break;
        case 'node:move':
          setNodes((nds) => nds.map((n) => (n.id === op.nodeId ? { ...n, position: op.position } : n)));
          break;
        case 'node:update':
          setNodes((nds) => nds.map((n) => (n.id === op.nodeId ? { ...n, data: { ...n.data, ...op.data } } : n)));
          break;
        case 'node:remove':
          setNodes((nds) => nds.filter((n) => n.id !== op.nodeId));
          setEdges((eds) => eds.filter((e) => e.source !== op.nodeId && e.target !== op.nodeId));
          break;
        case 'edge:add':
          setEdges((eds) => {
            if (eds.find((e) => e.id === op.edge.id)) return eds;
            return [...eds, op.edge];
          });
          break;
        case 'edge:remove':
          setEdges((eds) => eds.filter((e) => e.id !== op.edgeId));
          break;
        case 'edge:update':
          setEdges((eds) =>
            eds.map((e) => {
              if (e.id !== op.edgeId) return e;
              const mergedData = { ...(e.data as CustomEdgeData), ...op.data };
              const nextColor = typeof mergedData.color === 'string' ? mergedData.color : undefined;
              return {
                ...e,
                data: mergedData,
                markerEnd: op.markerEnd ?? (nextColor ? createEdgeMarker(nextColor) : e.markerEnd),
              };
            })
          );
          break;
        case 'full:sync':
          setNodes(op.nodes);
          setEdges(op.edges);
          break;
      }
    } finally {
      setTimeout(() => {
        isApplyingRemoteRef.current = false;
      }, 50);
    }
  }, [setNodes, setEdges]);

  const { remoteUsers, broadcastCursor, broadcastSelection, broadcastOp, connectionState, queuedOpsCount } = useCanvasRealtime({
    boardId,
    userId: user?.id || '',
    userName,
    userAvatar: user?.user_metadata?.avatar_url,
    enabled: !!user && !!boardId,
    readOnly,
    onRemoteOp: handleRemoteOp,
  });

  useEffect(() => {
    const loadShareInfo = async () => {
      const [{ data: boardData }, { count }] = await Promise.all([
        supabase.from('canvas_boards').select('public_share_token').eq('id', boardId).single(),
        supabase.from('canvas_board_shares').select('*', { count: 'exact', head: true }).eq('board_id', boardId),
      ]);

      setShareInfo({
        publicToken: boardData?.public_share_token || null,
        sharesCount: count || 0,
      });
    };

    if (boardId) loadShareInfo();
  }, [boardId]);

  useEffect(() => {
    if (!hasSyncedSnapshotRef.current) {
      prevNodesSnapshotRef.current = nodes;
      prevEdgesSnapshotRef.current = edges;
      hasSyncedSnapshotRef.current = true;
      return;
    }

    const prevNodes = prevNodesSnapshotRef.current;
    const prevEdges = prevEdgesSnapshotRef.current;
    prevNodesSnapshotRef.current = nodes;
    prevEdgesSnapshotRef.current = edges;

    if (readOnly || isApplyingRemoteRef.current) return;

    const prevNodeMap = new Map(prevNodes.map((n) => [n.id, n]));
    const nextNodeMap = new Map(nodes.map((n) => [n.id, n]));

    nodes.forEach((node) => {
      if (!prevNodeMap.has(node.id)) broadcastOp({ type: 'node:add', node });
    });

    prevNodes.forEach((node) => {
      if (!nextNodeMap.has(node.id)) broadcastOp({ type: 'node:remove', nodeId: node.id });
    });

    nodes.forEach((node) => {
      const prevNode = prevNodeMap.get(node.id);
      if (!prevNode) return;
      if (!isEqualJson(prevNode.data, node.data)) {
        broadcastOp({ type: 'node:update', nodeId: node.id, data: (node.data ?? {}) as Record<string, unknown> });
      }
    });

    const prevEdgeMap = new Map(prevEdges.map((e) => [e.id, e]));
    const nextEdgeMap = new Map(edges.map((e) => [e.id, e]));

    edges.forEach((edge) => {
      if (!prevEdgeMap.has(edge.id)) broadcastOp({ type: 'edge:add', edge });
    });

    prevEdges.forEach((edge) => {
      if (!nextEdgeMap.has(edge.id)) broadcastOp({ type: 'edge:remove', edgeId: edge.id });
    });

    edges.forEach((edge) => {
      const prevEdge = prevEdgeMap.get(edge.id);
      if (!prevEdge) return;
      const dataChanged = !isEqualJson(prevEdge.data, edge.data);
      const markerChanged = !isEqualJson(prevEdge.markerEnd, edge.markerEnd);
      if (dataChanged || markerChanged) {
        broadcastOp({ type: 'edge:update', edgeId: edge.id, data: (edge.data ?? {}) as Record<string, unknown>, markerEnd: edge.markerEnd });
      }
    });
  }, [nodes, edges, readOnly, broadcastOp]);

  useEffect(() => {
    if (isApplyingRemoteRef.current) return;
    localChangeCountRef.current++;
    hasChangesRef.current = true;
    setHasChanges(true);
  }, [nodes, edges]);

  useEffect(() => {
    const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
    broadcastSelection(selectedIds);
    setSelectedNodeId(selectedIds.length === 1 ? selectedIds[0] : null);
  }, [nodes, broadcastSelection]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!reactFlowWrapper.current) return;
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const flowPos = screenToFlowPosition({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    broadcastCursor(flowPos.x, flowPos.y);
  }, [screenToFlowPosition, broadcastCursor]);

  useEffect(() => {
    if (!currentTenantId) return;
    const channel = supabase
      .channel(`canvas-db-${boardId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'canvas_boards', filter: `id=eq.${boardId}` }, (payload) => {
        const updated = payload.new as any;
        if (lastSavedAtRef.current && updated.updated_at === lastSavedAtRef.current) return;
        if (isSavingRef.current) return;
        if (hasChangesRef.current) return;
        if (remoteUsers.length === 0) {
          setNodes(updated.nodes as Node[]);
          setEdges(updated.edges as Edge[]);
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [boardId, currentTenantId, setNodes, setEdges, remoteUsers.length]);

  useEffect(() => {
    if (!hasChanges || readOnly) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const changesBefore = localChangeCountRef.current;
      isSavingRef.current = true;
      const now = new Date().toISOString();
      lastSavedAtRef.current = now;
      await onSave(nodesRef.current, edgesRef.current, getViewport());
      if (localChangeCountRef.current === changesBefore) {
        hasChangesRef.current = false;
        setHasChanges(false);
      }
      setTimeout(() => { isSavingRef.current = false; }, 2000);
    }, 2000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [nodes, edges, hasChanges, getViewport, onSave, readOnly]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F11') { e.preventDefault(); onToggleFullscreen?.(); return; }
      if (e.key === 'Escape' && isFullscreen) { onToggleFullscreen?.(); return; }
      if (readOnly) return;
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); duplicateSelected(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); selectAll(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nodes, edges, readOnly, isFullscreen, onToggleFullscreen]);

  const pushHistory = useCallback(() => {
    history.push(nodes, edges);
    setUndoKey((k) => k + 1);
  }, [nodes, edges, history]);

  const edgeColor = useMemo(() => {
    const colors = ['hsl(213, 94%, 55%)', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    return colors[edges.length % colors.length];
  }, [edges.length]);

  const connectingFrom = useRef<{ nodeId: string; handleId: string | null } | null>(null);

  const onConnectStart = useCallback((_: any, params: { nodeId: string | null; handleId: string | null }) => {
    connectingFrom.current = { nodeId: params.nodeId || '', handleId: params.handleId };
  }, []);

  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    if (readOnly || !connectingFrom.current) return;
    const target = event.target as HTMLElement;
    if (target.closest('.react-flow__node') || target.closest('.react-flow__handle')) return;
    const clientX = 'clientX' in event ? event.clientX : event.touches?.[0]?.clientX || 0;
    const clientY = 'clientY' in event ? event.clientY : event.touches?.[0]?.clientY || 0;
    const position = screenToFlowPosition({ x: clientX, y: clientY });
    pushHistory();
    const preset = getPreset('idea');
    const newId = getNodeId();
    const newNode: Node = { id: newId, type: 'canvasNode', data: { label: `${preset.label} ${nodes.length + 1}`, nodeType: 'idea' } satisfies CanvasNodeData, position };
    setNodes((nds) => [...nds, newNode]);
    broadcastOp({ type: 'node:add', node: newNode });

    const sourceId = connectingFrom.current.nodeId;
    const sourceHandleId = connectingFrom.current.handleId;
    const edgeId = `edge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newEdge: Edge = {
      id: edgeId,
      source: sourceId,
      sourceHandle: sourceHandleId,
      target: newId,
      targetHandle: 'left-target',
      type: 'custom',
      data: { edgeStyle, animated: true, color: edgeColor } satisfies CustomEdgeData,
      markerEnd: createEdgeMarker(edgeColor),
    };
    setEdges((eds) => addEdge(newEdge, eds));
    broadcastOp({ type: 'edge:add', edge: newEdge });
    connectingFrom.current = null;
  }, [readOnly, screenToFlowPosition, nodes.length, setNodes, setEdges, edgeStyle, edgeColor, pushHistory, broadcastOp]);

  const onConnect: OnConnect = useCallback((params: Connection) => {
    if (readOnly) return;
    pushHistory();
    const edgeId = `edge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const edgeToAdd: Edge = { id: edgeId, ...params, type: 'custom', data: { edgeStyle, animated: true, color: edgeColor } satisfies CustomEdgeData, markerEnd: createEdgeMarker(edgeColor) };
    setEdges((eds) => addEdge(edgeToAdd, eds));
    broadcastOp({ type: 'edge:add', edge: edgeToAdd });
    connectingFrom.current = null;
  }, [setEdges, readOnly, edgeStyle, pushHistory, edgeColor, broadcastOp]);

  const createNode = useCallback((type: string, position: { x: number; y: number }) => {
    if (readOnly) return;
    pushHistory();
    const preset = getPreset(type);
    const newNode: Node = { id: getNodeId(), type: 'canvasNode', data: { label: `${preset.label} ${nodes.length + 1}`, nodeType: type } satisfies CanvasNodeData, position };
    setNodes((nds) => [...nds, newNode]);
    broadcastOp({ type: 'node:add', node: newNode });
  }, [nodes.length, setNodes, readOnly, pushHistory, broadcastOp]);

  const createNodeAtViewportCenter = useCallback((type: string) => {
    if (!reactFlowWrapper.current) return;
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const center = screenToFlowPosition({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 });
    createNode(type, center);
  }, [createNode, screenToFlowPosition]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    if (readOnly) return;
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    createNode(type, position);
  }, [screenToFlowPosition, createNode, readOnly]);

  const handleDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const deleteSelected = useCallback(() => {
    if (readOnly) return;
    const sn = nodes.filter((n) => n.selected);
    const se = edges.filter((e) => e.selected);
    if (sn.length === 0 && se.length === 0) return;
    pushHistory();
    sn.forEach((n) => broadcastOp({ type: 'node:remove', nodeId: n.id }));
    se.forEach((e) => broadcastOp({ type: 'edge:remove', edgeId: e.id }));
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
    toast.success(`${sn.length + se.length} elemento(s) excluído(s)`);
  }, [nodes, edges, setNodes, setEdges, readOnly, pushHistory, broadcastOp]);

  const duplicateSelected = useCallback(() => {
    if (readOnly) return;
    const selected = nodes.filter((n) => n.selected);
    if (selected.length === 0) return;
    pushHistory();
    const newNodes = selected.map((n) => {
      const nn: Node = { ...n, id: getNodeId(), position: { x: n.position.x + 40, y: n.position.y + 40 }, selected: false, data: { ...n.data } };
      broadcastOp({ type: 'node:add', node: nn });
      return nn;
    });
    setNodes((nds) => [...nds, ...newNodes]);
    toast.success(`${newNodes.length} nó(s) duplicado(s)`);
  }, [nodes, setNodes, readOnly, pushHistory, broadcastOp]);

  const selectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
    setEdges((eds) => eds.map((e) => ({ ...e, selected: true })));
  }, [setNodes, setEdges]);

  const handleSave = useCallback(async () => {
    if (readOnly) return;
    isSavingRef.current = true;
    const savedAt = await onSave(nodesRef.current, edgesRef.current, getViewport());
    lastSavedAtRef.current = savedAt;
    hasChangesRef.current = false;
    setHasChanges(false);
    setTimeout(() => { isSavingRef.current = false; }, 2000);
  }, [getViewport, onSave, readOnly]);

  const handleUndo = useCallback(() => {
    const snapshot = history.undo(nodes, edges);
    if (snapshot) {
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
      setUndoKey((k) => k + 1);
      broadcastOp({ type: 'full:sync', nodes: snapshot.nodes, edges: snapshot.edges });
    }
  }, [nodes, edges, history, setNodes, setEdges, broadcastOp]);

  const handleRedo = useCallback(() => {
    const snapshot = history.redo(nodes, edges);
    if (snapshot) {
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
      setUndoKey((k) => k + 1);
      broadcastOp({ type: 'full:sync', nodes: snapshot.nodes, edges: snapshot.edges });
    }
  }, [nodes, edges, history, setNodes, setEdges, broadcastOp]);

  const handleExport = useCallback(() => {
    const el = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!el) return;
    import('html-to-image').then(({ toPng }) => {
      toPng(el, { backgroundColor: '#0f172a' }).then((dataUrl) => {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${boardName || 'canvas'}.png`;
        a.click();
        toast.success('Canvas exportado!');
      }).catch(() => toast.error('Erro ao exportar'));
    });
  }, [boardName]);

  const onNodesChangeWrapped = useCallback((changes: any) => {
    const hasDragEnd = changes.some((c: any) => c.type === 'position' && c.dragging === false);
    if (hasDragEnd) pushHistory();
    changes.forEach((c: any) => {
      if (c.type === 'position' && c.position && !c.dragging) broadcastOp({ type: 'node:move', nodeId: c.id, position: c.position });
    });
    onNodesChange(changes);
  }, [onNodesChange, pushHistory, broadcastOp]);

  const onNodeDrag = useCallback((_event: React.MouseEvent, node: Node) => {
    broadcastOp({ type: 'node:move', nodeId: node.id, position: node.position });
  }, [broadcastOp]);

  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    if (readOnly) return;
    const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setQuickMenu({ screen: { x: event.clientX, y: event.clientY }, flow: flowPos });
  }, [readOnly, screenToFlowPosition]);

  const handleQuickNodeSelect = useCallback((type: string) => {
    if (quickMenu) {
      createNode(type, quickMenu.flow);
      setQuickMenu(null);
    }
  }, [quickMenu, createNode]);

  const handleEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    if (readOnly) return;
    setSelectedEdge({ id: edge.id, position: { x: _event.clientX, y: _event.clientY - 200 } });
  }, [readOnly]);

  const handlePaneClick = useCallback(() => {
    setSelectedEdge(null);
  }, []);

  const remoteSelections = useMemo(() => {
    const map = new Map<string, { color: string; name: string }>();
    remoteUsers.forEach((u) => {
      u.selectedIds?.forEach((id) => {
        if (!map.has(id)) map.set(id, { color: u.color, name: u.name });
      });
    });
    return map;
  }, [remoteUsers]);

  const styledNodes = useMemo(() => nodes.map((n) => {
    const remote = remoteSelections.get(n.id);
    if (remote) {
      return { ...n, style: { ...n.style, outline: `2px solid ${remote.color}`, outlineOffset: '3px', borderRadius: '12px' } };
    }
    return n.style ? { ...n, style: undefined } : n;
  }), [nodes, remoteSelections]);

  const isEmpty = nodes.length === 0 && edges.length === 0;
  const boardModeLabel = readOnly ? 'Visualização' : 'Edição colaborativa';
  const collaboratorsCount = remoteUsers.length + 1;
  const isShared = shareInfo.sharesCount > 0 || !!shareInfo.publicToken;

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative" onMouseMove={handleMouseMove}>
      {!readOnly && showPalette && <NodePalette onDragStart={handleDragStart} onClose={() => setShowPalette(false)} />}
      {!readOnly && !showPalette && (
        <div className="absolute left-3 top-3 z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="icon" className="h-10 w-10 rounded-2xl shadow-xl bg-card/95 backdrop-blur-md border border-border hover:bg-accent" onClick={() => setShowPalette(true)}>
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Mostrar paleta</TooltipContent>
          </Tooltip>
        </div>
      )}

      <div className="absolute left-3 top-3 z-20 flex flex-wrap items-center gap-2 max-w-[calc(100%-1.5rem)] pr-4">
        <div className="rounded-3xl border border-border/70 bg-card/95 px-4 py-3 shadow-xl backdrop-blur-md min-w-[230px]">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Workflow className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Canvas Board</span>
          </div>
          <p className="mt-1.5 text-sm font-semibold truncate max-w-[260px]">{boardName}</p>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="rounded-full bg-background/60 px-2.5 py-1 text-[10px] gap-1.5">
              <Shapes className="h-3 w-3" /> {nodes.length} nós • {edges.length} conexões
            </Badge>
            <Badge variant={readOnly ? 'secondary' : 'default'} className="rounded-full px-2.5 py-1 text-[10px]">{boardModeLabel}</Badge>
          </div>
        </div>

        <Badge variant="outline" className="rounded-full bg-card/90 backdrop-blur-md shadow-md px-3 py-1.5 text-[10px] gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> {collaboratorsCount} pessoa{collaboratorsCount > 1 ? 's' : ''}
        </Badge>

        {isShared && (
          <Badge variant="outline" className="rounded-full bg-card/90 backdrop-blur-md shadow-md px-3 py-1.5 text-[10px] gap-1.5 text-blue-600 border-blue-500/20 bg-blue-500/5">
            <Share2 className="h-3.5 w-3.5" /> compartilhado
          </Badge>
        )}

        {shareInfo.sharesCount > 0 && (
          <Badge variant="outline" className="rounded-full bg-card/90 backdrop-blur-md shadow-md px-3 py-1.5 text-[10px] gap-1.5 text-indigo-600 border-indigo-500/20 bg-indigo-500/5">
            <ShieldCheck className="h-3.5 w-3.5" /> {shareInfo.sharesCount} acesso(s) interno(s)
          </Badge>
        )}

        {shareInfo.publicToken && (
          <Badge variant="outline" className="rounded-full bg-card/90 backdrop-blur-md shadow-md px-3 py-1.5 text-[10px] gap-1.5 text-amber-600 border-amber-500/20 bg-amber-500/5">
            <Eye className="h-3.5 w-3.5" /> link público ativo
          </Badge>
        )}
      </div>

      {showInspector && (
        <CanvasInspector
          selectedNodeId={selectedNodeId}
          onClose={() => setShowInspector(false)}
          readOnly={readOnly}
          onNodeUpdate={(nodeId, data) => broadcastOp({ type: 'node:update', nodeId, data })}
          onNodeMove={(nodeId, position) => broadcastOp({ type: 'node:move', nodeId, position })}
        />
      )}

      {quickMenu && <QuickNodeMenu position={quickMenu.screen} onSelect={handleQuickNodeSelect} onClose={() => setQuickMenu(null)} />}

      <CanvasCursors remoteUsers={remoteUsers} />

      {isEmpty && !readOnly && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none px-6">
          <div className="pointer-events-auto max-w-xl rounded-3xl border border-border/70 bg-card/95 p-6 shadow-2xl backdrop-blur-md text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Workflow className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Seu canvas está pronto para ganhar forma</h2>
            <p className="mt-2 text-sm text-muted-foreground">Arraste blocos da paleta, dê 2 cliques no quadro para criar rapidamente ou use os atalhos da barra inferior para começar com ideias, tarefas e alertas.</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Button className="rounded-xl gap-1.5" onClick={() => createNodeAtViewportCenter('idea')}><PlusCircle className="h-4 w-4" /> Adicionar ideia</Button>
              <Button variant="outline" className="rounded-xl gap-1.5" onClick={() => createNodeAtViewportCenter('task')}><PlusCircle className="h-4 w-4" /> Adicionar tarefa</Button>
            </div>
          </div>
        </div>
      )}

      <CanvasContextMenu onAddNode={(type, pos) => createNode(type, screenToFlowPosition(pos))} onDeleteSelected={deleteSelected} onDuplicate={duplicateSelected} onSelectAll={selectAll} position={contextMenuPos}>
        <div className="w-full h-full">
          <ReactFlow
            nodes={styledNodes}
            edges={edges}
            nodeTypes={nodeTypeMap}
            edgeTypes={edgeTypeMap}
            onNodesChange={readOnly ? undefined : onNodesChangeWrapped}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={onConnect}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onEdgeClick={handleEdgeClick}
            onPaneClick={handlePaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onNodeDrag={readOnly ? undefined : onNodeDrag}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
            connectionLineStyle={{ stroke: edgeColor, strokeWidth: 2 }}
            defaultEdgeOptions={{ type: 'custom', data: { edgeStyle, animated: true, color: edgeColor } satisfies CustomEdgeData, markerEnd: createEdgeMarker(edgeColor) }}
            className="canvas-flow"
            onContextMenu={(e) => { contextMenuPos.current = { x: e.clientX, y: e.clientY }; }}
            onDoubleClick={handleDoubleClick}
          >
            <MiniMap
              className="!bg-card/90 !border-border !rounded-xl !shadow-xl !backdrop-blur-sm"
              nodeColor={(node) => {
                const nd = node.data as CanvasNodeData;
                return (nd?.color as string) || getPreset(nd?.nodeType || 'idea').color;
              }}
              maskColor="rgba(0,0,0,0.4)"
              pannable
              zoomable
            />
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="hsl(var(--muted-foreground) / 0.08)" />

            <Panel position="top-right" className="mt-2 mr-2">
              <div className="flex items-center gap-2">
                <CanvasPresenceBar remoteUsers={remoteUsers} currentUserName={userName} connectionState={connectionState} queuedOpsCount={queuedOpsCount} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant={showInspector ? 'default' : 'secondary'} size="icon" className="h-10 w-10 rounded-2xl shadow-xl" onClick={() => setShowInspector((p) => !p)}>
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">{showInspector ? 'Ocultar inspetor' : 'Mostrar inspetor'}</TooltipContent>
                </Tooltip>
              </div>
            </Panel>

            <Panel position="bottom-center" className="mb-2">
              <CanvasToolbar
                saving={saving}
                readOnly={readOnly}
                edgeStyle={edgeStyle}
                onEdgeStyleChange={setEdgeStyle}
                onDelete={deleteSelected}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={history.canUndo()}
                canRedo={history.canRedo()}
                onExport={handleExport}
                showPalette={showPalette}
                onTogglePalette={() => setShowPalette((p) => !p)}
                isFullscreen={isFullscreen}
                onToggleFullscreen={onToggleFullscreen}
                onQuickAdd={createNodeAtViewportCenter}
              />
            </Panel>

            <Panel position="bottom-left" className="mb-2 ml-2">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 bg-card/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-border/50 shadow-sm">
                <Sparkles className="h-3 w-3" />
                {readOnly ? 'Somente leitura' : <span><kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">2×clique</kbd> novo bloco {' • '}<kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">Del</kbd> excluir {' • '}<kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">Ctrl+D</kbd> duplicar</span>}
              </div>
            </Panel>

            {Array.from(remoteSelections.entries()).map(([nodeId, { color, name }]) => {
              const node = nodes.find((n) => n.id === nodeId);
              if (!node) return null;
              const screen = flowToScreenPosition(node.position);
              return (
                <div key={`sel-${nodeId}`} className="absolute pointer-events-none z-40" style={{ left: screen.x, top: screen.y - 20, transform: 'translateX(-50%)' }}>
                  <div className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-white whitespace-nowrap" style={{ backgroundColor: color }}>{name}</div>
                </div>
              );
            })}
          </ReactFlow>
        </div>
      </CanvasContextMenu>

      {!readOnly && <EdgeSettingsPanel selectedEdgeId={selectedEdge?.id || null} position={selectedEdge?.position || null} />}
    </div>
  );
}

export default function CanvasBoard(props: CanvasBoardProps) {
  return <ReactFlowProvider><CanvasBoardInner {...props} /></ReactFlowProvider>;
}

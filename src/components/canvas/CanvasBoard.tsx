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
  Controls,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toast } from 'sonner';
import CanvasNode, { getPreset, type CanvasNodeData } from './CanvasNode';
import CustomEdge, { type EdgeStyle, type CustomEdgeData } from './CustomEdge';
import NodePalette from './NodePalette';
import CanvasPresence from './CanvasPresence';
import CanvasToolbar from './CanvasToolbar';
import CanvasContextMenu from './CanvasContextMenu';
import QuickNodeMenu from './QuickNodeMenu';
import { useCanvasHistory } from '@/hooks/useCanvasHistory';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MousePointer2, Sparkles, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CanvasBoardProps {
  boardId: string;
  boardName: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  initialViewport?: { x: number; y: number; zoom: number };
  onSave: (nodes: Node[], edges: Edge[], viewport: { x: number; y: number; zoom: number }) => Promise<void>;
  saving: boolean;
  readOnly?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

let nodeId = 0;
const getNodeId = () => `node_${Date.now()}_${nodeId++}`;

function CanvasBoardInner({ boardId, boardName, initialNodes, initialEdges, initialViewport, onSave, saving, readOnly = false, isFullscreen, onToggleFullscreen }: CanvasBoardProps) {
  const nodeTypeMap = useMemo(() => ({ canvasNode: CanvasNode }), []);
  const edgeTypeMap = useMemo(() => ({ custom: CustomEdge }), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [hasChanges, setHasChanges] = useState(false);
  const [edgeStyle, setEdgeStyle] = useState<EdgeStyle>('bezier');
  const [showPalette, setShowPalette] = useState(true);
  const [quickMenu, setQuickMenu] = useState<{ screen: { x: number; y: number }; flow: { x: number; y: number } } | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const contextMenuPos = useRef({ x: 0, y: 0 });
  const { screenToFlowPosition, getViewport } = useReactFlow();
  const { user, currentTenantId } = useAuth();
  const skipRealtimeRef = useRef(false);
  const history = useCanvasHistory();
  const [, setUndoKey] = useState(0);

  useEffect(() => { setHasChanges(true); }, [nodes, edges]);

  // Realtime sync
  useEffect(() => {
    if (!currentTenantId) return;
    const channel = supabase
      .channel(`canvas-board-${boardId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'canvas_boards', filter: `id=eq.${boardId}`,
      }, (payload) => {
        if (skipRealtimeRef.current) { skipRealtimeRef.current = false; return; }
        const updated = payload.new as any;
        setNodes(updated.nodes as Node[]);
        setEdges(updated.edges as Edge[]);
        setHasChanges(false);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [boardId, currentTenantId, user?.id, readOnly, setNodes, setEdges]);

  // Auto-save every 20s
  useEffect(() => {
    if (!hasChanges || readOnly) return;
    const timer = setTimeout(async () => {
      skipRealtimeRef.current = true;
      await onSave(nodes, edges, getViewport());
      setHasChanges(false);
    }, 20000);
    return () => clearTimeout(timer);
  }, [nodes, edges, hasChanges, getViewport, onSave, readOnly]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Fullscreen toggle works even in readOnly
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
    setUndoKey(k => k + 1);
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
    // Check if dropped on a node/handle (xyflow adds class to targets)
    const target = event.target as HTMLElement;
    const isDroppedOnNode = target.closest('.react-flow__node') || target.closest('.react-flow__handle');
    if (isDroppedOnNode) return;

    // Get position from mouse or touch
    const clientX = 'clientX' in event ? event.clientX : event.touches?.[0]?.clientX || 0;
    const clientY = 'clientY' in event ? event.clientY : event.touches?.[0]?.clientY || 0;
    const position = screenToFlowPosition({ x: clientX, y: clientY });

    pushHistory();
    const preset = getPreset('idea');
    const newId = getNodeId();
    const newNode: Node = {
      id: newId,
      type: 'canvasNode',
      data: { label: `${preset.label} ${nodes.length + 1}`, nodeType: 'idea' } satisfies CanvasNodeData,
      position,
    };
    setNodes((nds) => [...nds, newNode]);

    // Auto-connect from source to new node
    const sourceId = connectingFrom.current.nodeId;
    const sourceHandleId = connectingFrom.current.handleId;
    setEdges((eds) => addEdge({
      source: sourceId,
      sourceHandle: sourceHandleId,
      target: newId,
      targetHandle: 'left-target',
      type: 'custom',
      data: { edgeStyle, animated: true, color: edgeColor } satisfies CustomEdgeData,
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor, width: 16, height: 16 },
    }, eds));

    connectingFrom.current = null;
  }, [readOnly, screenToFlowPosition, nodes.length, setNodes, setEdges, edgeStyle, edgeColor, pushHistory]);

  const onConnect: OnConnect = useCallback((params: Connection) => {
    if (readOnly) return;
    pushHistory();
    setEdges((eds) => addEdge({
      ...params,
      type: 'custom',
      data: { edgeStyle, animated: true, color: edgeColor } satisfies CustomEdgeData,
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor, width: 16, height: 16 },
    }, eds));
    connectingFrom.current = null;
  }, [setEdges, readOnly, edgeStyle, pushHistory, edgeColor]);

  const createNode = useCallback((type: string, position: { x: number; y: number }) => {
    if (readOnly) return;
    pushHistory();
    const preset = getPreset(type);
    const newNode: Node = {
      id: getNodeId(),
      type: 'canvasNode',
      data: { label: `${preset.label} ${nodes.length + 1}`, nodeType: type } satisfies CanvasNodeData,
      position,
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes.length, setNodes, readOnly, pushHistory]);

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
    const sn = nodes.filter(n => n.selected).length;
    const se = edges.filter(e => e.selected).length;
    if (sn === 0 && se === 0) return;
    pushHistory();
    setNodes(nds => nds.filter(n => !n.selected));
    setEdges(eds => eds.filter(e => !e.selected));
    toast.success(`${sn + se} elemento(s) excluído(s)`);
  }, [nodes, edges, setNodes, setEdges, readOnly, pushHistory]);

  const duplicateSelected = useCallback(() => {
    if (readOnly) return;
    const selected = nodes.filter(n => n.selected);
    if (selected.length === 0) return;
    pushHistory();
    const newNodes = selected.map(n => ({
      ...n,
      id: getNodeId(),
      position: { x: n.position.x + 40, y: n.position.y + 40 },
      selected: false,
      data: { ...n.data },
    }));
    setNodes(nds => [...nds, ...newNodes]);
    toast.success(`${newNodes.length} nó(s) duplicado(s)`);
  }, [nodes, setNodes, readOnly, pushHistory]);

  const selectAll = useCallback(() => {
    setNodes(nds => nds.map(n => ({ ...n, selected: true })));
    setEdges(eds => eds.map(e => ({ ...e, selected: true })));
  }, [setNodes, setEdges]);

  const handleSave = useCallback(async () => {
    if (readOnly) return;
    skipRealtimeRef.current = true;
    await onSave(nodes, edges, getViewport());
    setHasChanges(false);
  }, [nodes, edges, getViewport, onSave, readOnly]);

  const handleUndo = useCallback(() => {
    const snapshot = history.undo(nodes, edges);
    if (snapshot) { setNodes(snapshot.nodes); setEdges(snapshot.edges); setUndoKey(k => k + 1); }
  }, [nodes, edges, history, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    const snapshot = history.redo(nodes, edges);
    if (snapshot) { setNodes(snapshot.nodes); setEdges(snapshot.edges); setUndoKey(k => k + 1); }
  }, [nodes, edges, history, setNodes, setEdges]);

  const handleExport = useCallback(() => {
    const el = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!el) return;
    import('html-to-image').then(({ toPng }) => {
      toPng(el, { backgroundColor: '#0f172a' }).then(dataUrl => {
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
    onNodesChange(changes);
  }, [onNodesChange, pushHistory]);

  // Double click → open quick node menu
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

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative">
      {!readOnly && showPalette && <NodePalette onDragStart={handleDragStart} onClose={() => setShowPalette(false)} />}
      {!readOnly && !showPalette && (
        <div className="absolute left-3 top-3 z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-9 w-9 rounded-xl shadow-xl bg-card/95 backdrop-blur-md border border-border hover:bg-accent"
                onClick={() => setShowPalette(true)}
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Mostrar paleta</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Quick node menu on double-click */}
      {quickMenu && (
        <QuickNodeMenu
          position={quickMenu.screen}
          onSelect={handleQuickNodeSelect}
          onClose={() => setQuickMenu(null)}
        />
      )}

      <CanvasContextMenu
        onAddNode={(type, pos) => createNode(type, screenToFlowPosition(pos))}
        onDeleteSelected={deleteSelected}
        onDuplicate={duplicateSelected}
        onSelectAll={selectAll}
        position={contextMenuPos}
      >
        <div className="w-full h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypeMap}
            edgeTypes={edgeTypeMap}
            onNodesChange={readOnly ? undefined : onNodesChangeWrapped}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={onConnect}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
            connectionLineStyle={{ stroke: edgeColor, strokeWidth: 2 }}
            defaultEdgeOptions={{
              type: 'custom',
              data: { edgeStyle, animated: true, color: edgeColor } satisfies CustomEdgeData,
              markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor, width: 16, height: 16 },
            }}
            className="canvas-flow"
            onContextMenu={(e) => {
              contextMenuPos.current = { x: e.clientX, y: e.clientY };
            }}
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

            {/* Presence */}
            <Panel position="top-right" className="mt-2 mr-2">
              <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl px-3 py-1.5 shadow-xl">
                <CanvasPresence boardId={boardId} />
              </div>
            </Panel>

            {/* Toolbar */}
            <Panel position="bottom-center" className="mb-2">
              <CanvasToolbar
                saving={saving}
                readOnly={readOnly}
                hasChanges={hasChanges}
                edgeStyle={edgeStyle}
                onEdgeStyleChange={setEdgeStyle}
                onSave={handleSave}
                onDelete={deleteSelected}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={history.canUndo()}
                canRedo={history.canRedo()}
                onExport={handleExport}
                showPalette={showPalette}
                onTogglePalette={() => setShowPalette(p => !p)}
                isFullscreen={isFullscreen}
                onToggleFullscreen={onToggleFullscreen}
              />
            </Panel>

            <Panel position="bottom-left" className="mb-2 ml-2">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 bg-card/70 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-border/50">
                <Sparkles className="h-3 w-3" />
                {readOnly ? 'Somente leitura' : (
                  <span>
                    <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">2×clique</kbd> novo bloco
                    {' • '}
                    <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">Del</kbd> excluir
                    {' • '}
                    <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">Ctrl+D</kbd> duplicar
                  </span>
                )}
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </CanvasContextMenu>
    </div>
  );
}

export default function CanvasBoard(props: CanvasBoardProps) {
  return (
    <ReactFlowProvider>
      <CanvasBoardInner {...props} />
    </ReactFlowProvider>
  );
}

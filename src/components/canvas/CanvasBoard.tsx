import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toast } from 'sonner';
import CanvasNode, { getPreset, type CanvasNodeData } from './CanvasNode';
import CustomEdge, { type CustomEdgeData, type EdgeStyle } from './CustomEdge';
import NodePalette from './NodePalette';
import CanvasToolbar from './CanvasToolbar';
import CanvasContextMenu from './CanvasContextMenu';
import QuickNodeMenu from './QuickNodeMenu';
import EdgeSettingsPanel from './EdgeSettingsPanel';
import CanvasCursors from './CanvasCursors';
import CanvasPresenceBar from './CanvasPresenceBar';
import CanvasInspector from './CanvasInspector';
import { useCanvasHistory } from '@/hooks/useCanvasHistory';
import { useCanvasRealtime, type CanvasSnapshot } from '@/hooks/useCanvasRealtime';
import { useAuth } from '@/contexts/AuthContext';
import { PanelLeftOpen, PlusCircle, Settings2, Shapes, Sparkles, Workflow } from 'lucide-react';
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

let nodeCounter = 0;
const nextNodeId = () => `node_${Date.now()}_${nodeCounter++}`;

const createEdgeMarker = (color: string) => ({
  type: MarkerType.ArrowClosed,
  color,
  width: 16,
  height: 16,
});

function BoardInner({
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
  const nodeTypes = useMemo(() => ({ canvasNode: CanvasNode }), []);
  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [edgeStyle, setEdgeStyle] = useState<EdgeStyle>('bezier');
  const [showPalette, setShowPalette] = useState(true);
  const [showInspector, setShowInspector] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<{ id: string; position: { x: number; y: number } } | null>(null);
  const [quickMenu, setQuickMenu] = useState<{ screen: { x: number; y: number }; flow: { x: number; y: number } } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const contextMenuPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyingRemoteRef = useRef(false);
  const lastRemoteUpdatedAtRef = useRef<string | null>(null);
  const lastLocalSavedAtRef = useRef<string | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const { screenToFlowPosition, getViewport, flowToScreenPosition, setViewport } = useReactFlow();
  const { user } = useAuth();
  const history = useCanvasHistory();
  const [, setHistoryTick] = useState(0);
  const userName = user?.user_metadata?.name || user?.email || 'Usuário';

  const edgeColor = useMemo(() => {
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    return colors[edges.length % colors.length];
  }, [edges.length]);

  const realtime = useCanvasRealtime({
    boardId,
    userId: user?.id || '',
    userName,
    userAvatar: user?.user_metadata?.avatar_url,
    enabled: !!user && !!boardId,
    onRemoteSnapshot: (snapshot) => {
      if (!snapshot?.updatedAt) return;
      if (lastLocalSavedAtRef.current && snapshot.updatedAt <= lastLocalSavedAtRef.current) return;
      if (lastRemoteUpdatedAtRef.current && snapshot.updatedAt <= lastRemoteUpdatedAtRef.current) return;

      lastRemoteUpdatedAtRef.current = snapshot.updatedAt;
      applyingRemoteRef.current = true;
      setNodes(snapshot.nodes || []);
      setEdges(snapshot.edges || []);
      setHasChanges(false);
      setTimeout(() => {
        applyingRemoteRef.current = false;
      }, 80);
    },
  });

  const broadcastSnapshotNow = useCallback((updatedAt?: string) => {
    const snapshot: CanvasSnapshot = {
      nodes: nodesRef.current,
      edges: edgesRef.current,
      updatedAt: updatedAt || new Date().toISOString(),
    };
    realtime.broadcastSnapshot(snapshot);
  }, [realtime]);

  useEffect(() => {
    if (initialViewport) {
      setViewport(initialViewport, { duration: 0 });
    }
  }, [initialViewport, setViewport]);

  useEffect(() => {
    const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
    realtime.broadcastSelection(selectedIds);
    setSelectedNodeId(selectedIds.length === 1 ? selectedIds[0] : null);
  }, [nodes, realtime]);

  useEffect(() => {
    if (applyingRemoteRef.current || readOnly) return;
    setHasChanges(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      const updatedAt = new Date().toISOString();
      lastLocalSavedAtRef.current = updatedAt;
      await onSave(nodesRef.current, edgesRef.current, getViewport());
      broadcastSnapshotNow(updatedAt);
      setHasChanges(false);
    }, 900);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [nodes, edges, readOnly, getViewport, onSave, broadcastSnapshotNow]);

  const pushHistory = useCallback(() => {
    history.push(nodesRef.current, edgesRef.current);
    setHistoryTick((v) => v + 1);
  }, [history]);

  const createNode = useCallback((type: string, position: { x: number; y: number }) => {
    if (readOnly) return;
    pushHistory();
    const preset = getPreset(type);
    const newNode: Node = {
      id: nextNodeId(),
      type: 'canvasNode',
      position,
      data: {
        label: `${preset.label} ${nodesRef.current.length + 1}`,
        nodeType: type,
      } satisfies CanvasNodeData,
    };
    setNodes((prev) => [...prev, newNode]);
  }, [pushHistory, readOnly, setNodes]);

  const createNodeAtCenter = useCallback((type: string) => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const flowPoint = screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    createNode(type, flowPoint);
  }, [createNode, screenToFlowPosition]);

  const onConnect: OnConnect = useCallback((params: Connection) => {
    if (readOnly) return;
    pushHistory();
    const edgeId = `edge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const edgeToAdd: Edge = {
      id: edgeId,
      ...params,
      type: 'custom',
      data: { edgeStyle, animated: true, color: edgeColor } satisfies CustomEdgeData,
      markerEnd: createEdgeMarker(edgeColor),
    };
    setEdges((prev) => addEdge(edgeToAdd, prev));
  }, [edgeColor, edgeStyle, pushHistory, readOnly, setEdges]);

  const onNodeDragStop = useCallback(() => {
    if (!readOnly) pushHistory();
  }, [pushHistory, readOnly]);

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
  }, [createNode, readOnly, screenToFlowPosition]);

  const onPaletteDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const deleteSelected = useCallback(() => {
    if (readOnly) return;
    const selectedNodeIds = new Set(nodesRef.current.filter((n) => n.selected).map((n) => n.id));
    const selectedEdgeIds = new Set(edgesRef.current.filter((e) => e.selected).map((e) => e.id));
    if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) return;
    pushHistory();
    setNodes((prev) => prev.filter((node) => !selectedNodeIds.has(node.id)));
    setEdges((prev) => prev.filter((edge) => !selectedEdgeIds.has(edge.id) && !selectedNodeIds.has(edge.source) && !selectedNodeIds.has(edge.target)));
  }, [pushHistory, readOnly, setEdges, setNodes]);

  const duplicateSelected = useCallback(() => {
    if (readOnly) return;
    const selectedNodes = nodesRef.current.filter((n) => n.selected);
    if (selectedNodes.length === 0) return;
    pushHistory();
    setNodes((prev) => [
      ...prev,
      ...selectedNodes.map((node) => ({
        ...node,
        id: nextNodeId(),
        selected: false,
        position: { x: node.position.x + 36, y: node.position.y + 36 },
        data: { ...node.data },
      })),
    ]);
  }, [pushHistory, readOnly, setNodes]);

  const selectAll = useCallback(() => {
    setNodes((prev) => prev.map((node) => ({ ...node, selected: true })));
    setEdges((prev) => prev.map((edge) => ({ ...edge, selected: true })));
  }, [setEdges, setNodes]);

  const handleUndo = useCallback(() => {
    const snapshot = history.undo(nodesRef.current, edgesRef.current);
    if (!snapshot) return;
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
    setHistoryTick((v) => v + 1);
  }, [history, setEdges, setNodes]);

  const handleRedo = useCallback(() => {
    const snapshot = history.redo(nodesRef.current, edgesRef.current);
    if (!snapshot) return;
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
    setHistoryTick((v) => v + 1);
  }, [history, setEdges, setNodes]);

  const handleExport = useCallback(() => {
    const el = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!el) return;
    import('html-to-image').then(({ toPng }) => {
      toPng(el, { backgroundColor: '#0f172a' })
        .then((dataUrl) => {
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `${boardName || 'canvas'}.png`;
          a.click();
          toast.success('Canvas exportado!');
        })
        .catch(() => toast.error('Erro ao exportar'));
    });
  }, [boardName]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const flowPos = screenToFlowPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    realtime.broadcastCursor(flowPos.x, flowPos.y);
  }, [realtime, screenToFlowPosition]);

  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    if (readOnly) return;
    const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setQuickMenu({ screen: { x: event.clientX, y: event.clientY }, flow: flowPos });
  }, [readOnly, screenToFlowPosition]);

  const remoteSelections = useMemo(() => {
    const map = new Map<string, { color: string; name: string }>();
    realtime.remoteUsers.forEach((user) => {
      user.selectedIds?.forEach((id) => {
        if (!map.has(id)) map.set(id, { color: user.color, name: user.name });
      });
    });
    return map;
  }, [realtime.remoteUsers]);

  const renderedNodes = useMemo(() => {
    return nodes.map((node) => {
      const remote = remoteSelections.get(node.id);
      if (!remote) return node;
      return {
        ...node,
        style: {
          ...node.style,
          outline: `2px solid ${remote.color}`,
          outlineOffset: '3px',
          borderRadius: '16px',
        },
      };
    });
  }, [nodes, remoteSelections]);

  const isEmpty = nodes.length === 0 && edges.length === 0;
  const boardModeLabel = readOnly ? 'Visualização' : 'Edição colaborativa';
  const collaboratorsCount = realtime.remoteUsers.length + 1;

  return (
    <div ref={wrapperRef} className="w-full h-full relative" onMouseMove={handleMouseMove}>
      {!readOnly && showPalette && <NodePalette onDragStart={onPaletteDragStart} onClose={() => setShowPalette(false)} />}
      {!readOnly && !showPalette && (
        <div className="absolute left-3 top-3 z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="icon" className="h-9 w-9 rounded-xl shadow-xl bg-card/95 backdrop-blur-md border border-border hover:bg-accent" onClick={() => setShowPalette(true)}>
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Mostrar paleta</TooltipContent>
          </Tooltip>
        </div>
      )}

      <div className="absolute left-3 top-3 z-20 flex flex-wrap items-center gap-2 max-w-[calc(100%-1.5rem)] pr-4">
        <div className="rounded-2xl border border-border/70 bg-card/95 px-3 py-2 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Workflow className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Canvas Board</span>
          </div>
          <p className="mt-1 text-sm font-semibold truncate max-w-[260px]">{boardName}</p>
        </div>
        <Badge variant="outline" className="rounded-full bg-card/90 backdrop-blur-md shadow-md px-3 py-1 text-[10px] gap-1.5">
          <Shapes className="h-3.5 w-3.5" /> {nodes.length} nós • {edges.length} conexões
        </Badge>
        <Badge variant="outline" className="rounded-full bg-card/90 backdrop-blur-md shadow-md px-3 py-1 text-[10px] gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> {collaboratorsCount} pessoa{collaboratorsCount > 1 ? 's' : ''}
        </Badge>
        <Badge variant={readOnly ? 'secondary' : 'default'} className="rounded-full px-3 py-1 text-[10px]">
          {boardModeLabel}
        </Badge>
      </div>

      {showInspector && (
        <CanvasInspector
          selectedNodeId={selectedNodeId}
          onClose={() => setShowInspector(false)}
          readOnly={readOnly}
        />
      )}

      {quickMenu && (
        <QuickNodeMenu
          position={quickMenu.screen}
          onSelect={(type) => {
            createNode(type, quickMenu.flow);
            setQuickMenu(null);
          }}
          onClose={() => setQuickMenu(null)}
        />
      )}

      <CanvasCursors remoteUsers={realtime.remoteUsers} />

      {isEmpty && !readOnly && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none px-6">
          <div className="pointer-events-auto max-w-xl rounded-3xl border border-border/70 bg-card/95 p-6 shadow-2xl backdrop-blur-md text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Workflow className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Seu canvas está pronto para ganhar forma</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Arraste blocos da paleta, dê 2 cliques no quadro para criar rapidamente ou use os atalhos da barra inferior para começar com ideias, tarefas e alertas.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Button className="rounded-xl gap-1.5" onClick={() => createNodeAtCenter('idea')}>
                <PlusCircle className="h-4 w-4" /> Adicionar ideia
              </Button>
              <Button variant="outline" className="rounded-xl gap-1.5" onClick={() => createNodeAtCenter('task')}>
                <PlusCircle className="h-4 w-4" /> Adicionar tarefa
              </Button>
            </div>
          </div>
        </div>
      )}

      <CanvasContextMenu onAddNode={(type, pos) => createNode(type, screenToFlowPosition(pos))} onDeleteSelected={deleteSelected} onDuplicate={duplicateSelected} onSelectAll={selectAll} position={contextMenuPos}>
        <div className="w-full h-full">
          <ReactFlow
            nodes={renderedNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={readOnly ? undefined : onNodesChange}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onEdgeClick={readOnly ? undefined : (event, edge) => setSelectedEdge({ id: edge.id, position: { x: event.clientX, y: event.clientY - 180 } })}
            onPaneClick={() => setSelectedEdge(null)}
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
              markerEnd: createEdgeMarker(edgeColor),
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
                const data = node.data as CanvasNodeData;
                return (data?.color as string) || getPreset(data?.nodeType || 'idea').color;
              }}
              maskColor="rgba(0,0,0,0.4)"
              pannable
              zoomable
            />
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="hsl(var(--muted-foreground) / 0.08)" />

            <Panel position="top-right" className="mt-2 mr-2">
              <div className="flex items-center gap-2">
                <CanvasPresenceBar
                  remoteUsers={realtime.remoteUsers}
                  currentUserName={userName}
                  connectionState={realtime.connectionState}
                  queuedOpsCount={hasChanges ? 1 : 0}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant={showInspector ? 'default' : 'secondary'} size="icon" className="h-8 w-8 rounded-xl shadow-xl" onClick={() => setShowInspector((prev) => !prev)}>
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
                onTogglePalette={() => setShowPalette((prev) => !prev)}
                isFullscreen={isFullscreen}
                onToggleFullscreen={onToggleFullscreen}
                onQuickAdd={createNodeAtCenter}
              />
            </Panel>

            <Panel position="bottom-left" className="mb-2 ml-2">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 bg-card/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-border/50 shadow-sm">
                <Sparkles className="h-3 w-3" />
                {readOnly ? 'Somente leitura' : <span><kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">2×clique</kbd> novo bloco {' • '}<kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">Del</kbd> excluir {' • '}<kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">Ctrl+D</kbd> duplicar</span>}
              </div>
            </Panel>

            {Array.from(remoteSelections.entries()).map(([nodeId, { color, name }]) => {
              const node = nodes.find((item) => item.id === nodeId);
              if (!node) return null;
              const screen = flowToScreenPosition(node.position);
              return (
                <div key={`sel-${nodeId}`} className="absolute pointer-events-none z-40" style={{ left: screen.x, top: screen.y - 20, transform: 'translateX(-50%)' }}>
                  <div className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-white whitespace-nowrap" style={{ backgroundColor: color }}>
                    {name}
                  </div>
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
  return (
    <ReactFlowProvider>
      <BoardInner {...props} />
    </ReactFlowProvider>
  );
}

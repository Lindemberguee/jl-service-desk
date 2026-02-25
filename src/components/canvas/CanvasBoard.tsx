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
import { Button } from '@/components/ui/button';
import {
  Save, Trash2, Loader2, ZoomIn, ZoomOut, Maximize, MousePointer2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import CanvasNode, { getPreset, type CanvasNodeData } from './CanvasNode';
import NodePalette from './NodePalette';
import CanvasPresence from './CanvasPresence';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CanvasBoardProps {
  boardId: string;
  boardName: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  initialViewport?: { x: number; y: number; zoom: number };
  onSave: (nodes: Node[], edges: Edge[], viewport: { x: number; y: number; zoom: number }) => Promise<void>;
  saving: boolean;
  readOnly?: boolean;
}

let nodeId = 0;
const getNodeId = () => `node_${Date.now()}_${nodeId++}`;

function CanvasBoardInner({ boardId, boardName, initialNodes, initialEdges, initialViewport, onSave, saving, readOnly = false }: CanvasBoardProps) {
  const nodeTypeMap = useMemo(() => ({ canvasNode: CanvasNode }), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [hasChanges, setHasChanges] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, getViewport, zoomIn, zoomOut, fitView } = useReactFlow();
  const { user, currentTenantId } = useAuth();
  const skipRealtimeRef = useRef(false);

  // Track changes
  useEffect(() => { setHasChanges(true); }, [nodes, edges]);

  // Realtime sync: listen for updates from other users
  useEffect(() => {
    if (!currentTenantId) return;

    const channel = supabase
      .channel(`canvas-board-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvas_boards',
          filter: `id=eq.${boardId}`,
        },
        (payload) => {
          if (skipRealtimeRef.current) {
            skipRealtimeRef.current = false;
            return;
          }
          const updated = payload.new as any;
          // Only apply if from another user
          if (updated.user_id === user?.id && !readOnly) {
            // Could be the same user from another tab - still apply
          }
          setNodes(updated.nodes as Node[]);
          setEdges(updated.edges as Edge[]);
          setHasChanges(false);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [boardId, currentTenantId, user?.id, readOnly, setNodes, setEdges]);

  // Auto-save every 30s for editable boards
  useEffect(() => {
    if (!hasChanges || readOnly) return;
    const timer = setTimeout(async () => {
      skipRealtimeRef.current = true;
      const viewport = getViewport();
      await onSave(nodes, edges, viewport);
      setHasChanges(false);
    }, 30000);
    return () => clearTimeout(timer);
  }, [nodes, edges, hasChanges, getViewport, onSave, readOnly]);

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      if (readOnly) return;
      setEdges((eds) => addEdge({
        ...params,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 16, height: 16 },
      }, eds));
    },
    [setEdges, readOnly]
  );

  const createNode = useCallback((type: string, position: { x: number; y: number }) => {
    if (readOnly) return;
    const preset = getPreset(type);
    const newNode: Node = {
      id: getNodeId(),
      type: 'canvasNode',
      data: { label: `${preset.label} ${nodes.length + 1}`, nodeType: type } satisfies CanvasNodeData,
      position,
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes.length, setNodes, readOnly]);

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
    if (sn === 0 && se === 0) { toast.info('Selecione elementos para excluir'); return; }
    setNodes(nds => nds.filter(n => !n.selected));
    setEdges(eds => eds.filter(e => !e.selected));
    toast.success(`${sn + se} elemento(s) excluído(s)`);
  }, [nodes, edges, setNodes, setEdges, readOnly]);

  const handleSave = useCallback(async () => {
    if (readOnly) return;
    skipRealtimeRef.current = true;
    const viewport = getViewport();
    await onSave(nodes, edges, viewport);
    setHasChanges(false);
  }, [nodes, edges, getViewport, onSave, readOnly]);

  const Btn = ({ icon: Icon, label, onClick, className = '' }: any) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={onClick} className={`h-8 w-8 ${className}`}>
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative">
      {!readOnly && <NodePalette onDragStart={handleDragStart} />}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypeMap}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 16, height: 16 },
        }}
        className="canvas-flow"
        onDoubleClick={readOnly ? undefined : (event) => {
          const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
          createNode('idea', position);
        }}
      >
        <MiniMap
          className="!bg-card/90 !border-border !rounded-xl !shadow-xl !backdrop-blur-sm"
          nodeColor={(node) => {
            const nd = node.data as CanvasNodeData;
            return getPreset(nd?.nodeType || 'idea').color;
          }}
          maskColor="rgba(0,0,0,0.4)"
          pannable
          zoomable
        />
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="hsl(var(--muted-foreground) / 0.1)" />

        {/* Presence indicators */}
        <Panel position="top-right" className="mt-2 mr-2">
          <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl px-3 py-1.5 shadow-xl">
            <CanvasPresence boardId={boardId} />
          </div>
        </Panel>

        <Panel position="bottom-center" className="flex items-center gap-1 bg-card/95 backdrop-blur-md border border-border rounded-xl px-3 py-1.5 shadow-xl mb-2">
          <Btn icon={ZoomOut} label="Diminuir zoom" onClick={() => zoomOut()} />
          <Btn icon={ZoomIn} label="Aumentar zoom" onClick={() => zoomIn()} />
          <Btn icon={Maximize} label="Ajustar à tela" onClick={() => fitView({ padding: 0.2 })} />

          {!readOnly && (
            <>
              <Separator orientation="vertical" className="h-5 mx-1.5" />
              <Btn icon={Trash2} label="Excluir selecionados (Del)" onClick={deleteSelected} className="text-destructive hover:text-destructive" />
              <Separator orientation="vertical" className="h-5 mx-1.5" />
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground border-amber-500/30 bg-amber-500/10">
                    Alterado
                  </Badge>
                )}
                <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs gap-1.5 px-3 rounded-lg">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Salvar
                </Button>
              </div>
            </>
          )}
        </Panel>

        <Panel position="bottom-left" className="mb-2 ml-2">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 bg-card/60 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-border/50">
            <MousePointer2 className="h-3 w-3" />
            {readOnly ? 'Modo visualização • Somente leitura' : 'Duplo clique para criar • Arraste da paleta'}
          </div>
        </Panel>
      </ReactFlow>
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

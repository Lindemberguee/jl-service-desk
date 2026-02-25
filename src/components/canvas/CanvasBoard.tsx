import { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Controls,
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus, Save, Trash2, StickyNote, FileText, Loader2,
  Lightbulb, GitBranch, CheckSquare, Undo2, Redo2,
  ZoomIn, ZoomOut, Maximize,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

interface CanvasBoardProps {
  boardId: string;
  boardName: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  initialViewport?: { x: number; y: number; zoom: number };
  onSave: (nodes: Node[], edges: Edge[], viewport: { x: number; y: number; zoom: number }) => Promise<void>;
  saving: boolean;
}

const nodeTypes = [
  { type: 'idea', label: 'Ideia', icon: Lightbulb, bg: 'hsl(213 94% 20%)', border: 'hsl(213 94% 55%)', accent: '#3b82f6' },
  { type: 'note', label: 'Nota', icon: StickyNote, bg: 'hsl(38 50% 15%)', border: 'hsl(38 92% 50%)', accent: '#f59e0b' },
  { type: 'document', label: 'Documento', icon: FileText, bg: 'hsl(199 50% 15%)', border: 'hsl(199 89% 48%)', accent: '#06b6d4' },
  { type: 'process', label: 'Processo', icon: GitBranch, bg: 'hsl(142 40% 14%)', border: 'hsl(142 71% 38%)', accent: '#22c55e' },
  { type: 'task', label: 'Tarefa', icon: CheckSquare, bg: 'hsl(262 40% 18%)', border: 'hsl(262 60% 50%)', accent: '#8b5cf6' },
] as const;

let nodeId = 0;
const getNodeId = () => `node_${Date.now()}_${nodeId++}`;

function CanvasBoardInner({ boardId, boardName, initialNodes, initialEdges, initialViewport, onSave, saving }: CanvasBoardProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, getViewport, zoomIn, zoomOut, fitView } = useReactFlow();

  const onConnect: OnConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      animated: true,
      style: { stroke: 'hsl(213 94% 55%)', strokeWidth: 2 },
    }, eds)),
    [setEdges]
  );

  const addNode = useCallback((typeKey: string = 'idea') => {
    const label = newNodeLabel.trim() || `Nó ${nodes.length + 1}`;
    const nodeType = nodeTypes.find(t => t.type === typeKey) || nodeTypes[0];

    const newNode: Node = {
      id: getNodeId(),
      data: { label },
      position: {
        x: 250 + Math.random() * 300,
        y: 150 + Math.random() * 200,
      },
      style: {
        background: nodeType.bg,
        color: '#e2e8f0',
        border: `2px solid ${nodeType.border}`,
        borderRadius: '10px',
        padding: '12px 20px',
        fontSize: '13px',
        fontWeight: 500,
        minWidth: '130px',
        boxShadow: `0 4px 24px ${nodeType.accent}22, 0 1px 3px rgba(0,0,0,0.3)`,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setNewNodeLabel('');
  }, [newNodeLabel, nodes.length, setNodes]);

  const deleteSelected = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    const selectedEdges = edges.filter(e => e.selected);
    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      toast.info('Selecione elementos para excluir');
      return;
    }
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
    toast.success(`${selectedNodes.length + selectedEdges.length} elemento(s) excluído(s)`);
  }, [nodes, edges, setNodes, setEdges]);

  const handleSave = useCallback(async () => {
    const viewport = getViewport();
    await onSave(nodes, edges, viewport);
  }, [nodes, edges, getViewport, onSave]);

  const ToolbarButton = ({ icon: Icon, label, onClick, variant = 'ghost', className = '' }: any) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={variant} size="icon" onClick={onClick} className={`h-8 w-8 ${className}`}>
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        className="canvas-flow"
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: 'hsl(213 94% 55%)', strokeWidth: 2 },
        }}
      >
        <Controls
          showInteractive={false}
          className="!hidden"
        />
        <MiniMap
          className="!bg-sidebar/90 !border-border !rounded-lg !shadow-xl !backdrop-blur-sm"
          nodeColor="#3b82f6"
          maskColor="rgba(0,0,0,0.5)"
          pannable
          zoomable
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="hsl(var(--muted-foreground) / 0.12)"
        />

        {/* Top Toolbar */}
        <Panel position="top-left" className="flex items-center gap-1 bg-card/95 backdrop-blur-sm border border-border rounded-lg px-2 py-1.5 shadow-lg">
          {/* Add node input */}
          <Input
            value={newNodeLabel}
            onChange={(e) => setNewNodeLabel(e.target.value)}
            placeholder="Novo nó..."
            className="w-36 h-7 text-xs bg-background border-border"
            onKeyDown={(e) => e.key === 'Enter' && addNode('idea')}
          />

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Node type buttons */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2">
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              {nodeTypes.map(nt => {
                const Icon = nt.icon;
                return (
                  <DropdownMenuItem key={nt.type} onClick={() => addNode(nt.type)} className="gap-2 text-xs">
                    <Icon className="h-3.5 w-3.5" style={{ color: nt.accent }} />
                    {nt.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Zoom controls */}
          <ToolbarButton icon={ZoomOut} label="Diminuir zoom" onClick={() => zoomOut()} />
          <ToolbarButton icon={ZoomIn} label="Aumentar zoom" onClick={() => zoomIn()} />
          <ToolbarButton icon={Maximize} label="Ajustar à tela" onClick={() => fitView({ padding: 0.2 })} />
        </Panel>

        {/* Right toolbar */}
        <Panel position="top-right" className="flex items-center gap-1 bg-card/95 backdrop-blur-sm border border-border rounded-lg px-2 py-1.5 shadow-lg">
          <ToolbarButton
            icon={Trash2}
            label="Excluir selecionados"
            onClick={deleteSelected}
            className="text-destructive hover:text-destructive"
          />
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-7 text-xs gap-1 px-3"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar
          </Button>
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

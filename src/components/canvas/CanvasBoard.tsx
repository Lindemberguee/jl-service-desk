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
import { Plus, Save, Trash2, Type, StickyNote, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CanvasBoardProps {
  boardId: string;
  boardName: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  initialViewport?: { x: number; y: number; zoom: number };
  onSave: (nodes: Node[], edges: Edge[], viewport: { x: number; y: number; zoom: number }) => Promise<void>;
  saving: boolean;
}

const nodeColors: Record<string, string> = {
  default: 'hsl(var(--primary))',
  note: 'hsl(var(--accent))',
  document: 'hsl(var(--secondary))',
};

let nodeId = 0;
const getNodeId = () => `node_${Date.now()}_${nodeId++}`;

function CanvasBoardInner({ boardId, boardName, initialNodes, initialEdges, initialViewport, onSave, saving }: CanvasBoardProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, getViewport } = useReactFlow();

  const onConnect: OnConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'hsl(var(--primary))' } }, eds)),
    [setEdges]
  );

  const addNode = useCallback((type: string = 'default') => {
    const label = newNodeLabel.trim() || `Nó ${nodes.length + 1}`;
    const colors = {
      default: { bg: '#1e293b', border: '#3b82f6' },
      note: { bg: '#1c1917', border: '#f59e0b' },
      document: { bg: '#172554', border: '#06b6d4' },
    };
    const c = colors[type as keyof typeof colors] || colors.default;

    const newNode: Node = {
      id: getNodeId(),
      data: { label },
      position: {
        x: 250 + Math.random() * 300,
        y: 150 + Math.random() * 200,
      },
      style: {
        background: c.bg,
        color: '#e2e8f0',
        border: `2px solid ${c.border}`,
        borderRadius: '8px',
        padding: '12px 20px',
        fontSize: '13px',
        fontWeight: 500,
        minWidth: '120px',
        boxShadow: `0 4px 20px ${c.border}33`,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setNewNodeLabel('');
  }, [newNodeLabel, nodes.length, setNodes]);

  const deleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
  }, [setNodes, setEdges]);

  const handleSave = useCallback(async () => {
    const viewport = getViewport();
    await onSave(nodes, edges, viewport);
  }, [nodes, edges, getViewport, onSave]);

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
        defaultEdgeOptions={{ animated: true, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } }}
      >
        <Controls className="!bg-sidebar !border-border !rounded-lg !shadow-lg [&_button]:!bg-sidebar [&_button]:!border-border [&_button]:!text-foreground [&_button:hover]:!bg-accent" />
        <MiniMap
          className="!bg-sidebar !border-border !rounded-lg !shadow-lg"
          nodeColor="#3b82f6"
          maskColor="rgba(0,0,0,0.5)"
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground) / 0.15)" />

        <Panel position="top-left" className="flex items-center gap-2 flex-wrap">
          <Input
            value={newNodeLabel}
            onChange={(e) => setNewNodeLabel(e.target.value)}
            placeholder="Nome do nó..."
            className="w-44 h-8 text-xs bg-sidebar border-border"
            onKeyDown={(e) => e.key === 'Enter' && addNode('default')}
          />
          <Button size="sm" variant="outline" onClick={() => addNode('default')} className="h-8 text-xs gap-1 bg-sidebar">
            <Plus className="h-3.5 w-3.5" /> Ideia
          </Button>
          <Button size="sm" variant="outline" onClick={() => addNode('note')} className="h-8 text-xs gap-1 bg-sidebar">
            <StickyNote className="h-3.5 w-3.5" /> Nota
          </Button>
          <Button size="sm" variant="outline" onClick={() => addNode('document')} className="h-8 text-xs gap-1 bg-sidebar">
            <FileText className="h-3.5 w-3.5" /> Doc
          </Button>
        </Panel>

        <Panel position="top-right" className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={deleteSelected} className="h-8 text-xs gap-1 bg-sidebar text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 text-xs gap-1">
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

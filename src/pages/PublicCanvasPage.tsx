import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Loader2, Eye, Workflow } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const POLL_INTERVAL = 5000; // poll every 5s for updates

export default function PublicCanvasPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [boardName, setBoardName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');

  const fetchBoard = useCallback(async (isInitial = false) => {
    if (!token) return;
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/public-canvas?token=${encodeURIComponent(token)}`,
        { headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao carregar');
      }

      const board = await resp.json();
      setNodes(board.nodes || []);
      setEdges(board.edges || []);
      setViewport(board.viewport || { x: 0, y: 0, zoom: 1 });
      setBoardName(board.name);
      setLastUpdate(board.updated_at);
      if (isInitial) setLoading(false);
    } catch (err: any) {
      if (isInitial) {
        setError(err.message || 'Canvas não encontrado');
        setLoading(false);
      }
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    fetchBoard(true);
  }, [fetchBoard]);

  // Polling for live updates
  useEffect(() => {
    if (!token || error) return;
    const interval = setInterval(() => fetchBoard(false), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [token, error, fetchBoard]);

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-3">
          <Workflow className="h-12 w-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold">Link inválido</h1>
          <p className="text-sm text-muted-foreground">Nenhum token de compartilhamento fornecido.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-3">
          <Workflow className="h-12 w-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold">Canvas não encontrado</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card shrink-0">
        <Workflow className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm truncate">{boardName}</span>
        <Badge variant="secondary" className="text-[10px] gap-1">
          <Eye className="h-3 w-3" /> Somente visualização
        </Badge>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Atualização automática a cada 5s
        </span>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          defaultViewport={viewport}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={true}
          zoomOnScroll={true}
          fitView={nodes.length > 0}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls showInteractive={false} />
          <MiniMap
            nodeStrokeWidth={3}
            className="!bg-card !border-border"
            maskColor="rgba(0,0,0,0.15)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit3, LayoutGrid, Loader2, ArrowLeft, Workflow } from 'lucide-react';
import { useCanvasBoards } from '@/hooks/useCanvasBoards';
import CanvasBoard from '@/components/canvas/CanvasBoard';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function CanvasPage() {
  const { boards, loading, saving, createBoard, saveBoard, deleteBoard, renameBoard } = useCanvasBoards();
  const [activeBoard, setActiveBoard] = useState<string | null>(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const navigate = useNavigate();

  const board = boards.find(b => b.id === activeBoard);

  const handleCreate = async () => {
    const name = newBoardName.trim() || 'Novo Canvas';
    const result = await createBoard(name);
    if (result) {
      setActiveBoard(result.id);
      setNewBoardName('');
    }
  };

  const handleRename = async (id: string) => {
    if (editName.trim()) {
      await renameBoard(id, editName.trim());
      setEditingId(null);
    }
  };

  // Active canvas view
  if (board) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-3 px-1 pb-3 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setActiveBoard(null)} className="text-xs gap-1">
            <LayoutGrid className="h-3.5 w-3.5" /> Voltar
          </Button>
          <span className="text-sm font-semibold truncate">{board.name}</span>
        </div>
        <div className="flex-1 rounded-lg border border-border overflow-hidden bg-sidebar">
          <CanvasBoard
            boardId={board.id}
            boardName={board.name}
            initialNodes={board.nodes}
            initialEdges={board.edges}
            initialViewport={board.viewport}
            onSave={(nodes, edges, viewport) => saveBoard(board.id, nodes, edges, viewport)}
            saving={saving}
          />
        </div>
      </div>
    );
  }

  // Board listing view
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/ferramentas')} className="gap-1 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> Ferramentas
        </Button>
      </div>

      <div>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" /> Canvas
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Crie quadros visuais com nós e conexões para mapas mentais e fluxogramas.</p>
      </div>

      {/* Create new */}
      <div className="flex items-center gap-2">
        <Input
          value={newBoardName}
          onChange={e => setNewBoardName(e.target.value)}
          placeholder="Nome do canvas..."
          className="max-w-xs h-9 text-sm"
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
        <Button size="sm" onClick={handleCreate} className="gap-1">
          <Plus className="h-4 w-4" /> Criar Canvas
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : boards.length === 0 ? (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Workflow className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-base font-semibold mb-1">Nenhum canvas ainda</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Crie seu primeiro canvas para organizar ideias, processos e documentos visualmente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {boards.map(b => (
            <Card
              key={b.id}
              className="cursor-pointer hover:border-primary/50 transition-colors group"
              onClick={() => setActiveBoard(b.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  {editingId === b.id ? (
                    <Input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={() => handleRename(b.id)}
                      onKeyDown={e => e.key === 'Enter' && handleRename(b.id)}
                      onClick={e => e.stopPropagation()}
                      className="h-7 text-sm w-40"
                    />
                  ) : (
                    <h3 className="font-medium text-sm truncate">{b.name}</h3>
                  )}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6"
                      onClick={e => { e.stopPropagation(); setEditingId(b.id); setEditName(b.name); }}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={e => e.stopPropagation()}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={e => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir canvas?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteBoard(b.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{b.nodes.length} nós</span>
                  <span>•</span>
                  <span>{b.edges.length} conexões</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Atualizado {format(new Date(b.updated_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}
    </div>
  );
}

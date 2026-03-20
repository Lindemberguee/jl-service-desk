import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Edit3,
  LayoutGrid,
  Loader2,
  ArrowLeft,
  Workflow,
  Users,
  Eye,
  Pencil,
  FolderTree,
  Loader,
  Search,
  Sparkles,
  Clock3,
  Shapes,
  Copy,
  ChevronRight,
  Wand2,
  Library,
  PanelTop,
} from 'lucide-react';
import { useCanvasBoards } from '@/hooks/useCanvasBoards';
import CanvasBoard from '@/components/canvas/CanvasBoard';
import CanvasShareDialog from '@/components/canvas/CanvasShareDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { INFRA_TEMPLATES } from '@/lib/canvasInfraTemplates';
import { toast } from 'sonner';
import AiFlowGeneratorDialog from '@/components/canvas/AiFlowGeneratorDialog';

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'mine', label: 'Meus Canvas' },
  { key: 'shared', label: 'Compartilhados' },
  { key: 'recent', label: 'Recentes' },
] as const;

type CanvasFilter = (typeof FILTERS)[number]['key'];

export default function CanvasPage() {
  const { boards, loading, saving, createBoard, saveBoard, deleteBoard, renameBoard } = useCanvasBoards();
  const { user } = useAuth();
  const [activeBoard, setActiveBoard] = useState<string | null>(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [generatingTemplates, setGeneratingTemplates] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CanvasFilter>('all');
  const navigate = useNavigate();

  const handleGenerateInfraTemplates = async () => {
    setGeneratingTemplates(true);
    try {
      let count = 0;
      for (const tpl of INFRA_TEMPLATES) {
        const exists = boards.find((b) => b.name === tpl.name);
        if (exists) continue;
        const result = await createBoard(tpl.name);
        if (result) {
          await saveBoard(result.id, tpl.nodes, tpl.edges, { x: 200, y: 50, zoom: 0.75 });
          count++;
        }
      }
      if (count > 0) {
        toast.success(`${count} fluxos de infraestrutura criados!`);
      } else {
        toast.info('Os fluxos de infraestrutura já existem.');
      }
    } catch {
      toast.error('Erro ao gerar templates');
    } finally {
      setGeneratingTemplates(false);
    }
  };

  const handleCreateFromTemplate = async (templateName: string, nodes: any[], edges: any[]) => {
    const result = await createBoard(templateName);
    if (result) {
      await saveBoard(result.id, nodes, edges, { x: 200, y: 50, zoom: 0.75 });
      setActiveBoard(result.id);
      toast.success('Canvas criado a partir do template!');
    }
  };

  const board = boards.find((b) => b.id === activeBoard);

  const handleCreate = async () => {
    const name = newBoardName.trim() || 'Novo Canvas';
    const result = await createBoard(name);
    if (result) {
      setActiveBoard(result.id);
      setNewBoardName('');
    }
  };

  const handleAiGenerated = async (name: string, nodes: any[], edges: any[]) => {
    const result = await createBoard(name);
    if (result) {
      await saveBoard(result.id, nodes, edges, { x: 100, y: 50, zoom: 0.7 });
      setActiveBoard(result.id);
    }
  };

  const handleRename = async (id: string) => {
    if (editName.trim()) {
      await renameBoard(id, editName.trim());
      setEditingId(null);
    }
  };

  const handleDuplicate = async (b: (typeof boards)[number]) => {
    const result = await createBoard(`${b.name} (cópia)`);
    if (result) {
      await saveBoard(result.id, b.nodes, b.edges, b.viewport || { x: 0, y: 0, zoom: 1 });
      toast.success('Canvas duplicado com sucesso!');
    }
  };

  const ownBoards = useMemo(() => boards.filter((b) => !b.is_shared), [boards]);
  const sharedBoards = useMemo(() => boards.filter((b) => b.is_shared), [boards]);
  const isOwner = board ? board.user_id === user?.id : false;
  const canEdit = board ? isOwner || board.share_permission === 'edit' : false;

  const filteredBoards = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const base = boards.filter((b) => {
      if (filter === 'mine' && b.is_shared) return false;
      if (filter === 'shared' && !b.is_shared) return false;
      if (filter === 'recent') {
        const updatedAt = new Date(b.updated_at).getTime();
        const threeDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 3;
        if (updatedAt < threeDaysAgo) return false;
      }
      return true;
    });

    if (!normalizedSearch) return base;

    return base.filter((b) => {
      return [b.name, b.owner_name, b.share_permission]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [boards, filter, search]);

  const recentBoards = useMemo(() => {
    return [...boards]
      .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
      .slice(0, 4);
  }, [boards]);

  const stats = useMemo(() => {
    const totalNodes = boards.reduce((acc, item) => acc + item.nodes.length, 0);
    const totalConnections = boards.reduce((acc, item) => acc + item.edges.length, 0);
    return {
      totalBoards: boards.length,
      ownBoards: ownBoards.length,
      sharedBoards: sharedBoards.length,
      totalNodes,
      totalConnections,
    };
  }, [boards, ownBoards.length, sharedBoards.length]);

  if (board) {
    return (
      <div className={isFullscreen ? 'fixed inset-0 z-50 flex flex-col bg-background' : 'flex flex-col h-[calc(100vh-4rem)]'}>
        {!isFullscreen && (
          <div className="flex items-center gap-3 px-1 pb-3 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setActiveBoard(null)} className="text-xs gap-1 rounded-xl">
              <LayoutGrid className="h-3.5 w-3.5" /> Voltar ao workspace
            </Button>
            <span className="text-sm font-semibold truncate">{board.name}</span>
            {board.is_shared && (
              <Badge variant="outline" className="text-[10px] gap-1 rounded-full">
                <Users className="h-3 w-3" />
                Compartilhado por {board.owner_name}
                {board.share_permission === 'edit' ? <Pencil className="h-2.5 w-2.5 ml-0.5" /> : <Eye className="h-2.5 w-2.5 ml-0.5" />}
              </Badge>
            )}
            {!canEdit && <Badge variant="secondary" className="text-[10px] rounded-full">Somente leitura</Badge>}
            <div className="ml-auto">{isOwner && <CanvasShareDialog boardId={board.id} boardName={board.name} isOwner={isOwner} />}</div>
          </div>
        )}
        <div className={`flex-1 overflow-hidden bg-sidebar ${isFullscreen ? '' : 'rounded-2xl border border-border shadow-sm'}`}>
          <CanvasBoard
            boardId={board.id}
            boardName={board.name}
            initialNodes={board.nodes}
            initialEdges={board.edges}
            initialViewport={board.viewport}
            onSave={(nodes, edges, viewport) => saveBoard(board.id, nodes, edges, viewport)}
            saving={saving}
            readOnly={!canEdit}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen((f) => !f)}
          />
        </div>
      </div>
    );
  }

  const BoardCard = ({ b }: { b: (typeof boards)[0] }) => {
    const isShared = !!b.is_shared;
    const updatedLabel = format(new Date(b.updated_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR });

    return (
      <Card
        key={b.id}
        className="group relative overflow-hidden rounded-2xl border-border/70 bg-card/95 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg cursor-pointer"
        onClick={() => setActiveBoard(b.id)}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary/40 to-transparent" />
        <CardContent className="p-0">
          <div className="border-b border-border/60 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {editingId === b.id ? (
                  <Input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleRename(b.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(b.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-8 text-sm w-full"
                  />
                ) : (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm truncate">{b.name}</h3>
                      {isShared ? (
                        <Badge variant="outline" className="text-[10px] rounded-full gap-1">
                          <Users className="h-3 w-3" /> Compartilhado
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] rounded-full">Privado</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                      {isShared
                        ? `Board compartilhado por ${b.owner_name || 'um colaborador'} com permissão de ${b.share_permission === 'edit' ? 'edição' : 'visualização'}.`
                        : 'Canvas autoral pronto para fluxos, brainstorms, processos, arquitetura e documentação visual.'}
                    </p>
                  </>
                )}
              </div>

              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {!isShared && (
                  <>
                    <div onClick={(e) => e.stopPropagation()}>
                      <CanvasShareDialog boardId={b.id} boardName={b.name} isOwner={true} />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={(e) => { e.stopPropagation(); handleDuplicate(b); }}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(b.id);
                        setEditName(b.name);
                      }}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive" onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
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
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 py-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <WorkspaceMiniStat label="Nós" value={b.nodes.length} />
              <WorkspaceMiniStat label="Conexões" value={b.edges.length} />
              <WorkspaceMiniStat label="Modo" value={isShared ? (b.share_permission === 'edit' ? 'Editor' : 'View') : 'Owner'} />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                <span>{updatedLabel}</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-[11px]" onClick={(e) => { e.stopPropagation(); setActiveBoard(b.id); }}>
                Abrir <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const visibleOwnBoards = filteredBoards.filter((b) => !b.is_shared);
  const visibleSharedBoards = filteredBoards.filter((b) => b.is_shared);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/ferramentas')} className="gap-1 text-xs rounded-xl">
          <ArrowLeft className="h-3.5 w-3.5" /> Ferramentas
        </Button>
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_35%),radial-gradient(circle_at_bottom_left,hsl(var(--primary)/0.08),transparent_30%)]" />
        <div className="relative p-6 lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl space-y-4">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Workspace visual colaborativo
              </Badge>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2">
                  <Workflow className="h-6 w-6 text-primary" /> Canvas
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  Estruture processos, fluxos, mapas visuais, arquitetura de TI e documentação colaborativa em um ambiente moderno, compartilhável e pronto para operação.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-sm">
                  <PanelTop className="h-4 w-4 text-primary" />
                  <span className="font-medium">{stats.totalBoards}</span>
                  <span className="text-muted-foreground">boards ativos</span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-sm">
                  <Shapes className="h-4 w-4 text-primary" />
                  <span className="font-medium">{stats.totalNodes}</span>
                  <span className="text-muted-foreground">nós no workspace</span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-medium">{stats.sharedBoards}</span>
                  <span className="text-muted-foreground">compartilhados</span>
                </div>
              </div>
            </div>

            <Card className="w-full max-w-xl rounded-2xl border-border/70 bg-background/90 shadow-lg backdrop-blur">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Criar novo canvas</p>
                    <p className="text-xs text-muted-foreground">Comece do zero, use IA ou aproveite templates prontos.</p>
                  </div>
                  <Badge variant="secondary" className="rounded-full">Produto nativo</Badge>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    placeholder="Ex: Fluxo de atendimento N1"
                    className="h-10 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                  <Button onClick={handleCreate} className="h-10 gap-1.5 rounded-xl">
                    <Plus className="h-4 w-4" /> Criar Canvas
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AiFlowGeneratorDialog onGenerated={handleAiGenerated} />
                  <Button size="sm" variant="outline" onClick={handleGenerateInfraTemplates} disabled={generatingTemplates} className="gap-1.5 rounded-xl">
                    {generatingTemplates ? <Loader className="h-4 w-4 animate-spin" /> : <FolderTree className="h-4 w-4" />}
                    Gerar Fluxos de Infraestrutura
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <WorkspaceStatCard icon={Workflow} label="Boards totais" value={stats.totalBoards} helper="Espaços visuais disponíveis no tenant" />
        <WorkspaceStatCard icon={Library} label="Boards próprios" value={stats.ownBoards} helper="Canvas autorais da sua operação" />
        <WorkspaceStatCard icon={Users} label="Compartilhados" value={stats.sharedBoards} helper="Boards recebidos com colaboração" />
        <WorkspaceStatCard icon={Shapes} label="Conexões totais" value={stats.totalConnections} helper="Mapa da complexidade visual do workspace" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" /> Biblioteca de Canvas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, dono ou permissão..." className="h-10 pl-9 rounded-xl" />
              </div>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((item) => (
                  <Button
                    key={item.key}
                    type="button"
                    size="sm"
                    variant={filter === item.key ? 'default' : 'outline'}
                    className="rounded-full"
                    onClick={() => setFilter(item.key)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredBoards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Workflow className="h-7 w-7" />
                </div>
                <h2 className="text-base font-semibold">Nenhum canvas encontrado</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ajuste os filtros, pesquise outro termo ou crie um novo board para começar.
                </p>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {visibleOwnBoards.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-muted-foreground">Meus Canvas</h2>
                      <Badge variant="secondary" className="rounded-full">{visibleOwnBoards.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {visibleOwnBoards.map((b) => <BoardCard key={b.id} b={b} />)}
                    </div>
                  </div>
                )}

                {visibleSharedBoards.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Users className="h-4 w-4" /> Compartilhados comigo
                      </h2>
                      <Badge variant="secondary" className="rounded-full">{visibleSharedBoards.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {visibleSharedBoards.map((b) => <BoardCard key={b.id} b={b} />)}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Library className="h-4 w-4 text-primary" /> Templates sugeridos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {INFRA_TEMPLATES.slice(0, 4).map((template) => (
                <button
                  key={template.name}
                  type="button"
                  onClick={() => handleCreateFromTemplate(template.name, template.nodes, template.edges)}
                  className="w-full rounded-2xl border border-border/70 bg-background px-3 py-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold line-clamp-2">{template.name}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {template.nodes.length} nós • {template.edges.length} conexões
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full">Template</Badge>
                  </div>
                </button>
              ))}
              <Button variant="outline" className="w-full rounded-xl gap-1.5" onClick={handleGenerateInfraTemplates} disabled={generatingTemplates}>
                {generatingTemplates ? <Loader className="h-4 w-4 animate-spin" /> : <FolderTree className="h-4 w-4" />}
                Popular com templates
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-primary" /> Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentBoards.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma atividade recente ainda.</p>
              ) : (
                recentBoards.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveBoard(item.id)}
                    className="w-full rounded-2xl border border-border/70 bg-background px-3 py-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{item.name}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground truncate">
                          Atualizado {format(new Date(item.updated_at), "dd MMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      {item.is_shared ? (
                        <Badge variant="outline" className="rounded-full text-[10px]">Shared</Badge>
                      ) : (
                        <Badge variant="secondary" className="rounded-full text-[10px]">Owner</Badge>
                      )}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function WorkspaceStatCard({ icon: Icon, label, value, helper }: { icon: any; label: string; value: string | number; helper: string }) {
  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">{label}</span>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function WorkspaceMiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-center">
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

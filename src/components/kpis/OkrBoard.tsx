import { useState, useMemo, useEffect, useRef } from 'react';
import { useOkrs, type OkrCycle, type OkrObjective, type OkrKeyResult } from '@/hooks/useOkrs';
import { useKpis } from '@/hooks/useKpis';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Plus, Target, Pencil, Trash2, BarChart3,
  ChevronRight, AlertTriangle, CheckCircle2, Clock, Play, Pause, Timer,
  Search, MoreHorizontal, Copy, Filter, TrendingUp, Users, Zap, CalendarDays
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ActivityDetailDialog } from '@/components/kpis/ActivityDetailDialog';

/* ───────── Constants ───────── */

const cycleTypes = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semester', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
  { value: 'custom', label: 'Personalizado' },
];

const STATUSES: Record<string, { label: string; color: string; icon: React.ElementType; cls: string }> = {
  a_iniciar:             { label: 'Pendente',            color: 'text-muted-foreground', icon: Clock,        cls: 'bg-muted/60 text-muted-foreground border-border' },
  em_andamento:          { label: 'Em andamento',        color: 'text-blue-500',         icon: Play,         cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  no_prazo:              { label: 'No prazo',            color: 'text-emerald-500',      icon: CheckCircle2, cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  atrasado:              { label: 'Atrasado',            color: 'text-red-500',          icon: AlertTriangle, cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  finalizado:            { label: 'Concluído',           color: 'text-emerald-600',      icon: CheckCircle2, cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  finalizado_com_atraso: { label: 'Concluído c/ atraso', color: 'text-orange-500',       icon: Timer,        cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  pausado:               { label: 'Pausado',             color: 'text-muted-foreground', icon: Pause,        cls: 'bg-muted/60 text-muted-foreground border-border' },
  cancelado:             { label: 'Cancelado',           color: 'text-muted-foreground', icon: Trash2,       cls: 'bg-muted/60 text-muted-foreground border-border line-through' },
};

const GRID = 'grid-cols-[minmax(200px,3fr)_120px_100px_40px]';

/* ───────── Helpers ───────── */

function krProgress(kr: OkrKeyResult) {
  const range = kr.target_value - kr.start_value;
  if (range === 0) return 100;
  return Math.max(0, Math.min(Math.round(((kr.current_value - kr.start_value) / range) * 100), 100));
}

function deadlineColor(endDate: string | null) {
  if (!endDate) return '';
  const days = differenceInDays(parseISO(endDate), new Date());
  if (days < 0) return 'text-red-500';
  if (days <= 7) return 'text-amber-500';
  return 'text-muted-foreground';
}

function supportTeamAvatars(team: string | null | undefined) {
  if (!team) return [];
  return team.split(',').map(t => t.trim()).filter(Boolean);
}

/* ───────── Component ───────── */

export function OkrBoard() {
  const {
    cycles, objectives, keyResults, isLoading,
    createCycle, updateCycle, deleteCycle,
    createObjective, updateObjective, deleteObjective,
    createKeyResult, updateKeyResult, deleteKeyResult,
  } = useOkrs();
  const { kpis } = useKpis();
  const { currentRole, rolePermissions, user } = useAuth();
  const canManage = currentRole && hasPermission(currentRole, 'kpis:manage', undefined, rolePermissions);

  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [cycleDialogOpen, setCycleDialogOpen] = useState(false);
  const [objDialogOpen, setObjDialogOpen] = useState(false);
  const [krDialogOpen, setKrDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Partial<OkrCycle>>({});
  const [editingObj, setEditingObj] = useState<Partial<OkrObjective>>({});
  const [objActivities, setObjActivities] = useState<string[]>(['']);
  const [objKpiIds, setObjKpiIds] = useState<string[]>([]);
  const [objStartDate, setObjStartDate] = useState('');
  const [objEndDate, setObjEndDate] = useState('');
  const [editingKr, setEditingKr] = useState<Partial<OkrKeyResult>>({});
  const [expandedObjs, setExpandedObjs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedKrs, setSelectedKrs] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ krId: string; field: string } | null>(null);
  const [editCellValue, setEditCellValue] = useState('');
  const [detailObjective, setDetailObjective] = useState<OkrObjective | null>(null);
  const [detailActivities, setDetailActivities] = useState<OkrKeyResult[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = (obj: OkrObjective) => {
    const krs = keyResults.filter(kr => kr.objective_id === obj.id);
    setDetailObjective(obj);
    setDetailActivities(krs);
    setDetailOpen(true);
  };

  const handleUpdateLinks = async (activityId: string, links: Array<{ label: string; url: string }>) => {
    try {
      await updateKeyResult.mutateAsync({ id: activityId, links } as any);
      setDetailActivities(prev => prev.map(a => a.id === activityId ? { ...a, links } : a));
      toast.success('Links atualizados');
    } catch { toast.error('Erro ao atualizar links'); }
  };

  /* ── Derived ── */
  const activeCycle = selectedCycleId
    ? cycles.find(c => c.id === selectedCycleId)
    : cycles.find(c => c.status === 'active') || cycles[0];
  const cycleId = activeCycle?.id;
  const cycleObjectives = cycleId ? objectives.filter(o => o.cycle_id === cycleId) : [];

  const daysRemaining = activeCycle ? Math.max(0, differenceInDays(parseISO(activeCycle.ends_at), new Date())) : 0;
  const totalDays = activeCycle ? differenceInDays(parseISO(activeCycle.ends_at), parseISO(activeCycle.starts_at)) : 1;
  const elapsedPct = totalDays > 0 ? Math.min(((totalDays - daysRemaining) / totalDays) * 100, 100) : 0;

  useEffect(() => {
    if (cycleObjectives.length > 0 && expandedObjs.size === 0) {
      setExpandedObjs(new Set(cycleObjectives.map(o => o.id)));
    }
  }, [cycleObjectives.length]);

  const allKrs = useMemo(() => cycleObjectives.flatMap(o => keyResults.filter(kr => kr.objective_id === o.id)), [cycleObjectives, keyResults]);

  /* ── Auto-detect overdue ── */
  const autoRan = useRef(false);
  useEffect(() => {
    if (isLoading || allKrs.length === 0 || autoRan.current) return;
    autoRan.current = true;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    allKrs
      .filter(a => {
        if (!a.end_date) return false;
        const end = parseISO(a.end_date); end.setHours(0, 0, 0, 0);
        return end < today && !['finalizado', 'finalizado_com_atraso', 'cancelado', 'pausado', 'atrasado'].includes(a.activity_status);
      })
      .forEach(a => updateKeyResult.mutateAsync({ id: a.id, activity_status: 'atrasado' }).catch(() => {}));
  }, [isLoading, allKrs]);

  /* ── Table data ── */
  const tableData = useMemo(() => {
    return cycleObjectives.map(obj => {
      let krs = keyResults.filter(kr => kr.objective_id === obj.id);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const objMatch = obj.title.toLowerCase().includes(q);
        const filtered = krs.filter(kr =>
          kr.title.toLowerCase().includes(q) ||
          kr.responsible_name?.toLowerCase().includes(q) ||
          kr.support_team?.toLowerCase().includes(q)
        );
        if (!objMatch && filtered.length === 0) return null;
        if (!objMatch) krs = filtered;
      }
      if (filterStatus !== 'all') {
        krs = krs.filter(kr => kr.activity_status === filterStatus);
        if (krs.length === 0) return null;
      }
      return { objective: obj, keyResults: krs };
    }).filter(Boolean) as { objective: OkrObjective; keyResults: OkrKeyResult[] }[];
  }, [cycleObjectives, keyResults, searchQuery, filterStatus]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = allKrs.length;
    const done = allKrs.filter(a => ['finalizado', 'finalizado_com_atraso'].includes(a.activity_status)).length;
    const overdue = allKrs.filter(a => a.activity_status === 'atrasado').length;
    const pct = cycleObjectives.length > 0
      ? Math.round(cycleObjectives.reduce((s, o) => s + (o.progress || 0), 0) / cycleObjectives.length)
      : 0;
    return { total, done, overdue, pct };
  }, [allKrs, cycleObjectives]);

  /* ── Interactions ── */
  const toggleExpand = (id: string) => setExpandedObjs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectKr = (id: string) => setSelectedKrs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAllKrs = (krs: OkrKeyResult[]) => {
    const allSel = krs.every(kr => selectedKrs.has(kr.id));
    setSelectedKrs(prev => { const n = new Set(prev); krs.forEach(kr => allSel ? n.delete(kr.id) : n.add(kr.id)); return n; });
  };

  const startInlineEdit = (krId: string, field: string, val: string) => { if (!canManage) return; setEditingCell({ krId, field }); setEditCellValue(val); };
  const commitInlineEdit = async () => {
    if (!editingCell) return;
    try { await updateKeyResult.mutateAsync({ id: editingCell.krId, [editingCell.field]: editCellValue }); toast.success('Atualizado'); } catch { toast.error('Erro'); }
    setEditingCell(null);
  };

  const handleQuickStatusChange = async (krId: string, newStatus: string) => {
    try {
      const kr = keyResults.find(k => k.id === krId);
      let finalStatus = newStatus;
      if (newStatus === 'finalizado' && kr?.end_date) {
        const end = parseISO(kr.end_date); end.setHours(0, 0, 0, 0);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (today > end) finalStatus = 'finalizado_com_atraso';
      }
      const updates: any = { id: krId, activity_status: finalStatus };
      if (['finalizado', 'finalizado_com_atraso'].includes(finalStatus) && kr) {
        updates.current_value = kr.target_value;
        updates.delivery_date = new Date().toISOString().split('T')[0];
      }
      await updateKeyResult.mutateAsync(updates);
      if (kr) {
        const objKrs = keyResults.filter(k => k.objective_id === kr.objective_id);
        const totalProgress = objKrs.reduce((sum, k) => {
          const cv = k.id === krId && ['finalizado', 'finalizado_com_atraso'].includes(finalStatus) ? k.target_value : k.current_value;
          const range = k.target_value - k.start_value;
          if (range === 0) return sum;
          return sum + Math.max(0, Math.min(((cv - k.start_value) / range) * 100, 100));
        }, 0);
        await updateObjective.mutateAsync({ id: kr.objective_id, progress: objKrs.length > 0 ? Math.round(totalProgress / objKrs.length) : 0 });
      }
      toast.success('Status atualizado');
    } catch { toast.error('Erro ao atualizar status'); }
  };

  const handleDuplicateKr = async (kr: OkrKeyResult) => {
    try { const { id, created_at, ...rest } = kr; await createKeyResult.mutateAsync({ ...rest, title: `${kr.title} (cópia)` }); toast.success('Duplicado'); } catch { toast.error('Erro'); }
  };

  const handleSaveCycle = async () => {
    if (!editingCycle.name?.trim() || !editingCycle.starts_at || !editingCycle.ends_at) return toast.error('Preencha todos os campos');
    try {
      if (editingCycle.id) { await updateCycle.mutateAsync({ id: editingCycle.id, ...editingCycle }); } else { await createCycle.mutateAsync({ ...editingCycle, created_by: user?.id }); }
      setCycleDialogOpen(false); toast.success('Ciclo salvo');
    } catch { toast.error('Erro'); }
  };

  const handleSaveObjective = async () => {
    if (!editingObj.title?.trim()) return toast.error('Título obrigatório');
    try {
      if (editingObj.id) { await updateObjective.mutateAsync({ id: editingObj.id, ...editingObj }); } else { await createObjective.mutateAsync({ ...editingObj, cycle_id: cycleId }); }
      setObjDialogOpen(false); toast.success('Objetivo salvo');
    } catch { toast.error('Erro'); }
  };

  const handleSaveKr = async () => {
    if (!editingKr.title?.trim()) return toast.error('Resultado-chave obrigatório');
    try {
      if (editingKr.id) { await updateKeyResult.mutateAsync({ id: editingKr.id, ...editingKr }); } else { await createKeyResult.mutateAsync(editingKr); }
      setKrDialogOpen(false); toast.success('Resultado-chave salvo');
    } catch { toast.error('Erro'); }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Excluir ${selectedKrs.size} itens?`)) return;
    try { await Promise.all(Array.from(selectedKrs).map(id => deleteKeyResult.mutateAsync(id))); setSelectedKrs(new Set()); toast.success('Excluídos'); } catch { toast.error('Erro'); }
  };

  const handleBulkStatus = async (status: string) => {
    try { await Promise.all(Array.from(selectedKrs).map(id => handleQuickStatusChange(id, status))); setSelectedKrs(new Set()); } catch { toast.error('Erro'); }
  };

  /* ═══════════════════════ RENDER ═══════════════════════ */

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-fade-in">

        {/* ═══ HEADER DO CICLO ═══ */}
        {activeCycle && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">{activeCycle.name}</h2>
                  {canManage && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => { setEditingCycle(activeCycle); setCycleDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(activeCycle.starts_at), "dd MMM yyyy", { locale: ptBR })} — {format(parseISO(activeCycle.ends_at), "dd MMM yyyy", { locale: ptBR })}
                  <span className="mx-2 opacity-30">·</span>
                  <span className="font-medium text-foreground">{daysRemaining}</span> dias restantes
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {cycles.map(c => (
                  <Button key={c.id} variant={c.id === activeCycle?.id ? 'default' : 'ghost'} size="sm" onClick={() => setSelectedCycleId(c.id)} className="h-7 text-xs rounded-full px-3">
                    {c.name}
                  </Button>
                ))}
                {canManage && (
                  <Button variant="ghost" size="sm" onClick={() => { setEditingCycle({ type: 'annual', status: 'active' }); setCycleDialogOpen(true); }} className="h-7 text-xs rounded-full px-3 border border-dashed border-border">
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="relative">
              <Progress value={elapsedPct} className="h-1.5 rounded-full" />
              <div className="flex justify-between mt-1 text-[11px] text-muted-foreground tabular-nums">
                <span>{format(parseISO(activeCycle.starts_at), 'dd MMM', { locale: ptBR })}</span>
                <span className="font-medium text-foreground">{Math.round(elapsedPct)}% do período</span>
                <span>{format(parseISO(activeCycle.ends_at), 'dd MMM', { locale: ptBR })}</span>
              </div>
            </div>

            {/* ═══ CARDS DE MÉTRICAS ═══ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard icon={TrendingUp} label="Progresso Geral" value={`${stats.pct}%`} sub={<Progress value={stats.pct} className="h-1 mt-2" />} />
              <MetricCard icon={CheckCircle2} label="Resultados Concluídos" value={`${stats.done}`} sub={<span className="text-[11px] text-muted-foreground">de {stats.total} resultados</span>} />
              <MetricCard icon={Target} label="Objetivos Ativos" value={`${cycleObjectives.length}`} />
              <MetricCard icon={AlertTriangle} label="Em Atraso" value={`${stats.overdue}`} alert={stats.overdue > 0} />
            </div>
          </div>
        )}

        {/* ═══ TOOLBAR ═══ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar objetivos, resultados, responsáveis..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm bg-muted/30 border-border/50" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-auto h-9 text-xs gap-1.5 border-border/50 bg-muted/30">
                <Filter className="h-3.5 w-3.5" /><SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUSES).map(([k, v]) => (
                  <SelectItem key={k} value={k}><div className="flex items-center gap-2"><v.icon className={cn("h-3 w-3", v.color)} />{v.label}</div></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {selectedKrs.size > 0 && canManage && (
              <div className="flex items-center gap-1.5 animate-fade-in">
                <span className="text-xs text-muted-foreground">{selectedKrs.size} selecionados</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-8 text-xs gap-1"><Zap className="h-3 w-3" />Ações</Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBulkStatus('finalizado')}><CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-500" />Concluir</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatus('em_andamento')}><Play className="h-3.5 w-3.5 mr-2 text-blue-500" />Em andamento</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleBulkDelete} className="text-destructive"><Trash2 className="h-3.5 w-3.5 mr-2" />Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            {canManage && cycleId && (
              <Button onClick={() => { setEditingObj({ priority: 'media', status: 'on_track', progress: 0, category: 'Operacional' }); setObjDialogOpen(true); }} className="h-9 text-xs gap-1.5" size="sm">
                <Plus className="h-3.5 w-3.5" /> Novo Objetivo
              </Button>
            )}
          </div>
        </div>

        {/* ═══ EMPTY STATE ═══ */}
        {cycleObjectives.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-border/60 bg-muted/10">
            <Target className="h-14 w-14 text-muted-foreground/20" />
            <h3 className="text-lg font-semibold mt-5 text-foreground">Monte seu Plano de Ação</h3>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-md">Crie objetivos e defina resultados-chave.</p>
            {canManage && cycleId && (
              <Button onClick={() => { setEditingObj({ priority: 'media', status: 'on_track', progress: 0, category: 'Operacional' }); setObjDialogOpen(true); }} className="mt-5 gap-1.5" size="sm">
                <Plus className="h-3.5 w-3.5" /> Criar primeiro objetivo
              </Button>
            )}
          </div>
        )}

        {/* ═══ TABELA PRINCIPAL ═══ */}
        {tableData.length > 0 && (
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-[0_2px_12px_0_hsl(var(--foreground)/0.03)]">
            <div className="overflow-x-auto">

            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm border-b border-border/60 min-w-[600px]">
              <div className={cn("grid items-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4", GRID)}>
                <div className="p-2">Objetivo</div>
                <div className="p-2 text-center">Status</div>
                <div className="p-2 text-center">Meta</div>
                <div className="p-2" />
              </div>
            </div>

            {/* Body */}
            <div className="divide-y divide-border/40 min-w-[600px]">
              {tableData.map(({ objective: obj, keyResults: krs }) => {
                const doneCount = krs.filter(kr => ['finalizado', 'finalizado_com_atraso'].includes(kr.activity_status)).length;
                // Determine overall status from KRs
                const hasAtrasado = krs.some(kr => kr.activity_status === 'atrasado');
                const allDone = krs.length > 0 && krs.every(kr => ['finalizado', 'finalizado_com_atraso'].includes(kr.activity_status));
                const overallStatus = allDone ? 'finalizado' : hasAtrasado ? 'atrasado' : krs.some(kr => kr.activity_status === 'em_andamento') ? 'em_andamento' : 'a_iniciar';
                const st = STATUSES[overallStatus] || STATUSES.a_iniciar;
                const StIcon = st.icon;

                return (
                  <div
                    key={obj.id}
                    onClick={() => openDetail(obj)}
                    className={cn("grid items-center px-4 hover:bg-accent/30 transition-colors cursor-pointer group/obj", GRID)}
                  >
                    {/* Objetivo */}
                    <div className="p-3 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{obj.title}</p>
                      {obj.description && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{obj.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <Progress value={obj.progress} className="h-1 flex-1 max-w-[120px]" />
                        <span className="text-[10px] font-bold tabular-nums text-muted-foreground">{Math.round(obj.progress)}%</span>
                        <Badge variant="outline" className="text-[10px] tabular-nums">{doneCount}/{krs.length}</Badge>
                      </div>
                    </div>


                    {/* Status */}
                    <div className="p-3 text-center">
                      <Badge variant="outline" className={cn('text-[10px] gap-1 rounded-full font-semibold', st.cls)}>
                        <StIcon className="h-3 w-3" />
                        {st.label}
                      </Badge>
                    </div>

                    {/* Meta */}
                    <div className="p-3 text-center">
                      <span className="text-xs font-bold tabular-nums text-foreground">{obj.target_label || '—'}</span>
                    </div>

                    {/* Ações */}
                    <div className="p-3 flex justify-end" onClick={e => e.stopPropagation()}>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/obj:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingObj(obj); setObjDialogOpen(true); }}><Pencil className="h-3.5 w-3.5 mr-2" />Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditingKr({ objective_id: obj.id, start_value: 0, target_value: 100, current_value: 0, confidence_level: 70, unit: '%', status: 'on_track', activity_status: 'a_iniciar' }); setKrDialogOpen(true); }}>
                              <Plus className="h-3.5 w-3.5 mr-2" />Adicionar atividade
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm('Excluir objetivo?')) deleteObjective.mutateAsync(obj.id); }}><Trash2 className="h-3.5 w-3.5 mr-2" />Excluir</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        )}

        {/* ═══ DIALOGS ═══ */}

        {/* Cycle Dialog */}
        <Dialog open={cycleDialogOpen} onOpenChange={setCycleDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editingCycle.id ? 'Editar Ciclo' : 'Novo Ciclo'}</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2"><Label>Nome</Label><Input value={editingCycle.name || ''} onChange={e => setEditingCycle(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Plano de Ação 2026" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Tipo</Label><Select value={editingCycle.type || 'annual'} onValueChange={v => setEditingCycle(p => ({ ...p, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{cycleTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-2"><Label>Status</Label><Select value={editingCycle.status || 'active'} onValueChange={v => setEditingCycle(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Rascunho</SelectItem><SelectItem value="active">Ativo</SelectItem><SelectItem value="completed">Concluído</SelectItem><SelectItem value="cancelled">Cancelado</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Início</Label><Input type="date" value={editingCycle.starts_at || ''} onChange={e => setEditingCycle(p => ({ ...p, starts_at: e.target.value }))} /></div>
                <div className="grid gap-2"><Label>Fim</Label><Input type="date" value={editingCycle.ends_at || ''} onChange={e => setEditingCycle(p => ({ ...p, ends_at: e.target.value }))} /></div>
              </div>
            </div>
            <DialogFooter>
              {editingCycle.id && <Button variant="destructive" size="sm" className="mr-auto" onClick={() => { deleteCycle.mutateAsync(editingCycle.id!); setCycleDialogOpen(false); }}><Trash2 className="h-3.5 w-3.5 mr-1" />Excluir</Button>}
              <Button variant="outline" onClick={() => setCycleDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveCycle}>{editingCycle.id ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Objective Dialog */}
        <Dialog open={objDialogOpen} onOpenChange={setObjDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingObj.id ? 'Editar Objetivo' : 'Novo Objetivo'}</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2"><Label>Título</Label><Textarea value={editingObj.title || ''} onChange={e => setEditingObj(p => ({ ...p, title: e.target.value }))} rows={3} placeholder="Ex: Aumentar o uso e pertencimento tecnológico..." /></div>
              <div className="grid gap-2"><Label>Descrição</Label><Textarea value={editingObj.description || ''} onChange={e => setEditingObj(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Responsável</Label><Input value={editingObj.responsible_name || ''} onChange={e => setEditingObj(p => ({ ...p, responsible_name: e.target.value }))} /></div>
                <div className="grid gap-2"><Label>Área</Label><Input value={editingObj.area || ''} onChange={e => setEditingObj(p => ({ ...p, area: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Indicador</Label><Input value={editingObj.indicator || ''} onChange={e => setEditingObj(p => ({ ...p, indicator: e.target.value }))} placeholder="% de satisfação" /></div>
                <div className="grid gap-2"><Label>Meta</Label><Input value={editingObj.target_label || ''} onChange={e => setEditingObj(p => ({ ...p, target_label: e.target.value }))} placeholder="90%" /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setObjDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveObjective}>{editingObj.id ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* KR Dialog */}
        <Dialog open={krDialogOpen} onOpenChange={setKrDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingKr.id ? 'Editar Resultado-Chave' : 'Novo Resultado-Chave'}</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2"><Label>Resultado-Chave</Label><Textarea value={editingKr.title || ''} onChange={e => setEditingKr(p => ({ ...p, title: e.target.value }))} rows={2} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2"><Label>Meta</Label><Input type="number" value={editingKr.target_value ?? 100} onChange={e => setEditingKr(p => ({ ...p, target_value: parseFloat(e.target.value) || 0 }))} /></div>
                <div className="grid gap-2"><Label>Unidade</Label><Input value={editingKr.unit || '%'} onChange={e => setEditingKr(p => ({ ...p, unit: e.target.value }))} /></div>
                <div className="grid gap-2"><Label>Valor Inicial</Label><Input type="number" value={editingKr.start_value ?? 0} onChange={e => setEditingKr(p => ({ ...p, start_value: parseFloat(e.target.value) || 0 }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Responsável</Label><Input value={editingKr.responsible_name || ''} onChange={e => setEditingKr(p => ({ ...p, responsible_name: e.target.value }))} /></div>
                <div className="grid gap-2"><Label>Equipe de apoio</Label><Input value={editingKr.support_team || ''} onChange={e => setEditingKr(p => ({ ...p, support_team: e.target.value }))} placeholder="Infra, Suporte" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Status</Label><Select value={editingKr.activity_status || 'a_iniciar'} onValueChange={v => setEditingKr(p => ({ ...p, activity_status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUSES).map(([k, v]) => <SelectItem key={k} value={k}><div className="flex items-center gap-2"><v.icon className={cn("h-3 w-3", v.color)} />{v.label}</div></SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-2"><Label>Área</Label><Input value={editingKr.area || ''} onChange={e => setEditingKr(p => ({ ...p, area: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Início</Label><Input type="date" value={editingKr.start_date || ''} onChange={e => setEditingKr(p => ({ ...p, start_date: e.target.value }))} /></div>
                <div className="grid gap-2"><Label>Prazo</Label><Input type="date" value={editingKr.end_date || ''} onChange={e => setEditingKr(p => ({ ...p, end_date: e.target.value }))} /></div>
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-primary" />Vincular a KPI</Label>
                <Select value={editingKr.kpi_id || '__none__'} onValueChange={v => setEditingKr(p => ({ ...p, kpi_id: v === '__none__' ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum (manual)</SelectItem>
                    {kpis.filter(k => k.is_active).map(k => (
                      <SelectItem key={k.id} value={k.id}>{k.name} ({k.unit})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              {editingKr.id && <Button variant="destructive" size="sm" className="mr-auto" onClick={() => { deleteKeyResult.mutateAsync(editingKr.id!); setKrDialogOpen(false); }}><Trash2 className="h-3.5 w-3.5 mr-1" />Excluir</Button>}
              <Button variant="outline" onClick={() => setKrDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveKr}>{editingKr.id ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Activity Detail Dialog */}
        <ActivityDetailDialog
          objective={detailObjective}
          activities={detailActivities}
          kpis={kpis}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onUpdateLinks={handleUpdateLinks}
          onEditActivity={(activity) => {
            setEditingKr(activity);
            setKrDialogOpen(true);
          }}
          canManage={!!canManage}
        />
      </div>
    </TooltipProvider>
  );
}

/* ── Sub-components ── */

function MetricCard({ icon: Icon, label, value, sub, alert }: { icon: React.ElementType; label: string; value: string; sub?: React.ReactNode; alert?: boolean }) {
  return (
    <div className={cn(
      "rounded-xl border bg-card p-4 space-y-1 shadow-[0_1px_4px_0_hsl(var(--foreground)/0.03)] transition-shadow hover:shadow-[0_2px_8px_0_hsl(var(--foreground)/0.06)]",
      alert && "border-red-500/30"
    )}>
      <div className="flex items-center gap-2">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", alert ? "bg-red-500/10" : "bg-primary/10")}>
          <Icon className={cn("h-4 w-4", alert ? "text-red-500" : "text-primary")} />
        </div>
        <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold tabular-nums tracking-tight", alert ? "text-red-500" : "text-foreground")}>{value}</p>
      {sub && <div>{sub}</div>}
    </div>
  );
}

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Plus, Target, Calendar, Pencil, Trash2, BarChart3,
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Clock, Play, Pause, Timer,
  Search, MoreHorizontal, Copy, Filter, ArrowUpDown, TrendingUp, Users, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* ───────── Constants ───────── */

const cycleTypes = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semester', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
  { value: 'custom', label: 'Personalizado' },
];

const STATUSES: Record<string, { label: string; color: string; icon: React.ElementType; badgeCls: string }> = {
  a_iniciar:            { label: 'Pendente',        color: 'text-muted-foreground', icon: Clock,          badgeCls: 'bg-muted/60 text-muted-foreground border-border' },
  em_andamento:         { label: 'Em andamento',    color: 'text-blue-500',         icon: Play,           badgeCls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  no_prazo:             { label: 'No prazo',        color: 'text-emerald-500',      icon: CheckCircle2,   badgeCls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  atrasado:             { label: 'Atrasado',        color: 'text-red-500',          icon: AlertTriangle,  badgeCls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  finalizado:           { label: 'Concluído',       color: 'text-emerald-600',      icon: CheckCircle2,   badgeCls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  finalizado_com_atraso:{ label: 'Concluído c/ atraso', color: 'text-orange-500',   icon: Timer,          badgeCls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  pausado:              { label: 'Pausado',         color: 'text-muted-foreground', icon: Pause,          badgeCls: 'bg-muted/60 text-muted-foreground border-border' },
  cancelado:            { label: 'Cancelado',       color: 'text-muted-foreground', icon: Trash2,         badgeCls: 'bg-muted/60 text-muted-foreground border-border line-through' },
};

/* ───────── Component ───────── */

export function OkrBoard() {
  const {
    cycles, objectives, keyResults, isLoading,
    createCycle, updateCycle, deleteCycle,
    createObjective, updateObjective, deleteObjective,
    createKeyResult, updateKeyResult, deleteKeyResult,
    addCheckin,
  } = useOkrs();
  const { kpis } = useKpis();
  const { currentRole, rolePermissions, user } = useAuth();
  const canManage = currentRole && hasPermission(currentRole, 'kpis:manage', undefined, rolePermissions);

  /* ── State ── */
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [cycleDialogOpen, setCycleDialogOpen] = useState(false);
  const [objDialogOpen, setObjDialogOpen] = useState(false);
  const [krDialogOpen, setKrDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Partial<OkrCycle>>({});
  const [editingObj, setEditingObj] = useState<Partial<OkrObjective>>({});
  const [editingKr, setEditingKr] = useState<Partial<OkrKeyResult>>({});
  const [expandedObjs, setExpandedObjs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedKrs, setSelectedKrs] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ krId: string; field: string } | null>(null);
  const [editCellValue, setEditCellValue] = useState('');

  /* ── Derived ── */
  const activeCycle = selectedCycleId
    ? cycles.find(c => c.id === selectedCycleId)
    : cycles.find(c => c.status === 'active') || cycles[0];
  const cycleId = activeCycle?.id;
  const cycleObjectives = cycleId ? objectives.filter(o => o.cycle_id === cycleId) : [];

  const daysRemaining = activeCycle ? Math.max(0, differenceInDays(parseISO(activeCycle.ends_at), new Date())) : 0;
  const totalDays = activeCycle ? differenceInDays(parseISO(activeCycle.ends_at), parseISO(activeCycle.starts_at)) : 1;
  const elapsedPct = totalDays > 0 ? Math.min(((totalDays - daysRemaining) / totalDays) * 100, 100) : 0;

  // Expand all by default
  useEffect(() => {
    if (cycleObjectives.length > 0 && expandedObjs.size === 0) {
      setExpandedObjs(new Set(cycleObjectives.map(o => o.id)));
    }
  }, [cycleObjectives.length]);

  /* ── Build table data ── */
  const tableData = useMemo(() => {
    return cycleObjectives.map(obj => {
      let krs = keyResults.filter(kr => kr.objective_id === obj.id);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const objMatch = obj.title.toLowerCase().includes(q);
        const filteredKrs = krs.filter(kr =>
          kr.title.toLowerCase().includes(q) ||
          kr.responsible_name?.toLowerCase().includes(q) ||
          kr.description?.toLowerCase().includes(q)
        );
        if (!objMatch && filteredKrs.length === 0) return null;
        if (!objMatch) krs = filteredKrs;
      }
      if (filterStatus !== 'all') {
        krs = krs.filter(kr => kr.activity_status === filterStatus);
        if (krs.length === 0) return null;
      }
      return { objective: obj, keyResults: krs };
    }).filter(Boolean) as { objective: OkrObjective; keyResults: OkrKeyResult[] }[];
  }, [cycleObjectives, keyResults, searchQuery, filterStatus]);

  /* ── Auto-detect overdue ── */
  const autoRan = useRef(false);
  const allActivities = useMemo(() => cycleObjectives.flatMap(o => keyResults.filter(kr => kr.objective_id === o.id)), [cycleObjectives, keyResults]);

  useEffect(() => {
    if (isLoading || allActivities.length === 0 || autoRan.current) return;
    autoRan.current = true;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    allActivities
      .filter(a => {
        if (!a.end_date) return false;
        const end = parseISO(a.end_date); end.setHours(0, 0, 0, 0);
        return end < today && !['finalizado', 'finalizado_com_atraso', 'cancelado', 'pausado', 'atrasado'].includes(a.activity_status);
      })
      .forEach(a => updateKeyResult.mutateAsync({ id: a.id, activity_status: 'atrasado' }).catch(() => {}));
  }, [isLoading, allActivities]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = allActivities.length;
    const done = allActivities.filter(a => ['finalizado', 'finalizado_com_atraso'].includes(a.activity_status)).length;
    const overdue = allActivities.filter(a => a.activity_status === 'atrasado').length;
    const activeObjs = cycleObjectives.filter(o => o.status === 'on_track' || o.status === 'at_risk').length;
    const pct = cycleObjectives.length > 0
      ? Math.round(cycleObjectives.reduce((s, o) => s + (o.progress || 0), 0) / cycleObjectives.length)
      : 0;
    return { total, done, overdue, activeObjs, pct };
  }, [allActivities, cycleObjectives]);

  /* ── Toggle expand ── */
  const toggleExpand = (id: string) => {
    setExpandedObjs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── Selection ── */
  const toggleSelectKr = (id: string) => {
    setSelectedKrs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAllKrs = (krs: OkrKeyResult[]) => {
    const allSelected = krs.every(kr => selectedKrs.has(kr.id));
    setSelectedKrs(prev => {
      const next = new Set(prev);
      krs.forEach(kr => allSelected ? next.delete(kr.id) : next.add(kr.id));
      return next;
    });
  };

  /* ── Inline edit ── */
  const startInlineEdit = (krId: string, field: string, currentValue: string) => {
    if (!canManage) return;
    setEditingCell({ krId, field });
    setEditCellValue(currentValue);
  };
  const commitInlineEdit = async () => {
    if (!editingCell) return;
    try {
      await updateKeyResult.mutateAsync({ id: editingCell.krId, [editingCell.field]: editCellValue });
      toast.success('Atualizado');
    } catch { toast.error('Erro ao atualizar'); }
    setEditingCell(null);
  };

  /* ── Handlers ── */
  const handleSaveCycle = async () => {
    if (!editingCycle.name?.trim()) return toast.error('Nome obrigatório');
    if (!editingCycle.starts_at || !editingCycle.ends_at) return toast.error('Datas obrigatórias');
    try {
      if (editingCycle.id) {
        await updateCycle.mutateAsync({ id: editingCycle.id, ...editingCycle });
        toast.success('Ciclo atualizado');
      } else {
        await createCycle.mutateAsync({ ...editingCycle, created_by: user?.id });
        toast.success('Ciclo criado');
      }
      setCycleDialogOpen(false);
    } catch { toast.error('Erro ao salvar ciclo'); }
  };

  const handleSaveObjective = async () => {
    if (!editingObj.title?.trim()) return toast.error('Título obrigatório');
    try {
      if (editingObj.id) {
        await updateObjective.mutateAsync({ id: editingObj.id, ...editingObj });
        toast.success('Objetivo atualizado');
      } else {
        await createObjective.mutateAsync({ ...editingObj, cycle_id: cycleId });
        toast.success('Objetivo criado');
      }
      setObjDialogOpen(false);
    } catch { toast.error('Erro ao salvar objetivo'); }
  };

  const handleSaveKr = async () => {
    if (!editingKr.title?.trim()) return toast.error('Resultado-chave obrigatório');
    try {
      if (editingKr.id) {
        await updateKeyResult.mutateAsync({ id: editingKr.id, ...editingKr });
        toast.success('Resultado-chave atualizado');
      } else {
        await createKeyResult.mutateAsync(editingKr);
        toast.success('Resultado-chave criado');
      }
      setKrDialogOpen(false);
    } catch { toast.error('Erro ao salvar resultado-chave'); }
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
        const avg = objKrs.length > 0 ? Math.round(totalProgress / objKrs.length) : 0;
        await updateObjective.mutateAsync({ id: kr.objective_id, progress: avg });
      }
      toast.success('Status atualizado');
    } catch { toast.error('Erro ao atualizar status'); }
  };

  const handleDuplicateKr = async (kr: OkrKeyResult) => {
    try {
      const { id, created_at, ...rest } = kr;
      await createKeyResult.mutateAsync({ ...rest, title: `${kr.title} (cópia)` });
      toast.success('Duplicado com sucesso');
    } catch { toast.error('Erro ao duplicar'); }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Excluir ${selectedKrs.size} itens?`)) return;
    try {
      await Promise.all(Array.from(selectedKrs).map(id => deleteKeyResult.mutateAsync(id)));
      setSelectedKrs(new Set());
      toast.success('Itens excluídos');
    } catch { toast.error('Erro ao excluir'); }
  };

  const handleBulkStatusChange = async (status: string) => {
    try {
      await Promise.all(Array.from(selectedKrs).map(id => handleQuickStatusChange(id, status)));
      setSelectedKrs(new Set());
      toast.success('Status atualizados');
    } catch { toast.error('Erro ao atualizar'); }
  };

  /* ═══════════════════════ RENDER ═══════════════════════ */

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ═══ HEADER DO CICLO ═══ */}
      {activeCycle && (
        <div className="space-y-5">
          {/* Title + Cycle selector */}
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
                {format(parseISO(activeCycle.starts_at), "dd 'de' MMM yyyy", { locale: ptBR })} — {format(parseISO(activeCycle.ends_at), "dd 'de' MMM yyyy", { locale: ptBR })}
                <span className="mx-2">·</span>
                <span className="font-medium text-foreground">{daysRemaining}</span> dias restantes
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {cycles.map(c => (
                <Button key={c.id} variant={c.id === activeCycle?.id ? 'default' : 'ghost'} size="sm" onClick={() => setSelectedCycleId(c.id)} className="h-7 text-xs gap-1.5 rounded-full px-3">
                  {c.name}
                </Button>
              ))}
              {canManage && (
                <Button variant="ghost" size="sm" onClick={() => { setEditingCycle({ type: 'annual', status: 'active' }); setCycleDialogOpen(true); }} className="h-7 text-xs gap-1 rounded-full px-3 border border-dashed border-border">
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Timeline progress */}
          <div className="relative">
            <Progress value={elapsedPct} className="h-2 rounded-full" />
            <div className="flex justify-between mt-1.5 text-[11px] text-muted-foreground tabular-nums">
              <span>{format(parseISO(activeCycle.starts_at), 'dd MMM', { locale: ptBR })}</span>
              <span className="font-medium text-foreground">{Math.round(elapsedPct)}% do período</span>
              <span>{format(parseISO(activeCycle.ends_at), 'dd MMM', { locale: ptBR })}</span>
            </div>
          </div>

          {/* ═══ DASHBOARD DE PROGRESSO ═══ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard icon={TrendingUp} label="Progresso Geral" value={`${stats.pct}%`} sub={<Progress value={stats.pct} className="h-1 mt-2" />} />
            <MetricCard icon={CheckCircle2} label="Resultados Concluídos" value={`${stats.done}`} sub={<span className="text-[11px] text-muted-foreground">de {stats.total} resultados</span>} />
            <MetricCard icon={Target} label="Objetivos Ativos" value={`${cycleObjectives.length}`} />
            <MetricCard icon={AlertTriangle} label="Em Atraso" value={`${stats.overdue}`} alert={stats.overdue > 0} />
          </div>
        </div>
      )}

      {/* ═══ TOOLBAR: Search, Filters, Actions ═══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar objetivos, resultados, responsáveis..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm bg-muted/30 border-border/50 focus:bg-background"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-auto h-9 text-xs gap-1.5 border-border/50 bg-muted/30">
              <Filter className="h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUSES).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  <div className="flex items-center gap-2"><v.icon className={cn("h-3 w-3", v.color)} />{v.label}</div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {selectedKrs.size > 0 && canManage && (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <span className="text-xs text-muted-foreground">{selectedKrs.size} selecionados</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                    <Zap className="h-3 w-3" /> Ações
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleBulkStatusChange('finalizado')}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-500" /> Marcar como concluído
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusChange('em_andamento')}>
                    <Play className="h-3.5 w-3.5 mr-2 text-blue-500" /> Em andamento
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleBulkDelete} className="text-destructive">
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir selecionados
                  </DropdownMenuItem>
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

      {/* ═══ EMPTY ═══ */}
      {cycleObjectives.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-border/60 bg-muted/10">
          <Target className="h-14 w-14 text-muted-foreground/20" />
          <h3 className="text-lg font-semibold mt-5 text-foreground">Monte seu Plano de Ação</h3>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md">Crie objetivos e defina resultados-chave com indicadores e metas.</p>
          {canManage && cycleId && (
            <Button onClick={() => { setEditingObj({ priority: 'media', status: 'on_track', progress: 0, category: 'Operacional' }); setObjDialogOpen(true); }} className="mt-5 gap-1.5" size="sm">
              <Plus className="h-3.5 w-3.5" /> Criar primeiro objetivo
            </Button>
          )}
        </div>
      )}

      {/* ═══ TABELA PRINCIPAL (OKR) ═══ */}
      {tableData.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-[0_2px_12px_0_hsl(var(--foreground)/0.03)]">

          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm border-b border-border/60">
            <div className="grid grid-cols-[40px_1fr_2fr_1.2fr_100px_120px_100px_48px] items-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2">
              <div className="p-3" />
              <div className="p-3">Objetivo</div>
              <div className="p-3">Resultado-chave</div>
              <div className="p-3">Indicador</div>
              <div className="p-3 text-center">Meta</div>
              <div className="p-3">Responsável</div>
              <div className="p-3 text-center">Status</div>
              <div className="p-3" />
            </div>
          </div>

          {/* Body */}
          <div className="divide-y divide-border/40">
            {tableData.map(({ objective: obj, keyResults: krs }) => {
              const isExpanded = expandedObjs.has(obj.id);
              const allObjKrsSelected = krs.length > 0 && krs.every(kr => selectedKrs.has(kr.id));

              return (
                <div key={obj.id} className="group/obj">
                  {/* ── Objective row ── */}
                  <div
                    className="grid grid-cols-[40px_1fr_2fr_1.2fr_100px_120px_100px_48px] items-center px-2 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => toggleExpand(obj.id)}
                  >
                    <div className="p-3 flex items-center justify-center">
                      {canManage && (
                        <Checkbox
                          checked={allObjKrsSelected}
                          onCheckedChange={() => selectAllKrs(krs)}
                          onClick={e => e.stopPropagation()}
                          className="mr-1"
                        />
                      )}
                    </div>
                    <div className="p-3 col-span-5 flex items-center gap-3">
                      <div className={cn("transition-transform duration-200", isExpanded && "rotate-90")}>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{obj.title}</p>
                        {obj.description && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{obj.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Progress value={obj.progress} className="h-1.5 w-24" />
                        <span className="text-xs font-bold tabular-nums text-foreground w-10 text-right">{Math.round(obj.progress)}%</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{krs.length} resultado{krs.length !== 1 ? 's' : ''}</Badge>
                    </div>
                    <div className="p-3" />
                    <div className="p-3 flex justify-end">
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/obj:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingObj(obj); setObjDialogOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingKr({ objective_id: obj.id, start_value: 0, target_value: 100, current_value: 0, confidence_level: 70, unit: '%', status: 'on_track', activity_status: 'a_iniciar' }); setKrDialogOpen(true); }}>
                              <Plus className="h-3.5 w-3.5 mr-2" /> Adicionar resultado-chave
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); if (confirm('Excluir objetivo e todos os seus resultados?')) deleteObjective.mutateAsync(obj.id); }}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  {/* ── Key Results rows ── */}
                  {isExpanded && (
                    <div className="animate-accordion-down">
                      {krs.length > 0 ? krs.map((kr) => {
                        const linkedKpi = kr.kpi_id ? kpis.find(k => k.id === kr.kpi_id) : null;
                        const indicatorText = linkedKpi?.name || kr.description || '—';
                        const metaText = `${kr.target_value}${kr.unit === '%' ? '%' : ` ${kr.unit}`}`;
                        const st = STATUSES[kr.activity_status] || STATUSES.a_iniciar;
                        const StIcon = st.icon;

                        return (
                          <div
                            key={kr.id}
                            className={cn(
                              "grid grid-cols-[40px_1fr_2fr_1.2fr_100px_120px_100px_48px] items-center px-2",
                              "border-t border-border/20 hover:bg-accent/30 transition-colors group/kr",
                              selectedKrs.has(kr.id) && "bg-accent/20"
                            )}
                          >
                            {/* Checkbox */}
                            <div className="p-3 flex items-center justify-center">
                              {canManage && (
                                <Checkbox
                                  checked={selectedKrs.has(kr.id)}
                                  onCheckedChange={() => toggleSelectKr(kr.id)}
                                />
                              )}
                            </div>

                            {/* Objective spacer */}
                            <div className="p-3">
                              <div className="w-full h-px" />
                            </div>

                            {/* Resultado-chave */}
                            <div
                              className="p-3 cursor-text"
                              onDoubleClick={() => startInlineEdit(kr.id, 'title', kr.title)}
                            >
                              {editingCell?.krId === kr.id && editingCell.field === 'title' ? (
                                <Input
                                  autoFocus
                                  value={editCellValue}
                                  onChange={e => setEditCellValue(e.target.value)}
                                  onBlur={commitInlineEdit}
                                  onKeyDown={e => e.key === 'Enter' && commitInlineEdit()}
                                  className="h-7 text-xs"
                                />
                              ) : (
                                <p className="text-xs leading-relaxed text-foreground">{kr.title}</p>
                              )}
                              {kr.support_team && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Users className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-[10px] text-muted-foreground">{kr.support_team}</span>
                                </div>
                              )}
                            </div>

                            {/* Indicador */}
                            <div
                              className="p-3 cursor-text"
                              onDoubleClick={() => startInlineEdit(kr.id, 'description', kr.description || '')}
                            >
                              {editingCell?.krId === kr.id && editingCell.field === 'description' ? (
                                <Input
                                  autoFocus
                                  value={editCellValue}
                                  onChange={e => setEditCellValue(e.target.value)}
                                  onBlur={commitInlineEdit}
                                  onKeyDown={e => e.key === 'Enter' && commitInlineEdit()}
                                  className="h-7 text-xs"
                                />
                              ) : (
                                <p className="text-xs text-muted-foreground leading-relaxed">{indicatorText}</p>
                              )}
                            </div>

                            {/* Meta */}
                            <div className="p-3 text-center">
                              <span className="text-xs font-bold tabular-nums text-foreground">{metaText}</span>
                            </div>

                            {/* Responsável */}
                            <div
                              className="p-3 cursor-text"
                              onDoubleClick={() => startInlineEdit(kr.id, 'responsible_name', kr.responsible_name || '')}
                            >
                              {editingCell?.krId === kr.id && editingCell.field === 'responsible_name' ? (
                                <Input
                                  autoFocus
                                  value={editCellValue}
                                  onChange={e => setEditCellValue(e.target.value)}
                                  onBlur={commitInlineEdit}
                                  onKeyDown={e => e.key === 'Enter' && commitInlineEdit()}
                                  className="h-7 text-xs"
                                />
                              ) : (
                                <p className="text-xs text-foreground truncate">{kr.responsible_name || '—'}</p>
                              )}
                            </div>

                            {/* Status */}
                            <div className="p-3 text-center">
                              {canManage ? (
                                <Select value={kr.activity_status} onValueChange={v => handleQuickStatusChange(kr.id, v)}>
                                  <SelectTrigger className={cn("h-6 text-[10px] font-semibold border gap-1 px-2 w-auto mx-auto rounded-full", st.badgeCls)}>
                                    <StIcon className="h-3 w-3 shrink-0" />
                                    <span className="hidden sm:inline">{st.label}</span>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(STATUSES).map(([k, v]) => (
                                      <SelectItem key={k} value={k}>
                                        <div className="flex items-center gap-2"><v.icon className={cn("h-3 w-3", v.color)} />{v.label}</div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant="outline" className={cn('text-[10px] gap-1 rounded-full', st.badgeCls)}>
                                  <StIcon className="h-3 w-3" />{st.label}
                                </Badge>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="p-3 flex justify-end">
                              {canManage && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/kr:opacity-100 transition-opacity">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => { setEditingKr(kr); setKrDialogOpen(true); }}>
                                      <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDuplicateKr(kr)}>
                                      <Copy className="h-3.5 w-3.5 mr-2" /> Duplicar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleQuickStatusChange(kr.id, 'finalizado')}>
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-500" /> Marcar como concluído
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm('Excluir resultado-chave?')) deleteKeyResult.mutateAsync(kr.id); }}>
                                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                          Nenhum resultado-chave cadastrado
                        </div>
                      )}

                      {/* Add KR inline */}
                      {canManage && (
                        <div className="border-t border-border/20 px-6 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setEditingKr({
                                objective_id: obj.id,
                                start_value: 0, target_value: 100, current_value: 0,
                                confidence_level: 70, unit: '%', status: 'on_track',
                                activity_status: 'a_iniciar',
                              });
                              setKrDialogOpen(true);
                            }}
                          >
                            <Plus className="h-3 w-3" /> Adicionar resultado-chave
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
            <div className="grid gap-2"><Label>Título do Objetivo</Label><Textarea value={editingObj.title || ''} onChange={e => setEditingObj(p => ({ ...p, title: e.target.value }))} rows={3} placeholder="Ex: Aumentar o uso e pertencimento tecnológico..." /></div>
            <div className="grid gap-2"><Label>Descrição (opcional)</Label><Textarea value={editingObj.description || ''} onChange={e => setEditingObj(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Responsável</Label><Input value={editingObj.responsible_name || ''} onChange={e => setEditingObj(p => ({ ...p, responsible_name: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Área</Label><Input value={editingObj.area || ''} onChange={e => setEditingObj(p => ({ ...p, area: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Indicador</Label><Input value={editingObj.indicator || ''} onChange={e => setEditingObj(p => ({ ...p, indicator: e.target.value }))} placeholder="Ex: % de satisfação" /></div>
              <div className="grid gap-2"><Label>Meta</Label><Input value={editingObj.target_label || ''} onChange={e => setEditingObj(p => ({ ...p, target_label: e.target.value }))} placeholder="Ex: 90%" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObjDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveObjective}>{editingObj.id ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resultado-Chave Dialog */}
      <Dialog open={krDialogOpen} onOpenChange={setKrDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingKr.id ? 'Editar Resultado-Chave' : 'Novo Resultado-Chave'}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2"><Label>Resultado-Chave</Label><Textarea value={editingKr.title || ''} onChange={e => setEditingKr(p => ({ ...p, title: e.target.value }))} rows={2} placeholder="Ex: Gestão da infraestrutura de TI..." /></div>
            <div className="grid gap-2"><Label>Indicador</Label><Input value={editingKr.description || ''} onChange={e => setEditingKr(p => ({ ...p, description: e.target.value }))} placeholder="Ex: % dos ativos com controle patrimonial" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2"><Label>Meta (valor)</Label><Input type="number" value={editingKr.target_value ?? 100} onChange={e => setEditingKr(p => ({ ...p, target_value: parseFloat(e.target.value) || 0 }))} /></div>
              <div className="grid gap-2"><Label>Unidade</Label><Input value={editingKr.unit || '%'} onChange={e => setEditingKr(p => ({ ...p, unit: e.target.value }))} placeholder="%, un, horas" /></div>
              <div className="grid gap-2"><Label>Valor Inicial</Label><Input type="number" value={editingKr.start_value ?? 0} onChange={e => setEditingKr(p => ({ ...p, start_value: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Responsável</Label><Input value={editingKr.responsible_name || ''} onChange={e => setEditingKr(p => ({ ...p, responsible_name: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Equipe de apoio</Label><Input value={editingKr.support_team || ''} onChange={e => setEditingKr(p => ({ ...p, support_team: e.target.value }))} placeholder="Ex: Infra, Suporte" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Status</Label><Select value={editingKr.activity_status || 'a_iniciar'} onValueChange={v => setEditingKr(p => ({ ...p, activity_status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUSES).map(([k, v]) => <SelectItem key={k} value={k}><div className="flex items-center gap-2"><v.icon className={cn("h-3 w-3", v.color)} />{v.label}</div></SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Área</Label><Input value={editingKr.area || ''} onChange={e => setEditingKr(p => ({ ...p, area: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Início</Label><Input type="date" value={editingKr.start_date || ''} onChange={e => setEditingKr(p => ({ ...p, start_date: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Final</Label><Input type="date" value={editingKr.end_date || ''} onChange={e => setEditingKr(p => ({ ...p, end_date: e.target.value }))} /></div>
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-primary" />Vincular a KPI</Label>
              <Select value={editingKr.kpi_id || '__none__'} onValueChange={v => setEditingKr(p => ({ ...p, kpi_id: v === '__none__' ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum (manual)</SelectItem>
                  {kpis.filter(k => k.is_active).map(k => (
                    <SelectItem key={k.id} value={k.id}><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: k.color }} />{k.name} ({k.unit})</span></SelectItem>
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
    </div>
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

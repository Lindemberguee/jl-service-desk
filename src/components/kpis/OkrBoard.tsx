import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useOkrs, type OkrCycle, type OkrObjective, type OkrKeyResult } from '@/hooks/useOkrs';
import { useKpis } from '@/hooks/useKpis';
import { OkrReportExport } from '@/components/kpis/OkrReportExport';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Plus, Target, Pencil, Trash2, BarChart3,
  ChevronRight, AlertTriangle, CheckCircle2, Clock, Play, Pause, Timer,
  Search, MoreHorizontal, Copy, Filter, TrendingUp, Zap, ExternalLink
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
  fora_do_prazo:         { label: 'Fora do Prazo',       color: 'text-red-500',          icon: AlertTriangle, cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  atrasado:              { label: 'Fora do Prazo',       color: 'text-red-500',          icon: AlertTriangle, cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  finalizado:            { label: 'Concluído',           color: 'text-emerald-600',      icon: CheckCircle2, cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  finalizado_com_atraso: { label: 'Concluído c/ atraso', color: 'text-orange-500',       icon: Timer,        cls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  pausado:               { label: 'Pausado',             color: 'text-muted-foreground', icon: Pause,        cls: 'bg-muted/60 text-muted-foreground border-border' },
  cancelado:             { label: 'Cancelado',           color: 'text-muted-foreground', icon: Trash2,       cls: 'bg-muted/60 text-muted-foreground border-border line-through' },
};

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

function fmtDate(d: string | null) {
  if (!d) return '—';
  return format(parseISO(d), 'dd/MM/yy', { locale: ptBR });
}

/* ───────── Inline editable cell ───────── */

function InlineCell({
  value,
  field,
  krId,
  canManage,
  onSave,
  type = 'text',
  className: cls,
}: {
  value: string;
  field: string;
  krId: string;
  canManage: boolean;
  onSave: (krId: string, field: string, value: string) => void;
  type?: 'text' | 'date';
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  useEffect(() => { setVal(value); }, [value]);

  const commit = () => {
    setEditing(false);
    if (val !== value) onSave(krId, field, val);
  };

  if (!canManage) {
    return <span className={cn("text-xs text-muted-foreground truncate block", cls)}>{type === 'date' ? fmtDate(value || null) : (value || '—')}</span>;
  }

  if (editing) {
    return (
      <Input
        ref={ref}
        type={type}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value); setEditing(false); } }}
        className="h-6 text-xs px-1.5 py-0 border-primary/40 bg-background"
      />
    );
  }

  return (
    <span
      className={cn(
        "text-xs text-muted-foreground truncate block cursor-text rounded px-1 -mx-1 hover:bg-accent/40 hover:text-foreground transition-colors",
        cls
      )}
      onClick={e => { e.stopPropagation(); setEditing(true); }}
      title="Clique para editar"
    >
      {type === 'date' ? fmtDate(value || null) : (value || '—')}
    </span>
  );
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
  const canManage = !!(currentRole && hasPermission(currentRole, 'kpis:manage', undefined, rolePermissions));

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
  const [editingKrKpiIds, setEditingKrKpiIds] = useState<string[]>([]);
  const [expandedObjs, setExpandedObjs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedKrs, setSelectedKrs] = useState<Set<string>>(new Set());
  const [detailObjective, setDetailObjective] = useState<OkrObjective | null>(null);
  const [detailActivities, setDetailActivities] = useState<OkrKeyResult[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [expandedMacros, setExpandedMacros] = useState<Set<string>>(new Set());

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
      const macros = new Set(cycleObjectives.map(o => o.macro_objective || ''));
      setExpandedMacros(macros);
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

  /* ── Table data grouped by macro_objective ── */
  const tableData = useMemo(() => {
    const items = cycleObjectives.map(obj => {
      let krs = keyResults.filter(kr => kr.objective_id === obj.id);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const objMatch = obj.title.toLowerCase().includes(q) || obj.macro_objective?.toLowerCase().includes(q);
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

    // Group by macro_objective
    const groups: { macro: string; items: typeof items }[] = [];
    const macroMap = new Map<string, typeof items>();
    for (const item of items) {
      const macro = item.objective.macro_objective || '';
      if (!macroMap.has(macro)) macroMap.set(macro, []);
      macroMap.get(macro)!.push(item);
    }
    for (const [macro, groupItems] of macroMap) {
      groups.push({ macro, items: groupItems });
    }
    return groups;
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
  const toggleMacro = (macro: string) => setExpandedMacros(prev => { const n = new Set(prev); n.has(macro) ? n.delete(macro) : n.add(macro); return n; });

  const handleInlineSave = async (krId: string, field: string, value: string) => {
    try {
      await updateKeyResult.mutateAsync({ id: krId, [field]: value || null } as any);
    } catch { toast.error('Erro ao salvar'); }
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
    if (!editingObj.title?.trim()) return toast.error('Objetivo obrigatório');
    try {
      if (editingObj.id) {
        await updateObjective.mutateAsync({ id: editingObj.id, ...editingObj });
        toast.success('Objetivo salvo');
      } else {
        const created = await createObjective.mutateAsync({ ...editingObj, cycle_id: cycleId });
        const validActivities = objActivities.filter(a => a.trim());
        for (const actTitle of validActivities) {
          const linkedKpiId = objKpiIds.length > 0 ? objKpiIds[0] : null;
          const linkedKpi = linkedKpiId ? kpis.find(k => k.id === linkedKpiId) : null;
          await createKeyResult.mutateAsync({
            objective_id: created.id,
            title: actTitle,
            start_value: 0,
            target_value: linkedKpi ? linkedKpi.target_value : 100,
            current_value: 0,
            confidence_level: 70,
            unit: linkedKpi ? linkedKpi.unit : '%',
            status: 'on_track',
            activity_status: 'a_iniciar',
            responsible_name: editingObj.responsible_name || '',
            area: editingObj.area || '',
            start_date: objStartDate || null,
            end_date: objEndDate || null,
            kpi_id: linkedKpiId,
          } as any);
        }
        toast.success('Objetivo criado');
      }
      setObjDialogOpen(false);
    } catch { toast.error('Erro'); }
  };

  /* ── Real-time saving for Objective edits ── */
  const objSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedObj = useRef<string>('');

  const debouncedSaveObj = useCallback((obj: Partial<OkrObjective> & { id: string }) => {
    if (objSaveTimer.current) clearTimeout(objSaveTimer.current);
    const serialized = JSON.stringify(obj);
    if (serialized === lastSavedObj.current) return;
    objSaveTimer.current = setTimeout(async () => {
      try {
        lastSavedObj.current = serialized;
        await updateObjective.mutateAsync(obj);
      } catch { /* silent */ }
    }, 800);
  }, [updateObjective]);

  useEffect(() => {
    if (!editingObj.id || !objDialogOpen) return;
    const { id, ...rest } = editingObj;
    debouncedSaveObj({ id, ...rest } as any);
  }, [editingObj, objDialogOpen]);

  useEffect(() => () => { if (objSaveTimer.current) clearTimeout(objSaveTimer.current); }, []);

  /* ── Real-time saving for KR edits ── */
  const krSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedKr = useRef<string>('');

  const debouncedSaveKr = useCallback((kr: Partial<OkrKeyResult> & { id: string }) => {
    if (krSaveTimer.current) clearTimeout(krSaveTimer.current);
    const serialized = JSON.stringify(kr);
    if (serialized === lastSavedKr.current) return;
    krSaveTimer.current = setTimeout(async () => {
      try {
        lastSavedKr.current = serialized;
        await updateKeyResult.mutateAsync(kr);
      } catch { /* silent */ }
    }, 800);
  }, [updateKeyResult]);

  useEffect(() => {
    if (!editingKr.id || !krDialogOpen) return;
    const { id, ...rest } = editingKr;
    debouncedSaveKr({ id, ...rest, kpi_ids: editingKrKpiIds, kpi_id: editingKrKpiIds[0] || null } as any);
  }, [editingKr, editingKrKpiIds, krDialogOpen]);

  useEffect(() => () => { if (krSaveTimer.current) clearTimeout(krSaveTimer.current); }, []);

  const handleSaveKr = async () => {
    if (!editingKr.title?.trim()) return toast.error('Resultado-chave obrigatório');
    try {
      if (krSaveTimer.current) clearTimeout(krSaveTimer.current);
      const payload = { ...editingKr, kpi_ids: editingKrKpiIds, kpi_id: editingKrKpiIds[0] || null };
      if (editingKr.id) { await updateKeyResult.mutateAsync({ id: editingKr.id, ...payload } as any); } else { await createKeyResult.mutateAsync(payload as any); }
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
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight text-foreground">{activeCycle.name}</h2>
                  {canManage && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => { setEditingCycle(activeCycle); setCycleDialogOpen(true); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(activeCycle.starts_at), "dd MMM yyyy", { locale: ptBR })} — {format(parseISO(activeCycle.ends_at), "dd MMM yyyy", { locale: ptBR })}
                  <span className="mx-1.5 opacity-30">·</span>
                  <span className="font-medium text-foreground">{daysRemaining}</span> dias restantes
                </p>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {cycles.map(c => (
                  <Button key={c.id} variant={c.id === activeCycle?.id ? 'default' : 'ghost'} size="sm" onClick={() => setSelectedCycleId(c.id)} className="h-7 text-[11px] rounded-full px-3">
                    {c.name}
                  </Button>
                ))}
                {canManage && (
                  <Button variant="ghost" size="sm" onClick={() => { setEditingCycle({ type: 'annual', status: 'active' }); setCycleDialogOpen(true); }} className="h-7 text-[11px] rounded-full px-2.5 border border-dashed border-border">
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
                <OkrReportExport
                  cycles={cycles}
                  objectives={objectives}
                  keyResults={keyResults}
                  checkins={checkins}
                  kpis={kpis}
                  selectedCycleId={cycleId || null}
                  tenantName={undefined}
                />
              </div>
            </div>

            {/* Timeline */}
            <div className="relative">
              <Progress value={elapsedPct} className="h-1 rounded-full" />
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground tabular-nums">
                <span>{format(parseISO(activeCycle.starts_at), 'dd MMM', { locale: ptBR })}</span>
                <span className="font-medium text-foreground">{Math.round(elapsedPct)}% do período</span>
                <span>{format(parseISO(activeCycle.ends_at), 'dd MMM', { locale: ptBR })}</span>
              </div>
            </div>

            {/* ═══ CARDS DE MÉTRICAS ═══ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              <MetricCard icon={TrendingUp} label="Progresso Geral" value={`${stats.pct}%`} sub={<Progress value={stats.pct} className="h-1 mt-1.5" />} />
              <MetricCard icon={CheckCircle2} label="Concluídos" value={`${stats.done}`} sub={<span className="text-[10px] text-muted-foreground">de {stats.total} resultados</span>} />
              <MetricCard icon={Target} label="Objetivos" value={`${cycleObjectives.length}`} />
              <MetricCard icon={AlertTriangle} label="Em Atraso" value={`${stats.overdue}`} alert={stats.overdue > 0} />
            </div>
          </div>
        )}

        {/* ═══ TOOLBAR ═══ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 text-xs bg-muted/30 border-border/50" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-auto h-8 text-[11px] gap-1 border-border/50 bg-muted/30">
                <Filter className="h-3 w-3" /><SelectValue />
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
                <span className="text-[11px] text-muted-foreground">{selectedKrs.size} sel.</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-7 text-[11px] gap-1"><Zap className="h-3 w-3" />Ações</Button></DropdownMenuTrigger>
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
              <Button onClick={() => { setEditingObj({ priority: 'media', status: 'on_track', progress: 0, category: 'Operacional' }); setObjActivities(['']); setObjKpiIds([]); setObjStartDate(''); setObjEndDate(''); setObjDialogOpen(true); }} className="h-8 text-[11px] gap-1.5" size="sm">
                <Plus className="h-3.5 w-3.5" /> Novo Objetivo
              </Button>
            )}
          </div>
        </div>

        {/* ═══ EMPTY STATE ═══ */}
        {cycleObjectives.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border/60 bg-muted/10">
            <Target className="h-12 w-12 text-muted-foreground/20" />
            <h3 className="text-base font-semibold mt-4 text-foreground">Monte seu Plano de Ação</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              {!cycleId ? 'Crie um ciclo para começar a definir seus objetivos.' : 'Crie objetivos e defina resultados-chave.'}
            </p>
            {canManage && !cycleId && (
              <Button onClick={() => { setEditingCycle({ type: 'annual', status: 'active' }); setCycleDialogOpen(true); }} className="mt-4 gap-1.5" size="sm">
                <Plus className="h-3.5 w-3.5" /> Criar Ciclo
              </Button>
            )}
            {canManage && cycleId && (
              <Button onClick={() => { setEditingObj({ priority: 'media', status: 'on_track', progress: 0, category: 'Operacional' }); setObjActivities(['']); setObjKpiIds([]); setObjStartDate(''); setObjEndDate(''); setObjDialogOpen(true); }} className="mt-4 gap-1.5" size="sm">
                <Plus className="h-3.5 w-3.5" /> Criar primeiro objetivo
              </Button>
            )}
          </div>
        )}

        {/* ═══ BLOCOS POR OBJETIVO MACRO ═══ */}
        {tableData.length > 0 && (
          <div className="space-y-5">
            {tableData.map(({ macro, items: groupItems }) => {
              const macroExpanded = expandedMacros.has(macro);
              const macroAllKrs = groupItems.flatMap(g => g.keyResults);
              const macroDone = macroAllKrs.filter(kr => ['finalizado', 'finalizado_com_atraso'].includes(kr.activity_status)).length;
              const macroTotal = macroAllKrs.length;
              const macroProgress = groupItems.length > 0
                ? Math.round(groupItems.reduce((s, g) => s + (g.objective.progress || 0), 0) / groupItems.length)
                : 0;

              return (
                <div key={macro || '__no_macro__'} className="space-y-2">
                  {/* ── Macro Objective Header ── */}
                  {macro && (
                    <div
                      className="flex items-start gap-3 px-4 py-3 rounded-xl border border-primary/20 bg-primary/5 cursor-pointer select-none hover:bg-primary/10 transition-colors group/macro"
                      onClick={() => toggleMacro(macro)}
                    >
                      <ChevronRight className={cn("h-5 w-5 shrink-0 text-primary/60 mt-0.5 transition-transform duration-200", macroExpanded && "rotate-90")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground leading-snug">{macro}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {groupItems.length} resultado{groupItems.length !== 1 ? 's' : ''}-chave · {macroDone}/{macroTotal} atividades concluídas
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
                          <span className="text-sm font-bold tabular-nums text-foreground">{macroProgress}%</span>
                          <Progress value={macroProgress} className="h-1.5 w-14" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Objectives inside this macro ── */}
                  {(macroExpanded || !macro) && (
                    <div className={cn("space-y-2.5", macro && "ml-4")}>
                      {groupItems.map(({ objective: obj, keyResults: krs }) => {
              const isExpanded = expandedObjs.has(obj.id);
              const doneCount = krs.filter(kr => ['finalizado', 'finalizado_com_atraso'].includes(kr.activity_status)).length;
              const hasAtrasado = krs.some(kr => kr.activity_status === 'atrasado');
              const allDone = krs.length > 0 && krs.every(kr => ['finalizado', 'finalizado_com_atraso'].includes(kr.activity_status));
              const overallStatus = allDone ? 'finalizado' : hasAtrasado ? 'atrasado' : krs.some(kr => kr.activity_status === 'em_andamento') ? 'em_andamento' : 'a_iniciar';
              const st = STATUSES[overallStatus] || STATUSES.a_iniciar;
              const StIcon = st.icon;

              return (
                <div key={obj.id} className="rounded-lg border border-border/50 bg-card shadow-[0_1px_6px_0_hsl(var(--foreground)/0.03)] overflow-hidden">
                  {/* ── Header do Objetivo ── */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-accent/20 transition-colors group/obj"
                    onClick={() => toggleExpand(obj.id)}
                  >
                    <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-200", isExpanded && "rotate-90")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight">{obj.title}</p>
                      {obj.description && (
                        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-1">{obj.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <Badge variant="outline" className="text-[10px] tabular-nums font-medium h-5">{doneCount}/{krs.length}</Badge>
                      <div className="flex flex-col items-center gap-0.5 min-w-[48px]">
                        <span className="text-xs font-bold tabular-nums text-foreground">{Math.round(obj.progress)}%</span>
                        <Progress value={obj.progress} className="h-1 w-12" />
                      </div>
                      <Badge variant="outline" className={cn('text-[10px] gap-1 rounded-full font-medium whitespace-nowrap h-5', st.cls)}>
                        <StIcon className="h-2.5 w-2.5" />
                        <span className="hidden sm:inline">{st.label}</span>
                      </Badge>
                      <div onClick={e => e.stopPropagation()}>
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/obj:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetail(obj)}><Target className="h-3.5 w-3.5 mr-2" />Ver detalhes</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditingObj(obj); setObjDialogOpen(true); }}><Pencil className="h-3.5 w-3.5 mr-2" />Editar</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditingKr({ objective_id: obj.id, start_value: 0, target_value: 100, current_value: 0, confidence_level: 70, unit: '%', status: 'on_track', activity_status: 'a_iniciar' }); setEditingKrKpiIds([]); setKrDialogOpen(true); }}>
                                <Plus className="h-3.5 w-3.5 mr-2" />Adicionar atividade
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm('Excluir objetivo e todas as atividades?')) deleteObjective.mutateAsync(obj.id); }}><Trash2 className="h-3.5 w-3.5 mr-2" />Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Tabela de Atividades (KRs) ── */}
                  {isExpanded && krs.length > 0 && (
                    <div className="border-t border-border/30 overflow-x-auto">
                      {/* Header */}
                      <div className="grid grid-cols-[minmax(140px,2fr)_72px_56px_minmax(160px,3fr)_80px_80px_90px_72px_72px_72px_48px_36px] items-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 py-1.5 bg-muted/20 min-w-[1100px] border-b border-border/20">
                        <div className="px-1">Indicador</div>
                        <div className="px-1 text-center">Status</div>
                        <div className="px-1 text-center">Meta</div>
                        <div className="px-1">Descrição Atividade</div>
                        <div className="px-1">Área</div>
                        <div className="px-1">Responsável</div>
                        <div className="px-1">Eq. Apoio</div>
                        <div className="px-1 text-center">Início</div>
                        <div className="px-1 text-center">Final</div>
                        <div className="px-1 text-center">Entrega</div>
                        <div className="px-1 text-center">Link</div>
                        <div />
                      </div>
                      {/* Rows */}
                      <div className="min-w-[1100px]">
                        {krs.map((kr, idx) => {
                          const pct = krProgress(kr);
                          const krSt = STATUSES[kr.activity_status] || STATUSES.a_iniciar;
                          const KrIcon = krSt.icon;
                          const linkedKpiIds: string[] = (kr as any).kpi_ids || (kr.kpi_id ? [kr.kpi_id] : []);
                          const linkedKpiNames = linkedKpiIds.map(id => kpis.find(k => k.id === id)?.name).filter(Boolean).join(', ');
                          const krLinks: Array<{ label: string; url: string }> = kr.links || [];
                          const isLast = idx === krs.length - 1;

                          return (
                            <div
                              key={kr.id}
                              className={cn(
                                "grid grid-cols-[minmax(140px,2fr)_72px_56px_minmax(160px,3fr)_80px_80px_90px_72px_72px_72px_48px_36px] items-center px-3 py-1.5 hover:bg-accent/15 transition-colors group/kr",
                                !isLast && "border-b border-border/15"
                              )}
                            >
                              {/* Indicador */}
                              <div className="px-1 min-w-0">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-[11px] text-muted-foreground truncate">{linkedKpiNames || '—'}</p>
                                  </TooltipTrigger>
                                  {linkedKpiNames && <TooltipContent side="bottom"><p className="text-xs">{linkedKpiNames}</p></TooltipContent>}
                                </Tooltip>
                              </div>
                              {/* Status */}
                              <div className="px-1 flex justify-center" onClick={e => e.stopPropagation()}>
                                {canManage ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="inline-flex">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Badge variant="outline" className={cn('text-[9px] gap-0.5 rounded-full font-medium cursor-pointer h-5 px-1.5', krSt.cls)}>
                                              <KrIcon className="h-2.5 w-2.5" />
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent><p className="text-xs">{krSt.label}</p></TooltipContent>
                                        </Tooltip>
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="center">
                                      {Object.entries(STATUSES).map(([k, v]) => (
                                        <DropdownMenuItem key={k} onClick={() => handleQuickStatusChange(kr.id, k)}>
                                          <v.icon className={cn("h-3.5 w-3.5 mr-2", v.color)} />{v.label}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : (
                                  <Badge variant="outline" className={cn('text-[9px] gap-0.5 rounded-full font-medium h-5 px-1.5', krSt.cls)}>
                                    <KrIcon className="h-2.5 w-2.5" />
                                  </Badge>
                                )}
                              </div>
                              {/* Meta */}
                              <div className="px-1 text-center">
                                <span className={cn("text-[11px] font-bold tabular-nums", pct >= 100 ? 'text-emerald-600' : pct >= 70 ? 'text-foreground' : 'text-muted-foreground')}>{pct}%</span>
                              </div>
                              {/* Descrição Atividade */}
                              <div className="px-1 min-w-0 cursor-pointer" onClick={() => openDetail(obj)}>
                                <p className="text-xs font-medium text-foreground truncate hover:text-primary transition-colors">{kr.title}</p>
                              </div>
                              {/* Área */}
                              <div className="px-1 min-w-0" onClick={e => e.stopPropagation()}>
                                <InlineCell value={kr.area || ''} field="area" krId={kr.id} canManage={canManage} onSave={handleInlineSave} />
                              </div>
                              {/* Responsável */}
                              <div className="px-1 min-w-0" onClick={e => e.stopPropagation()}>
                                <InlineCell value={kr.responsible_name || ''} field="responsible_name" krId={kr.id} canManage={canManage} onSave={handleInlineSave} />
                              </div>
                              {/* Equipe de Apoio */}
                              <div className="px-1 min-w-0" onClick={e => e.stopPropagation()}>
                                <InlineCell value={kr.support_team || ''} field="support_team" krId={kr.id} canManage={canManage} onSave={handleInlineSave} />
                              </div>
                              {/* Início */}
                              <div className="px-1 text-center" onClick={e => e.stopPropagation()}>
                                <InlineCell value={kr.start_date || ''} field="start_date" krId={kr.id} canManage={canManage} onSave={handleInlineSave} type="date" className={cn("text-center mx-auto")} />
                              </div>
                              {/* Final */}
                              <div className="px-1 text-center" onClick={e => e.stopPropagation()}>
                                <InlineCell value={kr.end_date || ''} field="end_date" krId={kr.id} canManage={canManage} onSave={handleInlineSave} type="date" className={cn("text-center mx-auto", deadlineColor(kr.end_date))} />
                              </div>
                              {/* Entrega */}
                              <div className="px-1 text-center" onClick={e => e.stopPropagation()}>
                                <InlineCell value={kr.delivery_date || ''} field="delivery_date" krId={kr.id} canManage={canManage} onSave={handleInlineSave} type="date" className="text-center mx-auto" />
                              </div>
                              {/* Link */}
                              <div className="px-1 text-center" onClick={e => e.stopPropagation()}>
                                {krLinks.length > 0 ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a href={krLinks[0].url} target="_blank" rel="noopener noreferrer" className="inline-flex">
                                        <ExternalLink className="h-3.5 w-3.5 text-primary hover:text-primary/70 transition-colors" />
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent><p className="text-xs">{krLinks[0].label || krLinks[0].url}</p></TooltipContent>
                                  </Tooltip>
                                ) : <span className="text-[10px] text-muted-foreground/40">—</span>}
                              </div>
                              {/* Menu */}
                              <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                                {canManage && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/kr:opacity-100 transition-opacity">
                                        <MoreHorizontal className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => { setEditingKr(kr); setEditingKrKpiIds((kr as any).kpi_ids || (kr.kpi_id ? [kr.kpi_id] : [])); setKrDialogOpen(true); }}><Pencil className="h-3.5 w-3.5 mr-2" />Editar</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDuplicateKr(kr)}><Copy className="h-3.5 w-3.5 mr-2" />Duplicar</DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm('Excluir?')) deleteKeyResult.mutateAsync(kr.id); }}><Trash2 className="h-3.5 w-3.5 mr-2" />Excluir</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Add activity footer */}
                      {canManage && (
                        <div className="border-t border-border/20 px-3 py-1.5">
                          <Button
                            variant="ghost" size="sm"
                            className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-foreground px-2"
                            onClick={() => { setEditingKr({ objective_id: obj.id, start_value: 0, target_value: 100, current_value: 0, confidence_level: 70, unit: '%', status: 'on_track', activity_status: 'a_iniciar' }); setEditingKrKpiIds([]); setKrDialogOpen(true); }}
                          >
                            <Plus className="h-2.5 w-2.5" /> Adicionar atividade
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sem atividades */}
                  {isExpanded && krs.length === 0 && (
                    <div className="border-t border-border/30 px-4 py-5 text-center">
                      <p className="text-[11px] text-muted-foreground">Nenhuma atividade cadastrada.</p>
                      {canManage && (
                        <Button
                          variant="outline" size="sm" className="mt-2 text-[11px] gap-1 h-7"
                          onClick={() => { setEditingKr({ objective_id: obj.id, start_value: 0, target_value: 100, current_value: 0, confidence_level: 70, unit: '%', status: 'on_track', activity_status: 'a_iniciar' }); setEditingKrKpiIds([]); setKrDialogOpen(true); }}
                        >
                          <Plus className="h-3 w-3" /> Adicionar atividade
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ DIALOGS ═══ */}

        {/* Cycle Dialog */}
        <Dialog open={cycleDialogOpen} onOpenChange={setCycleDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCycle.id ? 'Editar Ciclo' : 'Novo Ciclo'}</DialogTitle>
              <DialogDescription className="text-xs">Defina o período e nome do ciclo de planejamento.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2"><Label className="text-xs">Nome</Label><Input value={editingCycle.name || ''} onChange={e => setEditingCycle(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Plano de Ação 2026" className="h-9" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label className="text-xs">Tipo</Label><Select value={editingCycle.type || 'annual'} onValueChange={v => setEditingCycle(p => ({ ...p, type: v }))}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{cycleTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-2"><Label className="text-xs">Status</Label><Select value={editingCycle.status || 'active'} onValueChange={v => setEditingCycle(p => ({ ...p, status: v }))}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Rascunho</SelectItem><SelectItem value="active">Ativo</SelectItem><SelectItem value="completed">Concluído</SelectItem><SelectItem value="cancelled">Cancelado</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label className="text-xs">Início</Label><Input type="date" value={editingCycle.starts_at || ''} onChange={e => setEditingCycle(p => ({ ...p, starts_at: e.target.value }))} className="h-9" /></div>
                <div className="grid gap-2"><Label className="text-xs">Fim</Label><Input type="date" value={editingCycle.ends_at || ''} onChange={e => setEditingCycle(p => ({ ...p, ends_at: e.target.value }))} className="h-9" /></div>
              </div>
            </div>
            <DialogFooter>
              {editingCycle.id && <Button variant="destructive" size="sm" className="mr-auto h-8 text-xs" onClick={() => { deleteCycle.mutateAsync(editingCycle.id!); setCycleDialogOpen(false); }}><Trash2 className="h-3 w-3 mr-1" />Excluir</Button>}
              <Button variant="outline" size="sm" className="h-8" onClick={() => setCycleDialogOpen(false)}>Cancelar</Button>
              <Button size="sm" className="h-8" onClick={handleSaveCycle}>{editingCycle.id ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Objective Dialog */}
        <Dialog open={objDialogOpen} onOpenChange={setObjDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingObj.id ? 'Editar Objetivo' : 'Novo Objetivo'}</DialogTitle>
              <DialogDescription className="text-xs">
                {editingObj.id ? 'Alterações são salvas automaticamente.' : 'Defina o objetivo, resultado-chave e atividades do plano.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              {/* Objetivo Macro */}
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Objetivo Macro</Label>
                <Textarea value={editingObj.macro_objective || ''} onChange={e => setEditingObj(p => ({ ...p, macro_objective: e.target.value }))} rows={2} placeholder="Ex: Aumentar o uso e pertencimento tecnológico e a infraestrutura digital..." className="text-sm resize-none" />
                <p className="text-[10px] text-muted-foreground">Agrupa vários resultados-chave sob um mesmo objetivo estratégico.</p>
              </div>

              {/* Resultado-Chave (título do objetivo) */}
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Resultado-Chave</Label>
                <Textarea value={editingObj.title || ''} onChange={e => setEditingObj(p => ({ ...p, title: e.target.value }))} rows={2} placeholder="Ex: Gestão da infraestrutura de TI: Monitoramento e manutenção..." className="text-sm resize-none" />
              </div>

              {/* Descrição */}
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Descrição (opcional)</Label>
                <Textarea value={editingObj.description || ''} onChange={e => setEditingObj(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Detalhes adicionais..." className="text-sm resize-none" />
              </div>

              {/* Indicadores */}
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5"><BarChart3 className="h-3 w-3 text-primary" />Indicadores</Label>
                <p className="text-[10px] text-muted-foreground -mt-0.5">Meta e unidade são herdadas automaticamente do indicador vinculado.</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto rounded-md border border-border/40 p-2">
                  {kpis.filter(k => k.is_active).map(k => (
                    <label key={k.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent/20 rounded px-1.5 py-1 transition-colors">
                      <Checkbox
                        checked={editingObj.id ? false : objKpiIds.includes(k.id)}
                        onCheckedChange={(checked) => {
                          if (editingObj.id) return;
                          setObjKpiIds(prev => checked ? [...prev, k.id] : prev.filter(id => id !== k.id));
                        }}
                        disabled={!!editingObj.id}
                      />
                      <span className="flex-1 truncate">{k.name}</span>
                      <span className="text-muted-foreground text-[10px] shrink-0">({k.unit}) Meta: {k.target_value}</span>
                    </label>
                  ))}
                  {kpis.filter(k => k.is_active).length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center py-2">Nenhum indicador cadastrado.</p>
                  )}
                </div>
              </div>

              {/* Atividades (criação) */}
              {!editingObj.id && (
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold">Atividades</Label>
                  <div className="space-y-1.5">
                    {objActivities.map((act, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <Input
                          value={act}
                          onChange={e => {
                            const updated = [...objActivities];
                            updated[idx] = e.target.value;
                            setObjActivities(updated);
                          }}
                          placeholder={`Atividade ${idx + 1}`}
                          className="h-8 text-xs"
                        />
                        {objActivities.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setObjActivities(prev => prev.filter((_, i) => i !== idx))}>
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-fit text-[10px] gap-1 h-6" onClick={() => setObjActivities(prev => [...prev, ''])}>
                      <Plus className="h-2.5 w-2.5" /> Mais atividade
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label className="text-xs">Área</Label><Input value={editingObj.area || ''} onChange={e => setEditingObj(p => ({ ...p, area: e.target.value }))} className="h-8 text-xs" /></div>
                <div className="grid gap-1.5"><Label className="text-xs">Responsável</Label><Input value={editingObj.responsible_name || ''} onChange={e => setEditingObj(p => ({ ...p, responsible_name: e.target.value }))} className="h-8 text-xs" /></div>
              </div>

              {!editingObj.id && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5"><Label className="text-xs">Início</Label><Input type="date" value={objStartDate} onChange={e => setObjStartDate(e.target.value)} className="h-8 text-xs" /></div>
                  <div className="grid gap-1.5"><Label className="text-xs">Final</Label><Input type="date" value={objEndDate} onChange={e => setObjEndDate(e.target.value)} className="h-8 text-xs" /></div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" className="h-8" onClick={() => setObjDialogOpen(false)}>Cancelar</Button>
              <Button size="sm" className="h-8" onClick={handleSaveObjective}>{editingObj.id ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* KR Dialog */}
        <Dialog open={krDialogOpen} onOpenChange={setKrDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">{editingKr.id ? 'Editar Resultado-Chave' : 'Nova Atividade'}</DialogTitle>
              <DialogDescription className="text-xs">
                {editingKr.id ? 'Alterações são salvas automaticamente.' : 'Defina a atividade e vincule a um indicador.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3.5">
              <div className="grid gap-1.5"><Label className="text-xs font-semibold">Descrição da Atividade</Label><Textarea value={editingKr.title || ''} onChange={e => setEditingKr(p => ({ ...p, title: e.target.value }))} rows={2} className="text-sm resize-none" /></div>

              {/* KPI link */}
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5"><BarChart3 className="h-3 w-3 text-primary" />Vincular Indicador</Label>
                <div className="space-y-1 max-h-28 overflow-y-auto rounded-md border border-border/40 p-2">
                  {kpis.filter(k => k.is_active).map(k => (
                    <label key={k.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent/20 rounded px-1.5 py-1 transition-colors">
                      <Checkbox
                        checked={editingKrKpiIds.includes(k.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const newIds = [...editingKrKpiIds, k.id];
                            setEditingKrKpiIds(newIds);
                            setEditingKr(p => ({ ...p, kpi_id: newIds[0], target_value: k.target_value, unit: k.unit }));
                          } else {
                            const newIds = editingKrKpiIds.filter(id => id !== k.id);
                            setEditingKrKpiIds(newIds);
                            const firstKpi = newIds.length > 0 ? kpis.find(kk => kk.id === newIds[0]) : null;
                            setEditingKr(p => ({ ...p, kpi_id: newIds[0] || null, target_value: firstKpi?.target_value ?? p.target_value, unit: firstKpi?.unit ?? p.unit }));
                          }
                        }}
                      />
                      <span className="flex-1 truncate">{k.name}</span>
                      <span className="text-muted-foreground text-[10px] shrink-0">({k.unit}) Meta: {k.target_value}</span>
                    </label>
                  ))}
                  {kpis.filter(k => k.is_active).length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center py-1">Nenhum indicador cadastrado.</p>
                  )}
                </div>
              </div>

              {/* Meta info or manual fields */}
              {(() => {
                const linkedKpis = editingKrKpiIds.map(id => kpis.find(k => k.id === id)).filter(Boolean);
                return linkedKpis.length > 0 ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-[11px] text-muted-foreground space-y-0.5">
                    <p className="font-medium text-foreground text-xs mb-0.5">Dados herdados:</p>
                    {linkedKpis.map(k => (
                      <p key={k!.id}>Meta: <span className="font-bold text-foreground">{k!.target_value} {k!.unit}</span> · {k!.direction === 'higher_is_better' ? '↑ Maior melhor' : k!.direction === 'lower_is_better' ? '↓ Menor melhor' : '⊙ Meta ideal'}</p>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="grid gap-1.5"><Label className="text-xs">Meta</Label><Input type="number" value={editingKr.target_value ?? 100} onChange={e => setEditingKr(p => ({ ...p, target_value: parseFloat(e.target.value) || 0 }))} className="h-8 text-xs" /></div>
                    <div className="grid gap-1.5"><Label className="text-xs">Unidade</Label><Input value={editingKr.unit || '%'} onChange={e => setEditingKr(p => ({ ...p, unit: e.target.value }))} className="h-8 text-xs" /></div>
                    <div className="grid gap-1.5"><Label className="text-xs">Valor Inicial</Label><Input type="number" value={editingKr.start_value ?? 0} onChange={e => setEditingKr(p => ({ ...p, start_value: parseFloat(e.target.value) || 0 }))} className="h-8 text-xs" /></div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-2.5">
                <div className="grid gap-1.5"><Label className="text-xs">Responsável</Label><Input value={editingKr.responsible_name || ''} onChange={e => setEditingKr(p => ({ ...p, responsible_name: e.target.value }))} className="h-8 text-xs" /></div>
                <div className="grid gap-1.5"><Label className="text-xs">Equipe de apoio</Label><Input value={editingKr.support_team || ''} onChange={e => setEditingKr(p => ({ ...p, support_team: e.target.value }))} placeholder="Infra, Suporte" className="h-8 text-xs" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="grid gap-1.5"><Label className="text-xs">Status</Label><Select value={editingKr.activity_status || 'a_iniciar'} onValueChange={v => setEditingKr(p => ({ ...p, activity_status: v }))}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUSES).map(([k, v]) => <SelectItem key={k} value={k}><div className="flex items-center gap-2"><v.icon className={cn("h-3 w-3", v.color)} />{v.label}</div></SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-1.5"><Label className="text-xs">Área</Label><Input value={editingKr.area || ''} onChange={e => setEditingKr(p => ({ ...p, area: e.target.value }))} className="h-8 text-xs" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="grid gap-1.5"><Label className="text-xs">Início</Label><Input type="date" value={editingKr.start_date || ''} onChange={e => setEditingKr(p => ({ ...p, start_date: e.target.value }))} className="h-8 text-xs" /></div>
                <div className="grid gap-1.5"><Label className="text-xs">Prazo</Label><Input type="date" value={editingKr.end_date || ''} onChange={e => setEditingKr(p => ({ ...p, end_date: e.target.value }))} className="h-8 text-xs" /></div>
              </div>
            </div>
            <DialogFooter>
              {editingKr.id && <Button variant="destructive" size="sm" className="mr-auto h-7 text-xs" onClick={() => { deleteKeyResult.mutateAsync(editingKr.id!); setKrDialogOpen(false); }}><Trash2 className="h-3 w-3 mr-1" />Excluir</Button>}
              <Button variant="outline" size="sm" className="h-7" onClick={() => setKrDialogOpen(false)}>Cancelar</Button>
              <Button size="sm" className="h-7" onClick={handleSaveKr}>{editingKr.id ? 'Salvar' : 'Criar'}</Button>
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
            setEditingKrKpiIds((activity as any).kpi_ids || (activity.kpi_id ? [activity.kpi_id] : []));
            setKrDialogOpen(true);
          }}
          canManage={canManage}
        />
      </div>
    </TooltipProvider>
  );
}

/* ── Sub-components ── */

function MetricCard({ icon: Icon, label, value, sub, alert }: { icon: React.ElementType; label: string; value: string; sub?: React.ReactNode; alert?: boolean }) {
  return (
    <div className={cn(
      "rounded-lg border bg-card p-3 space-y-0.5 shadow-[0_1px_3px_0_hsl(var(--foreground)/0.02)] transition-shadow hover:shadow-[0_2px_6px_0_hsl(var(--foreground)/0.05)]",
      alert && "border-red-500/30"
    )}>
      <div className="flex items-center gap-2">
        <div className={cn("h-7 w-7 rounded-md flex items-center justify-center", alert ? "bg-red-500/10" : "bg-primary/10")}>
          <Icon className={cn("h-3.5 w-3.5", alert ? "text-red-500" : "text-primary")} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
          <p className={cn("text-lg font-bold tracking-tight leading-tight", alert && "text-red-500")}>{value}</p>
        </div>
      </div>
      {sub && <div>{sub}</div>}
    </div>
  );
}

import { useState, useMemo, useEffect, useRef } from 'react';
import { useOkrs, type OkrCycle, type OkrObjective, type OkrKeyResult } from '@/hooks/useOkrs';
import { useKpis } from '@/hooks/useKpis';
import { ActivityDetailDialog } from '@/components/kpis/ActivityDetailDialog';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  Plus, Target, Calendar, Pencil, Trash2, TrendingUp, AlertTriangle,
  CheckCircle2, Clock, Play, Pause, Users, LayoutList, BarChart3,
  ChevronDown, ChevronRight, Eye, Timer, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays, endOfMonth, eachMonthOfInterval, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* ───────── Constants ───────── */

const cycleTypes = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semester', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
  { value: 'custom', label: 'Personalizado' },
];

const ACTIVITY_STATUSES: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  a_iniciar: { label: 'A Iniciar', color: 'text-sky-500', icon: Clock, bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
  em_andamento: { label: 'Em Andamento', color: 'text-amber-500', icon: Play, bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  no_prazo: { label: 'No Prazo', color: 'text-emerald-500', icon: CheckCircle2, bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  atrasado: { label: 'Atrasado', color: 'text-destructive', icon: AlertTriangle, bg: 'bg-destructive/10 text-destructive border-destructive/20' },
  finalizado: { label: 'Finalizado', color: 'text-primary', icon: CheckCircle2, bg: 'bg-primary/10 text-primary border-primary/20' },
  finalizado_com_atraso: { label: 'Finalizado c/ Atraso', color: 'text-orange-500', icon: Timer, bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  pausado: { label: 'Pausado', color: 'text-muted-foreground', icon: Pause, bg: 'bg-muted text-muted-foreground border-border' },
  cancelado: { label: 'Cancelado', color: 'text-muted-foreground', icon: Trash2, bg: 'bg-muted text-muted-foreground border-border' },
};

const OBJ_STATUSES: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  on_track: { label: 'No caminho', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: TrendingUp },
  at_risk: { label: 'Em risco', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: AlertTriangle },
  behind: { label: 'Atrasado', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertTriangle },
  completed: { label: 'Concluído', color: 'bg-primary/10 text-primary border-primary/20', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', color: 'bg-muted text-muted-foreground', icon: Target },
};

const PRIORITIES: Record<string, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
  media: { label: 'Média', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  alta: { label: 'Alta', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  critica: { label: 'Crítica', color: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const CAT_COLORS: Record<string, string> = {
  Operacional: 'hsl(var(--primary))',
  'Estratégico': 'hsl(var(--chart-2))',
  Financeiro: 'hsl(var(--chart-3))',
  Qualidade: 'hsl(var(--chart-4))',
  'Inovação': 'hsl(var(--chart-5))',
};

/* ───────── Helpers ───────── */

interface KrGroup {
  krTitle: string;
  indicator: string;
  meta: string;
  activities: OkrKeyResult[];
}

function groupByKr(activities: OkrKeyResult[], obj: OkrObjective): KrGroup[] {
  const map = new Map<string, KrGroup>();
  for (const a of activities) {
    const key = a.title;
    if (!map.has(key)) {
      // Use the first activity's unit/target as the KR-level indicator & meta
      // The "indicator" text comes from the objective level or the activity's unit description
      map.set(key, {
        krTitle: a.title,
        indicator: a.unit ? `${a.unit}` : obj.indicator || '',
        meta: `${a.target_value}${a.unit ? ` ${a.unit}` : ''}`,
        activities: [],
      });
    }
    map.get(key)!.activities.push(a);
  }
  return Array.from(map.values());
}

function deadlineInfo(a: OkrKeyResult) {
  if (!a.end_date) return null;
  const end = parseISO(a.end_date);
  const today = new Date();
  const days = differenceInDays(end, today);
  if (['finalizado', 'finalizado_com_atraso'].includes(a.activity_status)) return null;
  if (days < 0) return { text: `${Math.abs(days)}d atrasado`, urgent: true };
  if (days <= 7) return { text: `${days}d restantes`, urgent: days <= 3 };
  return null;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return format(parseISO(d), 'dd/MM/yy');
}

function matchesMonthFilter(kr: OkrKeyResult, filterMonth: string) {
  if (filterMonth === 'all') return true;
  const [y, m] = filterMonth.split('-').map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = endOfMonth(monthStart);
  const start = kr.start_date ? parseISO(kr.start_date) : null;
  const end = kr.end_date ? parseISO(kr.end_date) : null;
  if (start && end) return start <= monthEnd && end >= monthStart;
  if (start) return start <= monthEnd && start >= monthStart;
  if (end) return end >= monthStart && end <= monthEnd;
  return true;
}

/* ───────── Component ───────── */

export function OkrBoard() {
  const {
    cycles, objectives, keyResults, checkins,
    createCycle, updateCycle, deleteCycle,
    createObjective, updateObjective, deleteObjective,
    createKeyResult, updateKeyResult, deleteKeyResult,
    addCheckin, isLoading,
  } = useOkrs();
  const { kpis } = useKpis();
  const { currentRole, rolePermissions, user } = useAuth();
  const canManage = currentRole && hasPermission(currentRole, 'kpis:manage', undefined, rolePermissions);

  /* ── State ── */
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'plan' | 'board'>('plan');
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string> | null>(null);
  const [expandedKrs, setExpandedKrs] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterArea, setFilterArea] = useState('all');
  const [filterResponsible, setFilterResponsible] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');

  // Dialogs
  const [cycleDialogOpen, setCycleDialogOpen] = useState(false);
  const [objDialogOpen, setObjDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Partial<OkrCycle>>({});
  const [editingObj, setEditingObj] = useState<Partial<OkrObjective>>({});
  const [editingActivity, setEditingActivity] = useState<Partial<OkrKeyResult>>({});
  const [checkinKrId, setCheckinKrId] = useState<string | null>(null);
  const [checkinValue, setCheckinValue] = useState('');
  const [checkinNotes, setCheckinNotes] = useState('');
  const [checkinConfidence, setCheckinConfidence] = useState('70');
  const [detailActivity, setDetailActivity] = useState<OkrKeyResult | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  /* ── Derived ── */
  const activeCycle = selectedCycleId
    ? cycles.find(c => c.id === selectedCycleId)
    : cycles.find(c => c.status === 'active') || cycles[0];
  const cycleId = activeCycle?.id;
  const cycleObjectives = cycleId ? objectives.filter(o => o.cycle_id === cycleId) : [];

  const allAreas = useMemo(() => {
    const s = new Set<string>();
    cycleObjectives.forEach(o => { if (o.area) s.add(o.area); });
    keyResults.forEach(kr => { if (kr.area) s.add(kr.area); });
    return Array.from(s).sort();
  }, [cycleObjectives, keyResults]);

  const allResponsibles = useMemo(() => {
    const s = new Set<string>();
    keyResults.forEach(kr => { if (kr.responsible_name) s.add(kr.responsible_name); });
    return Array.from(s).sort();
  }, [keyResults]);

  // Auto-expand all objectives on first load
  if (expandedObjectives === null && cycleObjectives.length > 0) {
    setExpandedObjectives(new Set(cycleObjectives.map(o => o.id)));
  }
  const expanded = expandedObjectives ?? new Set<string>();

  const toggleObj = (id: string) => {
    setExpandedObjectives(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleKr = (key: string) => {
    setExpandedKrs(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  /* ── Stats ── */
  const allActivities = cycleObjectives.flatMap(o => keyResults.filter(kr => kr.objective_id === o.id));
  const stats = useMemo(() => {
    const total = allActivities.length;
    const finalizados = allActivities.filter(a => ['finalizado', 'finalizado_com_atraso'].includes(a.activity_status)).length;
    const atrasados = allActivities.filter(a => a.activity_status === 'atrasado').length;
    const emAndamento = allActivities.filter(a => ['em_andamento', 'no_prazo'].includes(a.activity_status)).length;
    const aIniciar = allActivities.filter(a => a.activity_status === 'a_iniciar').length;
    const pct = cycleObjectives.length > 0
      ? Math.round(cycleObjectives.reduce((s, o) => s + (o.progress || 0), 0) / cycleObjectives.length)
      : 0;
    return { total, finalizados, atrasados, emAndamento, aIniciar, pct };
  }, [allActivities, cycleObjectives]);

  const daysRemaining = activeCycle ? Math.max(0, differenceInDays(parseISO(activeCycle.ends_at), new Date())) : 0;
  const totalDays = activeCycle ? differenceInDays(parseISO(activeCycle.ends_at), parseISO(activeCycle.starts_at)) : 1;
  const elapsedPct = totalDays > 0 ? Math.min(((totalDays - daysRemaining) / totalDays) * 100, 100) : 0;

  /* ── Auto-detect overdue ── */
  const autoRan = useRef(false);
  useEffect(() => {
    if (isLoading || allActivities.length === 0 || autoRan.current) return;
    autoRan.current = true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    allActivities
      .filter(a => {
        if (!a.end_date) return false;
        const end = parseISO(a.end_date);
        end.setHours(0, 0, 0, 0);
        return end < today && !['finalizado', 'finalizado_com_atraso', 'cancelado', 'pausado', 'atrasado'].includes(a.activity_status);
      })
      .forEach(a => updateKeyResult.mutateAsync({ id: a.id, activity_status: 'atrasado' }).catch(() => {}));
  }, [isLoading, allActivities]);

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

  const handleSaveActivity = async () => {
    if (!editingActivity.title?.trim()) return toast.error('Descrição obrigatória');
    try {
      if (editingActivity.id) {
        await updateKeyResult.mutateAsync({ id: editingActivity.id, ...editingActivity });
        toast.success('Atividade atualizada');
      } else {
        await createKeyResult.mutateAsync(editingActivity);
        toast.success('Atividade criada');
      }
      setActivityDialogOpen(false);
    } catch { toast.error('Erro ao salvar atividade'); }
  };

  const handleCheckin = async () => {
    if (!checkinKrId || !checkinValue) return;
    try {
      await addCheckin.mutateAsync({
        key_result_id: checkinKrId,
        value: parseFloat(checkinValue),
        confidence_level: parseFloat(checkinConfidence),
        notes: checkinNotes || null,
        recorded_by: user?.id,
      });
      await updateKeyResult.mutateAsync({
        id: checkinKrId,
        current_value: parseFloat(checkinValue),
        confidence_level: parseFloat(checkinConfidence),
      });
      toast.success('Check-in registrado');
      setCheckinDialogOpen(false);
      setCheckinValue('');
      setCheckinNotes('');
    } catch { toast.error('Erro ao registrar check-in'); }
  };

  const handleQuickStatusChange = async (activityId: string, newStatus: string) => {
    try {
      const activity = keyResults.find(kr => kr.id === activityId);
      let finalStatus = newStatus;
      if (newStatus === 'finalizado' && activity?.end_date) {
        const end = parseISO(activity.end_date);
        end.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (today > end) finalStatus = 'finalizado_com_atraso';
      }
      const updates: any = { id: activityId, activity_status: finalStatus };
      if (['finalizado', 'finalizado_com_atraso'].includes(finalStatus) && activity) {
        updates.current_value = activity.target_value;
        updates.delivery_date = new Date().toISOString().split('T')[0];
      }
      await updateKeyResult.mutateAsync(updates);
      if (activity) {
        const objKrs = keyResults.filter(kr => kr.objective_id === activity.objective_id);
        const totalProgress = objKrs.reduce((sum, kr) => {
          const cv = kr.id === activityId && ['finalizado', 'finalizado_com_atraso'].includes(finalStatus)
            ? kr.target_value : kr.current_value;
          const range = kr.target_value - kr.start_value;
          if (range === 0) return sum;
          return sum + Math.max(0, Math.min(((cv - kr.start_value) / range) * 100, 100));
        }, 0);
        const avg = objKrs.length > 0 ? Math.round(totalProgress / objKrs.length) : 0;
        await updateObjective.mutateAsync({ id: activity.objective_id, progress: avg });
      }
      toast.success('Status atualizado');
    } catch { toast.error('Erro ao atualizar status'); }
  };

  /* ── Filter activities ── */
  const filterActivities = (activities: OkrKeyResult[]) =>
    activities
      .filter(kr => filterStatus === 'all' || kr.activity_status === filterStatus)
      .filter(kr => filterArea === 'all' || kr.area === filterArea)
      .filter(kr => filterResponsible === 'all' || kr.responsible_name === filterResponsible)
      .filter(kr => matchesMonthFilter(kr, filterMonth));

  /* ═══════════════════════ RENDER ═══════════════════════ */

  return (
    <TooltipProvider>
      <div className="space-y-5">

        {/* ── Cycle Selector ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {cycles.map(c => (
              <Button key={c.id} variant={c.id === activeCycle?.id ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCycleId(c.id)} className="gap-1.5 h-8 text-xs">
                <Calendar className="h-3 w-3" />
                {c.name}
              </Button>
            ))}
            {canManage && (
              <Button variant="outline" size="sm" onClick={() => { setEditingCycle({ type: 'quarterly', status: 'active' }); setCycleDialogOpen(true); }} className="gap-1.5 h-8 text-xs border-dashed">
                <Plus className="h-3 w-3" /> Ciclo
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant={viewMode === 'plan' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('plan')} className="gap-1 h-8 text-xs">
              <LayoutList className="h-3.5 w-3.5" /> Plano
            </Button>
            <Button variant={viewMode === 'board' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('board')} className="gap-1 h-8 text-xs">
              <BarChart3 className="h-3.5 w-3.5" /> Board
            </Button>
          </div>
        </div>

        {/* ── Stats Strip ── */}
        {activeCycle && (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            {/* Timeline */}
            <div className="sm:col-span-2 rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium flex items-center gap-1.5">
                  {canManage && (
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setEditingCycle(activeCycle); setCycleDialogOpen(true); }}>
                      <Pencil className="h-2.5 w-2.5" />
                    </Button>
                  )}
                  {activeCycle.name}
                </span>
                <span className="text-muted-foreground tabular-nums"><strong className="text-foreground">{daysRemaining}</strong> dias restantes</span>
              </div>
              <Progress value={elapsedPct} className="h-1.5" />
              <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                <span>{format(parseISO(activeCycle.starts_at), 'dd MMM yy', { locale: ptBR })}</span>
                <span>{Math.round(elapsedPct)}%</span>
                <span>{format(parseISO(activeCycle.ends_at), 'dd MMM yy', { locale: ptBR })}</span>
              </div>
            </div>
            {/* Progress */}
            <StatCard value={`${stats.pct}%`} label="Progresso" color={stats.pct >= 70 ? 'text-emerald-500' : stats.pct >= 40 ? 'text-amber-500' : 'text-muted-foreground'} />
            <StatCard value={stats.finalizados} label="Concluídos" color="text-emerald-500" />
            <StatCard value={stats.emAndamento} label="Em andamento" color="text-amber-500" />
            <StatCard value={`${stats.atrasados}`} label="Atrasados" color="text-destructive" />
          </div>
        )}

        {/* ── Month Filter ── */}
        {activeCycle && (() => {
          const months = eachMonthOfInterval({ start: parseISO(activeCycle.starts_at), end: parseISO(activeCycle.ends_at) });
          const labels = months.map(m => ({
            key: `${getYear(m)}-${String(getMonth(m) + 1).padStart(2, '0')}`,
            label: format(m, 'MMM', { locale: ptBR }).replace('.', ''),
            year: getYear(m),
          }));
          const multi = new Set(labels.map(l => l.year)).size > 1;
          return (
            <div className="flex items-center gap-1 flex-wrap">
              <Pill active={filterMonth === 'all'} onClick={() => setFilterMonth('all')}>Todos</Pill>
              {labels.map(m => (
                <Pill key={m.key} active={filterMonth === m.key} onClick={() => setFilterMonth(filterMonth === m.key ? 'all' : m.key)}>
                  {m.label}{multi ? ` ${String(m.year).slice(2)}` : ''}
                </Pill>
              ))}
            </div>
          );
        })()}

        {/* ── Filters + New Objective ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(ACTIVITY_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {allAreas.length > 0 && (
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Área" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas áreas</SelectItem>
                  {allAreas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {allResponsibles.length > 0 && (
              <Select value={filterResponsible} onValueChange={setFilterResponsible}>
                <SelectTrigger className="h-8 w-[160px] text-xs"><Users className="h-3 w-3 mr-1" /><SelectValue placeholder="Responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {allResponsibles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          {canManage && cycleId && (
            <Button onClick={() => { setEditingObj({ priority: 'media', status: 'on_track', progress: 0, category: 'Operacional' }); setObjDialogOpen(true); }} className="gap-1.5 h-8 text-xs" size="sm">
              <Plus className="h-3.5 w-3.5" /> Novo Objetivo
            </Button>
          )}
        </div>

        {/* ── Empty ── */}
        {cycleObjectives.length === 0 && !isLoading && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Target className="h-12 w-12 text-muted-foreground/30" />
              <h3 className="text-lg font-semibold mt-4">Monte seu Plano de Ação</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">Crie objetivos, defina resultados-chave e atividades com responsáveis e prazos.</p>
            </CardContent>
          </Card>
        )}

        {/* ══════════ PLAN VIEW ══════════ */}
        {viewMode === 'plan' && cycleObjectives.map(obj => {
          const allObjActivities = keyResults.filter(kr => kr.objective_id === obj.id);
          const filtered = filterActivities(allObjActivities);
          const groups = groupByKr(filtered, obj);
          const totalKrs = allObjActivities.length;
          const completedKrs = allObjActivities.filter(a => ['finalizado', 'finalizado_com_atraso'].includes(a.activity_status)).length;
          const objPct = Math.round(obj.progress);
          const Status = OBJ_STATUSES[obj.status] || OBJ_STATUSES.on_track;
          const isExp = expanded.has(obj.id);
          const catColor = CAT_COLORS[obj.category] || 'hsl(var(--primary))';

          return (
            <div key={obj.id} className="rounded-xl overflow-hidden shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] bg-card" style={{ borderLeft: `3px solid ${catColor}` }}>
              {/* ── Objective Header ── */}
              <div className={cn("flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-muted/20")} onClick={() => toggleObj(obj.id)}>
                <span className="text-muted-foreground shrink-0">
                  {isExp ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{obj.title}</h3>
                    <Badge variant="outline" className={cn('text-[9px] gap-1 h-5', Status.color)}>
                      <Status.icon className="h-2.5 w-2.5" /> {Status.label}
                    </Badge>
                    <Badge variant="outline" className={cn('text-[9px] h-5', PRIORITIES[obj.priority]?.color)}>
                      {PRIORITIES[obj.priority]?.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                    {obj.responsible_name && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{obj.responsible_name}</span>}
                    {obj.area && <span>📍 {obj.area}</span>}
                    {obj.indicator && <span>📊 {obj.indicator}</span>}
                    {obj.target_label && <span>🎯 {obj.target_label}</span>}
                    <span>{completedKrs}/{totalKrs} atividades</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={cn("text-lg font-bold tabular-nums", objPct >= 100 ? 'text-primary' : objPct >= 70 ? 'text-emerald-500' : 'text-foreground')}>{objPct}%</span>
                  <div className="w-20 hidden sm:block"><Progress value={objPct} className="h-1.5" /></div>
                </div>
              </div>

              {/* ── KR Groups ── */}
              {isExp && (
                <div className="border-t border-border/40">
                  {groups.length > 0 ? groups.map((group, gi) => {
                    const krKey = `${obj.id}-${group.krTitle}`;
                    const krExp = expandedKrs.has(krKey);
                    const groupCompleted = group.activities.filter(a => ['finalizado', 'finalizado_com_atraso'].includes(a.activity_status)).length;
                    const groupTotal = group.activities.length;
                    // Average progress of activities in this KR group
                    const groupPct = groupTotal > 0
                      ? Math.round(group.activities.reduce((s, a) => {
                          const range = a.target_value - a.start_value;
                          if (range === 0) return s;
                          return s + Math.max(0, Math.min(((a.current_value - a.start_value) / range) * 100, 100));
                        }, 0) / groupTotal)
                      : 0;

                    return (
                      <div key={gi} className={cn(gi > 0 && 'border-t border-border/30')}>
                        {/* KR Header */}
                        <div
                          className="flex items-center gap-3 px-4 py-2.5 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleKr(krKey)}
                        >
                          <span className="text-muted-foreground shrink-0">
                            {krExp ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </span>
                          <Target className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium leading-snug truncate">{group.krTitle}</p>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                              {group.indicator && <span>📊 {group.indicator}</span>}
                              <span>{groupCompleted}/{groupTotal} concluídas</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-semibold tabular-nums">{groupPct}%</span>
                            <div className="w-16 hidden sm:block"><Progress value={groupPct} className="h-1" /></div>
                          </div>
                        </div>

                        {/* Activities Table */}
                        {krExp && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-border/30 text-[10px] text-muted-foreground uppercase tracking-wider">
                                  <th className="text-left px-4 py-2 font-medium">Descrição da Atividade</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Responsável</th>
                                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap hidden lg:table-cell">Eq. Apoio</th>
                                  <th className="text-center px-3 py-2 font-medium whitespace-nowrap hidden md:table-cell">Início</th>
                                  <th className="text-center px-3 py-2 font-medium whitespace-nowrap">Final</th>
                                  <th className="text-center px-3 py-2 font-medium whitespace-nowrap hidden md:table-cell">Entrega</th>
                                  <th className="text-center px-3 py-2 font-medium">Status</th>
                                  <th className="text-center px-3 py-2 font-medium whitespace-nowrap hidden sm:table-cell">Link</th>
                                  {canManage && <th className="px-3 py-2 w-20" />}
                                </tr>
                              </thead>
                              <tbody>
                                {group.activities.map(activity => {
                                  const st = ACTIVITY_STATUSES[activity.activity_status] || ACTIVITY_STATUSES.a_iniciar;
                                  const StIcon = st.icon;
                                  const dl = deadlineInfo(activity);
                                  const links: Array<{ label: string; url: string }> = Array.isArray(activity.links) ? activity.links : [];

                                  return (
                                    <tr
                                      key={activity.id}
                                      className="group border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors"
                                    >
                                      {/* Descrição */}
                                      <td className="px-4 py-2.5 max-w-[300px]">
                                        <p className="font-medium leading-snug truncate" title={activity.description || activity.title}>
                                          {activity.description || '—'}
                                        </p>
                                      </td>
                                      {/* Responsável */}
                                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                                        {activity.responsible_name || '—'}
                                      </td>
                                      {/* Eq Apoio */}
                                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground hidden lg:table-cell">
                                        {activity.support_team || '—'}
                                      </td>
                                      {/* Início */}
                                      <td className="px-3 py-2.5 text-center tabular-nums text-muted-foreground whitespace-nowrap hidden md:table-cell">
                                        {fmtDate(activity.start_date)}
                                      </td>
                                      {/* Final */}
                                      <td className={cn("px-3 py-2.5 text-center tabular-nums whitespace-nowrap", dl?.urgent && 'text-destructive font-medium')}>
                                        {fmtDate(activity.end_date)}
                                        {dl && <span className="block text-[9px] mt-0.5">{dl.text}</span>}
                                      </td>
                                      {/* Entrega */}
                                      <td className="px-3 py-2.5 text-center tabular-nums text-muted-foreground whitespace-nowrap hidden md:table-cell">
                                        {fmtDate(activity.delivery_date)}
                                      </td>
                                      {/* Status */}
                                      <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                                        {canManage ? (
                                          <Select value={activity.activity_status} onValueChange={v => handleQuickStatusChange(activity.id, v)}>
                                            <SelectTrigger className={cn("h-6 text-[10px] font-semibold border gap-1 px-2 w-auto mx-auto", st.bg)}>
                                              <StIcon className="h-3 w-3" />
                                              <span className="hidden sm:inline">{st.label}</span>
                                            </SelectTrigger>
                                            <SelectContent>
                                              {Object.entries(ACTIVITY_STATUSES).map(([k, v]) => (
                                                <SelectItem key={k} value={k}>
                                                  <div className="flex items-center gap-2"><v.icon className={cn("h-3 w-3", v.color)} />{v.label}</div>
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <Badge variant="outline" className={cn('text-[10px] gap-1', st.bg)}>
                                            <StIcon className="h-3 w-3" />{st.label}
                                          </Badge>
                                        )}
                                      </td>
                                      {/* Links */}
                                      <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                                        {links.length > 0 ? (
                                          <div className="flex items-center justify-center gap-1">
                                            {links.map((link, i) => (
                                              <Tooltip key={i}>
                                                <TooltipTrigger asChild>
                                                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                  </a>
                                                </TooltipTrigger>
                                                <TooltipContent>{link.label}</TooltipContent>
                                              </Tooltip>
                                            ))}
                                          </div>
                                        ) : <span className="text-muted-foreground/40">—</span>}
                                      </td>
                                      {/* Actions */}
                                      {canManage && (
                                        <td className="px-3 py-2.5">
                                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                                                  setCheckinKrId(activity.id);
                                                  setCheckinValue(activity.current_value.toString());
                                                  setCheckinConfidence((activity.confidence_level ?? 70).toString());
                                                  setCheckinDialogOpen(true);
                                                }}>
                                                  <TrendingUp className="h-3 w-3" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Check-in</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingActivity(activity); setActivityDialogOpen(true); }}>
                                                  <Pencil className="h-3 w-3" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Editar</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteKeyResult.mutateAsync(activity.id)}>
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Excluir</TooltipContent>
                                            </Tooltip>
                                          </div>
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  }) : (
                    <p className="text-center py-8 text-sm text-muted-foreground">
                      Nenhuma atividade{filterStatus !== 'all' || filterArea !== 'all' || filterResponsible !== 'all' ? ' com os filtros selecionados' : ''}
                    </p>
                  )}

                  {/* Objective Footer */}
                  {canManage && (
                    <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border/30 bg-muted/10">
                      <Button variant="outline" size="sm" className="gap-1.5 h-7 text-[11px] border-dashed" onClick={() => {
                        setEditingActivity({
                          objective_id: obj.id,
                          start_value: 0, target_value: 100, current_value: 0,
                          confidence_level: 70, unit: '%', status: 'on_track',
                          activity_status: 'a_iniciar', area: obj.area || '', responsible_name: '',
                        });
                        setActivityDialogOpen(true);
                      }}>
                        <Plus className="h-3 w-3" /> Atividade
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-[11px]" onClick={() => { setEditingObj(obj); setObjDialogOpen(true); }}>
                        <Pencil className="h-3 w-3" /> Editar
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-[11px] text-destructive" onClick={() => deleteObjective.mutateAsync(obj.id)}>
                        <Trash2 className="h-3 w-3" /> Excluir
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* ══════════ BOARD VIEW ══════════ */}
        {viewMode === 'board' && (() => {
          const filtered = filterActivities(allActivities);
          const columns = [
            { key: 'a_iniciar', label: 'A Iniciar', match: (s: string) => s === 'a_iniciar' },
            { key: 'em_andamento', label: 'Em Andamento', match: (s: string) => ['em_andamento', 'no_prazo'].includes(s) },
            { key: 'atrasado', label: 'Atrasado', match: (s: string) => s === 'atrasado' },
            { key: 'finalizado', label: 'Finalizados', match: (s: string) => ['finalizado', 'finalizado_com_atraso'].includes(s) },
          ];
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {columns.map(col => {
                const items = filtered.filter(a => col.match(a.activity_status));
                const st = ACTIVITY_STATUSES[col.key];
                return (
                  <div key={col.key} className="space-y-2">
                    <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold", st.bg)}>
                      <st.icon className="h-3.5 w-3.5" />
                      {col.label}
                      <Badge variant="secondary" className="ml-auto h-5 text-[10px]">{items.length}</Badge>
                    </div>
                    {items.map(activity => {
                      const parentObj = objectives.find(o => o.id === activity.objective_id);
                      return (
                        <Card key={activity.id} className={cn("hover:shadow-md transition-shadow cursor-pointer", col.key === 'finalizado' && 'opacity-70 hover:opacity-100')} onClick={() => {
                          if (canManage) { setEditingActivity(activity); setActivityDialogOpen(true); }
                        }}>
                          <CardContent className="p-3 space-y-1.5">
                            <p className={cn("text-xs font-medium leading-tight", col.key === 'finalizado' && 'line-through')}>{activity.description || activity.title}</p>
                            {parentObj && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Target className="h-2.5 w-2.5" />{parentObj.title}</p>}
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              {activity.responsible_name && <span className="flex items-center gap-1"><Users className="h-2.5 w-2.5" />{activity.responsible_name}</span>}
                              {activity.end_date && <span className="tabular-nums">{fmtDate(activity.end_date)}</span>}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ══════════ DIALOGS ══════════ */}

        {/* Cycle */}
        <Dialog open={cycleDialogOpen} onOpenChange={setCycleDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editingCycle.id ? 'Editar Ciclo' : 'Novo Ciclo OKR'}</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input value={editingCycle.name || ''} onChange={e => setEditingCycle(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Plano de Ação 2026" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Tipo</Label>
                  <Select value={editingCycle.type || 'quarterly'} onValueChange={v => setEditingCycle(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{cycleTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={editingCycle.status || 'active'} onValueChange={v => setEditingCycle(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Início</Label>
                  <Input type="date" value={editingCycle.starts_at || ''} onChange={e => setEditingCycle(p => ({ ...p, starts_at: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Fim</Label>
                  <Input type="date" value={editingCycle.ends_at || ''} onChange={e => setEditingCycle(p => ({ ...p, ends_at: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCycleDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveCycle}>{editingCycle.id ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Objective */}
        <Dialog open={objDialogOpen} onOpenChange={setObjDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingObj.id ? 'Editar Objetivo' : 'Novo Objetivo'}</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Título do Objetivo</Label>
                <Input value={editingObj.title || ''} onChange={e => setEditingObj(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Aumentar a infraestrutura tecnológica" />
              </div>
              <div className="grid gap-2">
                <Label>Descrição</Label>
                <Textarea value={editingObj.description || ''} onChange={e => setEditingObj(p => ({ ...p, description: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Indicador</Label>
                  <Input value={editingObj.indicator || ''} onChange={e => setEditingObj(p => ({ ...p, indicator: e.target.value }))} placeholder="Ex: % dos ativos de TI com controle" />
                </div>
                <div className="grid gap-2">
                  <Label>Meta</Label>
                  <Input value={editingObj.target_label || ''} onChange={e => setEditingObj(p => ({ ...p, target_label: e.target.value }))} placeholder="Ex: 100%" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Responsável</Label>
                  <Input value={editingObj.responsible_name || ''} onChange={e => setEditingObj(p => ({ ...p, responsible_name: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Área</Label>
                  <Input value={editingObj.area || ''} onChange={e => setEditingObj(p => ({ ...p, area: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Categoria</Label>
                  <Select value={editingObj.category || 'Operacional'} onValueChange={v => setEditingObj(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.keys(CAT_COLORS).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Prioridade</Label>
                  <Select value={editingObj.priority || 'media'} onValueChange={v => setEditingObj(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PRIORITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={editingObj.status || 'on_track'} onValueChange={v => setEditingObj(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(OBJ_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setObjDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveObjective}>{editingObj.id ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Activity */}
        <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingActivity.id ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Resultado-Chave (título agrupador)</Label>
                <Input value={editingActivity.title || ''} onChange={e => setEditingActivity(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Gestão da infraestrutura de TI" />
              </div>
              <div className="grid gap-2">
                <Label>Descrição da Atividade</Label>
                <Textarea value={editingActivity.description || ''} onChange={e => setEditingActivity(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Ex: Correlacionar ativo ao colaborador/setor" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Responsável</Label>
                  <Input value={editingActivity.responsible_name || ''} onChange={e => setEditingActivity(p => ({ ...p, responsible_name: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Equipe de Apoio</Label>
                  <Input value={editingActivity.support_team || ''} onChange={e => setEditingActivity(p => ({ ...p, support_team: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Área</Label>
                  <Input value={editingActivity.area || ''} onChange={e => setEditingActivity(p => ({ ...p, area: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={editingActivity.activity_status || 'a_iniciar'} onValueChange={v => setEditingActivity(p => ({ ...p, activity_status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACTIVITY_STATUSES).map(([k, v]) => (
                        <SelectItem key={k} value={k}><div className="flex items-center gap-2"><v.icon className={cn("h-3 w-3", v.color)} />{v.label}</div></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label>Início</Label>
                  <Input type="date" value={editingActivity.start_date || ''} onChange={e => setEditingActivity(p => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Final</Label>
                  <Input type="date" value={editingActivity.end_date || ''} onChange={e => setEditingActivity(p => ({ ...p, end_date: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Entrega</Label>
                  <Input type="date" value={editingActivity.delivery_date || ''} onChange={e => setEditingActivity(p => ({ ...p, delivery_date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label>Valor Inicial</Label>
                  <Input type="number" value={editingActivity.start_value ?? 0} onChange={e => setEditingActivity(p => ({ ...p, start_value: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Meta</Label>
                  <Input type="number" value={editingActivity.target_value ?? 100} onChange={e => setEditingActivity(p => ({ ...p, target_value: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Unidade</Label>
                  <Input value={editingActivity.unit || '%'} onChange={e => setEditingActivity(p => ({ ...p, unit: e.target.value }))} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-primary" />Vincular a KPI</Label>
                <Select value={editingActivity.kpi_id || '__none__'} onValueChange={v => setEditingActivity(p => ({ ...p, kpi_id: v === '__none__' ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum (manual)</SelectItem>
                    {kpis.filter(k => k.is_active).map(k => (
                      <SelectItem key={k.id} value={k.id}>
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: k.color }} />
                          {k.name} ({k.unit})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActivityDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveActivity}>{editingActivity.id ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Check-in */}
        <Dialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Check-in de Progresso</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Valor Atual</Label>
                <Input type="number" value={checkinValue} onChange={e => setCheckinValue(e.target.value)} autoFocus />
              </div>
              <div className="grid gap-2">
                <Label>Confiança (%)</Label>
                <Input type="number" min={0} max={100} value={checkinConfidence} onChange={e => setCheckinConfidence(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Observação</Label>
                <Textarea value={checkinNotes} onChange={e => setCheckinNotes(e.target.value)} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCheckinDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCheckin}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Activity Detail Dialog */}
        <ActivityDetailDialog
          activity={detailActivity}
          objective={detailActivity ? objectives.find(o => o.id === detailActivity.objective_id) || null : null}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          canManage={!!canManage}
          onUpdateLinks={async (activityId, links) => {
            try {
              await updateKeyResult.mutateAsync({ id: activityId, links } as any);
              setDetailActivity(prev => prev ? { ...prev, links } as any : null);
              toast.success('Links atualizados');
            } catch { toast.error('Erro ao salvar links'); }
          }}
        />
      </div>
    </TooltipProvider>
  );
}

/* ── Sub-components ── */

function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border capitalize",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/40"
      )}
    >
      {children}
    </button>
  );
}

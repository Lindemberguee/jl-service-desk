import { useState, useMemo, useEffect, useRef } from 'react';
import { useOkrs, type OkrCycle, type OkrObjective, type OkrKeyResult } from '@/hooks/useOkrs';
import { useKpis } from '@/hooks/useKpis';
import { ActivityDetailDialog } from '@/components/kpis/ActivityDetailDialog';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Target, Calendar, Pencil, Trash2, TrendingUp, AlertTriangle,
  CheckCircle2, Clock, Play, Pause, Users, LayoutList, BarChart3,
  ChevronDown, ChevronRight, Eye, Flag, Timer
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays, isAfter, isBefore, endOfMonth, eachMonthOfInterval, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const cycleTypes = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semester', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
  { value: 'custom', label: 'Personalizado' },
];

const activityStatuses: Record<string, { label: string; color: string; icon: React.ElementType; bgClass: string }> = {
  a_iniciar: { label: 'A Iniciar', color: 'text-sky-500', icon: Clock, bgClass: 'bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400' },
  em_andamento: { label: 'Em Andamento', color: 'text-amber-500', icon: Play, bgClass: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' },
  no_prazo: { label: 'No Prazo', color: 'text-emerald-500', icon: CheckCircle2, bgClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' },
  atrasado: { label: 'Atrasado', color: 'text-destructive', icon: AlertTriangle, bgClass: 'bg-destructive/10 border-destructive/20 text-destructive' },
  finalizado: { label: 'Finalizado', color: 'text-primary', icon: CheckCircle2, bgClass: 'bg-primary/10 border-primary/20 text-primary' },
  finalizado_com_atraso: { label: 'Finalizado c/ Atraso', color: 'text-orange-500', icon: Timer, bgClass: 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400' },
  pausado: { label: 'Pausado', color: 'text-muted-foreground', icon: Pause, bgClass: 'bg-muted border-border text-muted-foreground' },
  cancelado: { label: 'Cancelado', color: 'text-muted-foreground', icon: Trash2, bgClass: 'bg-muted border-border text-muted-foreground' },
};

const objectiveStatuses: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  on_track: { label: 'No caminho', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: TrendingUp },
  at_risk: { label: 'Em risco', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: AlertTriangle },
  behind: { label: 'Atrasado', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertTriangle },
  completed: { label: 'Concluído', color: 'bg-primary/10 text-primary border-primary/20', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', color: 'bg-muted text-muted-foreground', icon: Target },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
  media: { label: 'Média', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  alta: { label: 'Alta', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  critica: { label: 'Crítica', color: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const categoryColors: Record<string, string> = {
  Operacional: 'hsl(var(--primary))',
  Estratégico: 'hsl(var(--chart-2))',
  Financeiro: 'hsl(var(--chart-3))',
  Qualidade: 'hsl(var(--chart-4))',
  Inovação: 'hsl(var(--chart-5))',
};

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

  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'plan' | 'board'>('plan');
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string> | null>(null);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [filterResponsible, setFilterResponsible] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');

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

  const activeCycle = selectedCycleId
    ? cycles.find(c => c.id === selectedCycleId)
    : cycles.find(c => c.status === 'active') || cycles[0];

  const cycleId = activeCycle?.id;
  const cycleObjectives = cycleId ? objectives.filter(o => o.cycle_id === cycleId) : [];

  // Collect all unique areas and responsibles
  const allAreas = useMemo(() => {
    const areas = new Set<string>();
    cycleObjectives.forEach(o => { if (o.area) areas.add(o.area); });
    keyResults.forEach(kr => { if (kr.area) areas.add(kr.area); });
    return Array.from(areas).sort();
  }, [cycleObjectives, keyResults]);

  const allResponsibles = useMemo(() => {
    const names = new Set<string>();
    keyResults.forEach(kr => { if (kr.responsible_name) names.add(kr.responsible_name); });
    return Array.from(names).sort();
  }, [keyResults]);

  // Initialize expanded objectives
  // Initialize expanded objectives only once
  if (expandedObjectives === null && cycleObjectives.length > 0) {
    setExpandedObjectives(new Set(cycleObjectives.map(o => o.id)));
  }

  const currentExpanded = expandedObjectives ?? new Set<string>();

  const toggleObjective = (id: string) => {
    setExpandedObjectives(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleActivity = (id: string) => {
    setExpandedActivities(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Stats
  const allActivities = cycleObjectives.flatMap(o => keyResults.filter(kr => kr.objective_id === o.id));
  const stats = useMemo(() => {
    const total = allActivities.length;
    const finalizados = allActivities.filter(a => a.activity_status === 'finalizado' || a.activity_status === 'finalizado_com_atraso').length;
    const atrasados = allActivities.filter(a => a.activity_status === 'atrasado').length;
    const emAndamento = allActivities.filter(a => a.activity_status === 'em_andamento' || a.activity_status === 'no_prazo').length;
    const aIniciar = allActivities.filter(a => a.activity_status === 'a_iniciar').length;
    // Use real progress from objectives (weighted by activity count)
    const pctConcluido = cycleObjectives.length > 0
      ? Math.round(cycleObjectives.reduce((sum, o) => sum + (o.progress || 0), 0) / cycleObjectives.length)
      : 0;
    return { total, finalizados, atrasados, emAndamento, aIniciar, pctConcluido };
  }, [allActivities, cycleObjectives]);

  const daysRemaining = activeCycle ? Math.max(0, differenceInDays(parseISO(activeCycle.ends_at), new Date())) : 0;
  const totalDays = activeCycle ? differenceInDays(parseISO(activeCycle.ends_at), parseISO(activeCycle.starts_at)) : 1;
  const elapsedPct = totalDays > 0 ? Math.min(((totalDays - daysRemaining) / totalDays) * 100, 100) : 0;

  // Auto-detect overdue activities and update status
  const autoStatusRan = useRef(false);
  useEffect(() => {
    if (isLoading || allActivities.length === 0 || autoStatusRan.current) return;
    autoStatusRan.current = true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueUpdates = allActivities.filter(a => {
      if (!a.end_date) return false;
      const endDate = parseISO(a.end_date);
      endDate.setHours(0, 0, 0, 0);
      // If past deadline and not in a terminal/paused status → mark atrasado
      if (endDate < today && !['finalizado', 'finalizado_com_atraso', 'cancelado', 'pausado', 'atrasado'].includes(a.activity_status)) {
        return true;
      }
      return false;
    });

    overdueUpdates.forEach(a => {
      updateKeyResult.mutateAsync({ id: a.id, activity_status: 'atrasado' }).catch(() => {});
    });
  }, [isLoading, allActivities]);

  // Auto-detect "finalizado com atraso" when marking as finalizado
  // (already handled in handleQuickStatusChange)

  // Handlers
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

      // Auto-detect "finalizado com atraso" when marking as finalizado past deadline
      if (newStatus === 'finalizado' && activity?.end_date) {
        const endDate = parseISO(activity.end_date);
        endDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (today > endDate) {
          finalStatus = 'finalizado_com_atraso';
        }
      }

      const updates: any = { id: activityId, activity_status: finalStatus };

      // When marking as finalizado, auto-complete the progress
      if ((finalStatus === 'finalizado' || finalStatus === 'finalizado_com_atraso') && activity) {
        updates.current_value = activity.target_value;
        updates.delivery_date = new Date().toISOString().split('T')[0];
      }

      await updateKeyResult.mutateAsync(updates);

      // Recalculate objective progress
      if (activity) {
        const objKrs = keyResults.filter(kr => kr.objective_id === activity.objective_id);
        const totalProgress = objKrs.reduce((sum, kr) => {
          const cv = kr.id === activityId && (finalStatus === 'finalizado' || finalStatus === 'finalizado_com_atraso')
            ? kr.target_value : kr.current_value;
          const range = kr.target_value - kr.start_value;
          if (range === 0) return sum;
          return sum + Math.max(0, Math.min(((cv - kr.start_value) / range) * 100, 100));
        }, 0);
        const avgProgress = objKrs.length > 0 ? Math.round(totalProgress / objKrs.length) : 0;
        await updateObjective.mutateAsync({ id: activity.objective_id, progress: avgProgress });
      }

      toast.success('Status atualizado');
    } catch { toast.error('Erro ao atualizar status'); }
  };

  const getActivityDeadlineInfo = (activity: OkrKeyResult) => {
    if (!activity.end_date) return null;
    const endDate = parseISO(activity.end_date);
    const today = new Date();
    const days = differenceInDays(endDate, today);
    if (activity.activity_status === 'finalizado' || activity.activity_status === 'finalizado_com_atraso') return null;
    if (days < 0) return { text: `${Math.abs(days)}d atrasado`, urgent: true };
    if (days <= 7) return { text: `${days}d restantes`, urgent: days <= 3 };
    return null;
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Cycle Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {cycles.map(c => (
              <Button
                key={c.id}
                variant={c.id === activeCycle?.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCycleId(c.id)}
                className="gap-2 h-8"
              >
                <Calendar className="h-3.5 w-3.5" />
                {c.name}
                <Badge variant="secondary" className="text-[9px] ml-1 h-4">
                  {cycleTypes.find(t => t.value === c.type)?.label}
                </Badge>
              </Button>
            ))}
            {canManage && (
              <Button variant="outline" size="sm" onClick={() => { setEditingCycle({ type: 'quarterly', status: 'active' }); setCycleDialogOpen(true); }} className="gap-2 h-8 border-dashed">
                <Plus className="h-3.5 w-3.5" />
                Novo Ciclo
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant={viewMode === 'plan' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('plan')} className="gap-1.5 h-8">
              <LayoutList className="h-3.5 w-3.5" />
              Plano
            </Button>
            <Button variant={viewMode === 'board' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('board')} className="gap-1.5 h-8">
              <BarChart3 className="h-3.5 w-3.5" />
              Board
            </Button>
          </div>
        </div>

        {/* Cycle Progress + Stats */}
        {activeCycle && (
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
            <Card className="lg:col-span-3">
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-sm">{activeCycle.name}</h3>
                    {canManage && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingCycle(activeCycle); setCycleDialogOpen(true); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Timer className="h-3.5 w-3.5" />
                    <span className="font-semibold text-foreground">{daysRemaining}</span> dias restantes
                  </div>
                </div>
                <Progress value={elapsedPct} className="h-2" />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>{format(parseISO(activeCycle.starts_at), "dd MMM yyyy", { locale: ptBR })}</span>
                  <span>{Math.round(elapsedPct)}% do tempo</span>
                  <span>{format(parseISO(activeCycle.ends_at), "dd MMM yyyy", { locale: ptBR })}</span>
                </div>
              </CardContent>
            </Card>

            {/* Stats mini-cards */}
            <Card className={cn("hover:shadow-md transition-shadow", stats.pctConcluido >= 100 && "ring-2 ring-primary/50")}>
              <CardContent className="py-4 text-center">
                <p className={cn("text-3xl font-bold", stats.pctConcluido >= 100 ? 'text-primary' : stats.pctConcluido >= 70 ? 'text-emerald-500' : stats.pctConcluido >= 40 ? 'text-amber-500' : 'text-muted-foreground')}>
                  {stats.pctConcluido}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Progresso Geral</p>
                <Progress value={stats.pctConcluido} className="h-1.5 mt-2" />
                {stats.pctConcluido >= 100 && (
                  <div className="flex items-center justify-center gap-1 mt-1.5 text-[9px] text-primary font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    Plano Concluído
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-xl font-bold text-emerald-500">{stats.finalizados}</p>
                    <p className="text-[9px] text-muted-foreground">Concluídos</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-amber-500">{stats.emAndamento}</p>
                    <p className="text-[9px] text-muted-foreground">Em andamento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-xl font-bold text-sky-500">{stats.aIniciar}</p>
                    <p className="text-[9px] text-muted-foreground">A iniciar</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-destructive">{stats.atrasados}</p>
                    <p className="text-[9px] text-muted-foreground">Atrasados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Month filter buttons */}
        {activeCycle && (() => {
          const months = eachMonthOfInterval({
            start: parseISO(activeCycle.starts_at),
            end: parseISO(activeCycle.ends_at),
          });
          const monthLabels = months.map(m => ({
            key: `${getYear(m)}-${String(getMonth(m) + 1).padStart(2, '0')}`,
            label: format(m, 'MMM', { locale: ptBR }).replace('.', ''),
            year: getYear(m),
          }));
          const showYear = new Set(monthLabels.map(m => m.year)).size > 1;
          return (
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setFilterMonth('all')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border",
                  filterMonth === 'all'
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/40"
                )}
              >
                Todos
              </button>
              {monthLabels.map(m => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setFilterMonth(filterMonth === m.key ? 'all' : m.key)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border capitalize",
                    filterMonth === m.key
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/40"
                  )}
                >
                  {m.label}{showYear ? ` ${String(m.year).slice(2)}` : ''}
                </button>
              ))}
            </div>
          );
        })()}

        {/* Filters + Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(activityStatuses).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {allAreas.length > 0 && (
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue placeholder="Área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as áreas</SelectItem>
                  {allAreas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {allResponsibles.length > 0 && (
              <Select value={filterResponsible} onValueChange={setFilterResponsible}>
                <SelectTrigger className="h-8 w-[170px] text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos responsáveis</SelectItem>
                  {allResponsibles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          {canManage && cycleId && (
            <Button onClick={() => { setEditingObj({ priority: 'media', status: 'on_track', progress: 0, category: 'Operacional' }); setObjDialogOpen(true); }} className="gap-2 h-8" size="sm">
              <Plus className="h-3.5 w-3.5" />
              Novo Objetivo
            </Button>
          )}
        </div>

        {/* Empty State */}
        {cycleObjectives.length === 0 && !isLoading && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-primary/5 animate-pulse" />
                <Target className="h-14 w-14 text-muted-foreground/30 relative" />
              </div>
              <h3 className="text-lg font-semibold mt-6">Monte seu Plano de Ação</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Crie objetivos estratégicos, defina atividades com responsáveis, prazos e acompanhe o progresso em equipe.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Plan View - Card-based */}
        {viewMode === 'plan' && cycleObjectives.map(obj => {
          const objActivities = keyResults
            .filter(kr => kr.objective_id === obj.id)
            .filter(kr => filterStatus === 'all' || kr.activity_status === filterStatus)
            .filter(kr => filterArea === 'all' || kr.area === filterArea)
            .filter(kr => filterResponsible === 'all' || kr.responsible_name === filterResponsible)
            .filter(kr => {
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
            });

          const totalActivities = keyResults.filter(kr => kr.objective_id === obj.id).length;
          const completedActivities = keyResults.filter(kr => kr.objective_id === obj.id && (kr.activity_status === 'finalizado' || kr.activity_status === 'finalizado_com_atraso')).length;
          const objPct = Math.round(obj.progress);
          const StatusInfo = objectiveStatuses[obj.status] || objectiveStatuses.on_track;
          const isExpanded = currentExpanded.has(obj.id);
          const catColor = categoryColors[obj.category] || 'hsl(var(--primary))';

          return (
            <div key={obj.id} className="rounded-xl overflow-hidden shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)]" style={{ borderLeft: `4px solid ${catColor}` }}>
              {/* Objective Header */}
              <div
                className={cn(
                  "flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors",
                  isExpanded ? 'bg-card' : 'bg-card hover:bg-muted/30'
                )}
                onClick={() => toggleObjective(obj.id)}
              >
                <button className="shrink-0 text-muted-foreground">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm leading-snug">{obj.title}</h3>
                    <Badge variant="outline" className={cn('text-[9px] gap-1 h-5', StatusInfo.color)}>
                      <StatusInfo.icon className="h-2.5 w-2.5" />
                      {StatusInfo.label}
                    </Badge>
                    <Badge variant="outline" className={cn('text-[9px] h-5', priorityConfig[obj.priority]?.color)}>
                      {priorityConfig[obj.priority]?.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-[11px] text-muted-foreground">
                    {obj.indicator && <span className="flex items-center gap-1">📊 {obj.indicator}</span>}
                    {obj.target_label && <span className="flex items-center gap-1">🎯 {obj.target_label}</span>}
                    {obj.responsible_name && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {obj.responsible_name}</span>}
                    {obj.area && <span>📍 {obj.area}</span>}
                    <span>{completedActivities}/{totalActivities} resultados-chave</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className={cn("text-lg font-bold tabular-nums", objPct >= 100 ? 'text-primary' : objPct >= 70 ? 'text-emerald-500' : 'text-foreground')}>
                      {objPct}%
                    </p>
                  </div>
                  <div className="w-24 hidden sm:block">
                    <Progress value={objPct} className="h-2" />
                  </div>
                </div>
              </div>

              {/* Key Results / Atividades */}
              {isExpanded && (
                <div className="border-t border-border/50">
                  {objActivities.length > 0 ? (
                    <div className="divide-y divide-border/40">
                      {objActivities.map(activity => {
                        const actStatus = activityStatuses[activity.activity_status] || activityStatuses.a_iniciar;
                        const ActIcon = actStatus.icon;
                        const deadlineInfo = getActivityDeadlineInfo(activity);
                        const krPct = activity.target_value - activity.start_value !== 0
                          ? Math.min(Math.max(((activity.current_value - activity.start_value) / (activity.target_value - activity.start_value)) * 100, 0), 100)
                          : 0;
                        const linkedKpi = activity.kpi_id ? kpis.find(k => k.id === activity.kpi_id) : null;
                        const actLinks: Array<{ label: string; url: string }> = Array.isArray(activity.links) ? activity.links : [];
                        const isActivityExpanded = expandedActivities.has(activity.id);

                        return (
                          <div
                            key={activity.id}
                            className="group hover:bg-muted/20 transition-colors"
                          >
                            <div className="flex items-stretch">
                              {/* Left accent bar */}
                              <div className={cn(
                                "w-1 shrink-0 transition-colors",
                                activity.activity_status === 'finalizado' || activity.activity_status === 'finalizado_com_atraso'
                                  ? 'bg-primary/40'
                                  : activity.activity_status === 'atrasado'
                                    ? 'bg-destructive/40'
                                    : 'bg-border/30 group-hover:bg-primary/30'
                              )} />

                              <div className="flex-1 min-w-0">
                                {/* Compact Row — always visible */}
                                <div
                                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                                  onClick={() => toggleActivity(activity.id)}
                                >
                                  <button className="shrink-0 text-muted-foreground">
                                    {isActivityExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                  </button>

                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-snug truncate">{activity.title}</p>
                                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                                      {activity.responsible_name && (
                                        <span className="flex items-center gap-1 truncate">
                                          <Users className="h-3 w-3 shrink-0" />
                                          {activity.responsible_name}
                                        </span>
                                      )}
                                      {activity.end_date && (
                                        <span className={cn("flex items-center gap-1 tabular-nums whitespace-nowrap", deadlineInfo?.urgent && 'text-destructive font-medium')}>
                                          <Calendar className="h-3 w-3 shrink-0" />
                                          {format(parseISO(activity.end_date), 'dd/MM/yy')}
                                          {deadlineInfo && <span className="text-[9px]">({deadlineInfo.text})</span>}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Status badge */}
                                  <div onClick={e => e.stopPropagation()} className="shrink-0">
                                    {canManage ? (
                                      <Select value={activity.activity_status} onValueChange={(v) => handleQuickStatusChange(activity.id, v)}>
                                        <SelectTrigger className={cn("h-7 text-[10px] font-semibold border gap-1 px-2.5 w-auto", actStatus.bgClass)}>
                                          <ActIcon className="h-3 w-3" />
                                          <span className="hidden sm:inline">{actStatus.label}</span>
                                        </SelectTrigger>
                                        <SelectContent>
                                          {Object.entries(activityStatuses).map(([k, v]) => (
                                            <SelectItem key={k} value={k}>
                                              <div className="flex items-center gap-2">
                                                <v.icon className={cn("h-3 w-3", v.color)} />
                                                {v.label}
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <Badge variant="outline" className={cn('text-[10px] gap-1 h-7', actStatus.bgClass)}>
                                        <ActIcon className="h-3 w-3" />
                                        {actStatus.label}
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Progress compact */}
                                  <div className="text-right shrink-0 w-20 hidden sm:block">
                                    <p className="text-xs font-bold tabular-nums">
                                      {Math.round(krPct)}%
                                    </p>
                                    <Progress value={krPct} className="h-1 mt-1" />
                                  </div>

                                  {/* Quick actions on hover */}
                                  {canManage && (
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                            setCheckinKrId(activity.id);
                                            setCheckinValue(activity.current_value.toString());
                                            setCheckinConfidence((activity.confidence_level ?? 70).toString());
                                            setCheckinDialogOpen(true);
                                          }}>
                                            <TrendingUp className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Check-in</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                            setEditingActivity(activity);
                                            setActivityDialogOpen(true);
                                          }}>
                                            <Pencil className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Editar</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteKeyResult.mutateAsync(activity.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Excluir</TooltipContent>
                                      </Tooltip>
                                    </div>
                                  )}
                                </div>

                                {/* Expanded Detail — shown on click */}
                                {isActivityExpanded && (
                                  <div className="px-4 pb-4 pt-1 ml-7 space-y-3 border-t border-border/30 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                                    {/* Description */}
                                    {activity.description && (
                                      <p className="text-xs text-muted-foreground leading-relaxed">{activity.description}</p>
                                    )}

                                    {/* Meta / Progress detail */}
                                    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Progresso da Meta</p>
                                        <Progress value={krPct} className="h-2" />
                                      </div>
                                      <div className="text-right shrink-0">
                                        <p className="text-lg font-bold tabular-nums">{activity.current_value}<span className="text-xs text-muted-foreground">/{activity.target_value}</span></p>
                                        <p className="text-[10px] text-muted-foreground">{activity.unit} • {Math.round(krPct)}%</p>
                                      </div>
                                    </div>

                                    {/* Metadata grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                                      <div className="space-y-0.5">
                                        <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">Indicador</p>
                                        {linkedKpi ? (
                                          <span className="inline-flex items-center gap-1.5">
                                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: linkedKpi.color || 'hsl(var(--primary))' }} />
                                            {linkedKpi.name}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">{obj.indicator || activity.unit}</span>
                                        )}
                                      </div>

                                      <div className="space-y-0.5">
                                        <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">Responsável</p>
                                        <span>{activity.responsible_name || '—'}</span>
                                      </div>

                                      <div className="space-y-0.5">
                                        <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">Área</p>
                                        <span>{activity.area || '—'}</span>
                                      </div>

                                      <div className="space-y-0.5">
                                        <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">Equipe de Apoio</p>
                                        <span>{activity.support_team || '—'}</span>
                                      </div>

                                      <div className="space-y-0.5">
                                        <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">Início</p>
                                        <span className="tabular-nums">{activity.start_date ? format(parseISO(activity.start_date), 'dd/MM/yyyy') : '—'}</span>
                                      </div>

                                      <div className="space-y-0.5">
                                        <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">Final</p>
                                        <span className={cn("tabular-nums", deadlineInfo?.urgent && 'text-destructive font-medium')}>
                                          {activity.end_date ? format(parseISO(activity.end_date), 'dd/MM/yyyy') : '—'}
                                        </span>
                                      </div>

                                      <div className="space-y-0.5">
                                        <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">Data de Entrega</p>
                                        <span className={cn("tabular-nums", activity.delivery_date ? 'font-medium' : 'text-muted-foreground')}>
                                          {activity.delivery_date ? format(parseISO(activity.delivery_date), 'dd/MM/yyyy') : '—'}
                                        </span>
                                      </div>

                                      <div className="space-y-0.5">
                                        <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">Meta</p>
                                        <span className="font-semibold">{activity.target_value} {activity.unit}</span>
                                      </div>
                                    </div>

                                    {/* Links */}
                                    {actLinks.length > 0 && (
                                      <div className="flex items-center gap-2 flex-wrap pt-1">
                                        {actLinks.map((link, i) => (
                                          <a
                                            key={i}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline bg-primary/5 rounded-md px-2.5 py-1 transition-colors hover:bg-primary/10"
                                          >
                                            <Eye className="h-3 w-3" />
                                            {link.label}
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      Nenhum resultado-chave{filterStatus !== 'all' || filterArea !== 'all' || filterResponsible !== 'all' ? ' com os filtros selecionados' : ''}
                    </div>
                  )}

                  {/* Actions footer */}
                  {canManage && (
                    <div className="flex items-center gap-2 px-5 py-3 border-t border-border/30 bg-muted/10">
                      <Button variant="outline" size="sm" className="gap-2 h-7 text-xs border-dashed" onClick={() => {
                        setEditingActivity({
                          objective_id: obj.id,
                          start_value: 0, target_value: 100, current_value: 0,
                          confidence_level: 70, unit: '%', status: 'on_track',
                          activity_status: 'a_iniciar', area: obj.area || '', responsible_name: '',
                        });
                        setActivityDialogOpen(true);
                      }}>
                        <Plus className="h-3 w-3" />
                        Resultado-Chave
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2 h-7 text-xs" onClick={() => { setEditingObj(obj); setObjDialogOpen(true); }}>
                        <Pencil className="h-3 w-3" />
                        Editar Objetivo
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2 h-7 text-xs text-destructive" onClick={() => deleteObjective.mutateAsync(obj.id)}>
                        <Trash2 className="h-3 w-3" />
                        Excluir
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Board View - Kanban by status */}
        {viewMode === 'board' && (() => {
          const filteredBoardActivities = allActivities
            .filter(kr => filterArea === 'all' || kr.area === filterArea)
            .filter(kr => filterResponsible === 'all' || kr.responsible_name === filterResponsible)
            .filter(kr => {
              if (filterMonth === 'all') return true;
              const [y, m] = filterMonth.split('-').map(Number);
              const monthStart = new Date(y, m - 1, 1);
              const mEnd = endOfMonth(monthStart);
              const start = kr.start_date ? parseISO(kr.start_date) : null;
              const end = kr.end_date ? parseISO(kr.end_date) : null;
              if (start && end) return start <= mEnd && end >= monthStart;
              if (start) return start <= mEnd && start >= monthStart;
              if (end) return end >= monthStart && end <= mEnd;
              return true;
            });
          return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(['a_iniciar', 'em_andamento', 'no_prazo', 'atrasado'] as const).map(status => {
              const statusInfo = activityStatuses[status];
              const StatusIcon = statusInfo.icon;
              const activities = filteredBoardActivities.filter(a => {
                if (status === 'em_andamento') return a.activity_status === 'em_andamento' || a.activity_status === 'no_prazo';
                if (status === 'no_prazo') return false; // merged with em_andamento
                return a.activity_status === status;
              });
              if (status === 'no_prazo') return null;

              return (
                <div key={status} className="space-y-2">
                  <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold", statusInfo.bgClass)}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    <span>{status === 'em_andamento' ? 'Em Andamento' : statusInfo.label}</span>
                    <Badge variant="secondary" className="ml-auto h-5 text-[10px]">{activities.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {activities.map(activity => {
                      const parentObj = objectives.find(o => o.id === activity.objective_id);
                      return (
                        <Card key={activity.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
                          if (canManage) {
                            setEditingActivity(activity);
                            setActivityDialogOpen(true);
                          }
                        }}>
                          <CardContent className="p-3 space-y-2">
                            <p className="text-sm font-medium leading-tight">{activity.title}</p>
                            {parentObj && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Target className="h-2.5 w-2.5" />
                                {parentObj.title}
                              </p>
                            )}
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              {activity.responsible_name && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-2.5 w-2.5" />
                                  {activity.responsible_name}
                                </span>
                              )}
                              {activity.end_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-2.5 w-2.5" />
                                  {format(parseISO(activity.end_date), 'dd/MM')}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {/* Finalizados column */}
            <div className="space-y-2">
              <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold", activityStatuses.finalizado.bgClass)}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Finalizados</span>
                <Badge variant="secondary" className="ml-auto h-5 text-[10px]">
                  {filteredBoardActivities.filter(a => a.activity_status === 'finalizado' || a.activity_status === 'finalizado_com_atraso').length}
                </Badge>
              </div>
              <div className="space-y-2">
                {filteredBoardActivities.filter(a => a.activity_status === 'finalizado' || a.activity_status === 'finalizado_com_atraso').map(activity => (
                  <Card key={activity.id} className="opacity-70 hover:opacity-100 transition-opacity">
                    <CardContent className="p-3">
                      <p className="text-sm font-medium line-through">{activity.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        {activity.responsible_name && <span>{activity.responsible_name}</span>}
                        {activity.activity_status === 'finalizado_com_atraso' && (
                          <Badge variant="outline" className="text-[8px] h-4 text-orange-500 border-orange-500/30">c/ atraso</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
          );
        })()}

        {/* ===== DIALOGS ===== */}

        {/* Cycle Dialog */}
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

        {/* Objective Dialog */}
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
                <Textarea value={editingObj.description || ''} onChange={e => setEditingObj(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Detalhe o objetivo..." />
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
                  <Input value={editingObj.responsible_name || ''} onChange={e => setEditingObj(p => ({ ...p, responsible_name: e.target.value }))} placeholder="Nome do responsável" />
                </div>
                <div className="grid gap-2">
                  <Label>Área</Label>
                  <Input value={editingObj.area || ''} onChange={e => setEditingObj(p => ({ ...p, area: e.target.value }))} placeholder="Ex: Inovação e Tech" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Categoria</Label>
                  <Select value={editingObj.category || 'Operacional'} onValueChange={v => setEditingObj(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(categoryColors).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Prioridade</Label>
                  <Select value={editingObj.priority || 'media'} onValueChange={v => setEditingObj(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={editingObj.status || 'on_track'} onValueChange={v => setEditingObj(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(objectiveStatuses).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
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

        {/* Activity Dialog */}
        <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingActivity.id ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Descrição da Atividade</Label>
                <Input value={editingActivity.title || ''} onChange={e => setEditingActivity(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Correlacionar ativo ao colaborador/setor" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Responsável</Label>
                  <Input value={editingActivity.responsible_name || ''} onChange={e => setEditingActivity(p => ({ ...p, responsible_name: e.target.value }))} placeholder="Nome" />
                </div>
                <div className="grid gap-2">
                  <Label>Equipe de Apoio</Label>
                  <Input value={editingActivity.support_team || ''} onChange={e => setEditingActivity(p => ({ ...p, support_team: e.target.value }))} placeholder="Ex: Comunicação" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Área</Label>
                  <Input value={editingActivity.area || ''} onChange={e => setEditingActivity(p => ({ ...p, area: e.target.value }))} placeholder="Ex: Jurídico" />
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={editingActivity.activity_status || 'a_iniciar'} onValueChange={v => setEditingActivity(p => ({ ...p, activity_status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(activityStatuses).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          <div className="flex items-center gap-2">
                            <v.icon className={cn("h-3 w-3", v.color)} />
                            {v.label}
                          </div>
                        </SelectItem>
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
                  <Label>Data Entrega</Label>
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
                <Label className="flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                  Vincular a Indicador (KPI)
                </Label>
                <Select
                  value={editingActivity.kpi_id || '__none__'}
                  onValueChange={v => setEditingActivity(p => ({ ...p, kpi_id: v === '__none__' ? null : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Nenhum (manual)" /></SelectTrigger>
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
                <p className="text-[10px] text-muted-foreground">
                  Ao vincular, o valor do KPI será sincronizado automaticamente com esta atividade.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActivityDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveActivity}>{editingActivity.id ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Check-in Dialog */}
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

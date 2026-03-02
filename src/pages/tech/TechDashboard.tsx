import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/lib/audit';
import { useAllTenantsQuery } from '@/hooks/useAllTenantsQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/lib/permissions';
import { SlaIndicator } from '@/components/SlaIndicator';
import { calculateSlaStatus, formatRemainingTime } from '@/lib/sla';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Play, Pause, Package, UserCheck, AlertTriangle,
  CheckCircle, ChevronRight, Zap, Building2, TrendingUp, Timer,
  Flame, Trophy, Clock, BarChart3, Target
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
};

/* ── Live Timer ── */
function LiveTimer({ startedAt, pausedAt, totalPausedMs }: { startedAt: string | null; pausedAt: string | null; totalPausedMs: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const paused = totalPausedMs || 0;

    if (pausedAt) {
      // Currently paused - show static time
      const pauseStart = new Date(pausedAt).getTime();
      setElapsed(pauseStart - start - paused);
      return;
    }

    const tick = () => setElapsed(Date.now() - start - paused);
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, pausedAt, totalPausedMs]);

  const hours = Math.floor(elapsed / 3600000);
  const mins = Math.floor((elapsed % 3600000) / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);

  return (
    <div className="flex items-center gap-1.5">
      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      <span className="font-mono text-lg font-bold tabular-nums tracking-wider">
        {String(hours).padStart(2, '0')}:{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
    </div>
  );
}

/* ── Heatmap Component ── */
function ActivityHeatmap({ workOrders }: { workOrders: any[] }) {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const heatData = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    const thirtyDaysAgo = Date.now() - 30 * 24 * 3600000;
    
    workOrders.forEach((wo: any) => {
      const d = new Date(wo.created_at);
      if (d.getTime() < thirtyDaysAgo) return;
      grid[d.getDay()][d.getHours()]++;
    });
    return grid;
  }, [workOrders]);

  const maxVal = Math.max(1, ...heatData.flat());

  return (
    <div className="space-y-1.5">
      <div className="flex gap-px">
        <div className="w-8" />
        {hours.filter((_, i) => i % 3 === 0).map(h => (
          <div key={h} className="flex-1 text-[9px] text-muted-foreground text-center font-mono">
            {String(h).padStart(2, '0')}
          </div>
        ))}
      </div>
      {days.map((day, di) => (
        <div key={day} className="flex items-center gap-px">
          <span className="w-8 text-[10px] text-muted-foreground font-medium shrink-0">{day}</span>
          <div className="flex gap-px flex-1">
            {hours.map(h => {
              const val = heatData[di][h];
              const intensity = val / maxVal;
              return (
                <Tooltip key={h}>
                  <TooltipTrigger asChild>
                    <div
                      className="flex-1 aspect-square rounded-[2px] min-w-[6px] transition-colors cursor-default"
                      style={{
                        backgroundColor: val === 0
                          ? 'hsl(var(--muted) / 0.3)'
                          : `hsl(var(--primary) / ${0.15 + intensity * 0.85})`,
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    {day} {String(h).padStart(2, '0')}h: {val} OS
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-end gap-1.5 mt-1">
        <span className="text-[9px] text-muted-foreground">Menos</span>
        {[0, 0.25, 0.5, 0.75, 1].map((opacity, i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-[2px]"
            style={{ backgroundColor: opacity === 0 ? 'hsl(var(--muted) / 0.3)' : `hsl(var(--primary) / ${0.15 + opacity * 0.85})` }}
          />
        ))}
        <span className="text-[9px] text-muted-foreground">Mais</span>
      </div>
    </div>
  );
}

/* ── Weekly Bar Chart ── */
function WeeklyChart({ workOrders }: { workOrders: any[] }) {
  const weekData = useMemo(() => {
    const now = new Date();
    const result: { label: string; done: number; received: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dayStr = day.toDateString();
      const label = day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      
      const done = workOrders.filter((wo: any) => {
        if (!wo.resolved_at) return false;
        return new Date(wo.resolved_at).toDateString() === dayStr;
      }).length;
      
      const received = workOrders.filter((wo: any) => {
        return new Date(wo.created_at).toDateString() === dayStr;
      }).length;
      
      result.push({ label, done, received });
    }
    return result;
  }, [workOrders]);

  const maxVal = Math.max(1, ...weekData.flatMap(d => [d.done, d.received]));

  return (
    <div className="flex items-end gap-1.5 h-28">
      {weekData.map((day, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="flex gap-px items-end flex-1 w-full">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex-1 rounded-t-sm bg-primary/30 transition-all hover:bg-primary/50 min-h-[2px]"
                  style={{ height: `${(day.received / maxVal) * 100}%` }}
                />
              </TooltipTrigger>
              <TooltipContent className="text-xs">{day.received} recebidas</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex-1 rounded-t-sm bg-emerald-500/60 transition-all hover:bg-emerald-500/80 min-h-[2px]"
                  style={{ height: `${(day.done / maxVal) * 100}%` }}
                />
              </TooltipTrigger>
              <TooltipContent className="text-xs">{day.done} concluídas</TooltipContent>
            </Tooltip>
          </div>
          <span className="text-[9px] text-muted-foreground font-medium capitalize">{day.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main Dashboard ── */
export default function TechDashboard() {
  const { profile, user, memberships, currentTenantId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: rawWorkOrders = [], isLoading } = useAllTenantsQuery<any>('work_orders_all', 'work_orders');
  const workOrders = rawWorkOrders.filter((wo: any) => !wo.deleted_at);
  const tenantMap = Object.fromEntries(memberships.map(m => [m.tenant_id, m.tenant_name || m.tenant_slug || '']));

  const myOs = workOrders.filter((wo: any) => wo.assigned_to_id === user?.id);
  const activeOs = myOs.filter((wo: any) => !['concluida', 'aprovada', 'encerrada'].includes(wo.status));
  const open = myOs.filter((wo: any) => ['aberta', 'reaberta'].includes(wo.status)).length;
  const inExec = myOs.filter((wo: any) => wo.status === 'em_execucao').length;
  const awaitPart = myOs.filter((wo: any) => wo.status === 'aguardando_peca').length;
  const awaitReq = myOs.filter((wo: any) => wo.status === 'aguardando_solicitante').length;
  const overdue = myOs.filter((wo: any) => {
    const sla = calculateSlaStatus(wo);
    return (sla.responseOverdue || sla.resolveOverdue) && !['concluida', 'aprovada', 'encerrada'].includes(wo.status);
  }).length;

  // Stats for periods
  const now = new Date();
  const todayStr = now.toDateString();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const doneToday = myOs.filter((wo: any) => wo.resolved_at && new Date(wo.resolved_at).toDateString() === todayStr).length;
  const doneWeek = myOs.filter((wo: any) => wo.resolved_at && new Date(wo.resolved_at) >= startOfWeek).length;
  const doneMonth = myOs.filter((wo: any) => wo.resolved_at && new Date(wo.resolved_at) >= startOfMonth).length;

  // Average resolution time (last 30 days, in hours)
  const avgResolutionTime = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 3600000;
    const resolved = myOs.filter((wo: any) => wo.resolved_at && wo.started_at && new Date(wo.resolved_at).getTime() > thirtyDaysAgo);
    if (resolved.length === 0) return null;
    const total = resolved.reduce((sum: number, wo: any) => {
      const start = new Date(wo.started_at).getTime();
      const end = new Date(wo.resolved_at).getTime();
      const paused = wo.total_paused_ms || 0;
      return sum + (end - start - paused);
    }, 0);
    return total / resolved.length / 3600000; // in hours
  }, [myOs]);

  // Streak - consecutive days with at least 1 resolution
  const streak = useMemo(() => {
    let count = 0;
    const d = new Date();
    for (let i = 0; i < 60; i++) {
      const dayStr = d.toDateString();
      const hasResolution = myOs.some((wo: any) => wo.resolved_at && new Date(wo.resolved_at).toDateString() === dayStr);
      if (i === 0 && !hasResolution) { d.setDate(d.getDate() - 1); continue; } // today may not have one yet
      if (!hasResolution && i > 0) break;
      if (hasResolution) count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [myOs]);

  const stats = [
    { label: 'Abertas', value: open, icon: ClipboardList, gradient: 'from-primary/15 to-primary/5', iconColor: 'text-primary', borderColor: 'border-primary/20' },
    { label: 'Em Execução', value: inExec, icon: Timer, gradient: 'from-amber-500/15 to-amber-500/5', iconColor: 'text-amber-500', borderColor: 'border-amber-500/20' },
    { label: 'Aguard. Peça', value: awaitPart, icon: Package, gradient: 'from-orange-500/15 to-orange-500/5', iconColor: 'text-orange-500', borderColor: 'border-orange-500/20' },
    { label: 'Aguard. Solic.', value: awaitReq, icon: UserCheck, gradient: 'from-yellow-500/15 to-yellow-500/5', iconColor: 'text-yellow-500', borderColor: 'border-yellow-500/20' },
    { label: 'Atrasadas', value: overdue, icon: AlertTriangle, gradient: 'from-destructive/15 to-destructive/5', iconColor: 'text-destructive', borderColor: 'border-destructive/20' },
    { label: 'Hoje', value: doneToday, icon: TrendingUp, gradient: 'from-emerald-500/15 to-emerald-500/5', iconColor: 'text-emerald-500', borderColor: 'border-emerald-500/20' },
  ];

  // Critical OS sorted by SLA
  const criticalOs = activeOs
    .map((wo: any) => ({ ...wo, _sla: calculateSlaStatus(wo) }))
    .sort((a: any, b: any) => {
      const aOv = a._sla.responseOverdue || a._sla.resolveOverdue ? 0 : 1;
      const bOv = b._sla.responseOverdue || b._sla.resolveOverdue ? 0 : 1;
      if (aOv !== bOv) return aOv - bOv;
      return (a._sla.resolveRemainingMs ?? Infinity) - (b._sla.resolveRemainingMs ?? Infinity);
    })
    .slice(0, 8);

  // Currently running OS (for the hero card)
  const runningOs = myOs.find((wo: any) => wo.status === 'em_execucao');

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, wo }: { id: string; status: string; wo: any }) => {
      const updates: any = { status };
      if (status === 'em_execucao' && !wo.started_at) updates.started_at = new Date().toISOString();
      if (status === 'concluida') updates.resolved_at = new Date().toISOString();
      const PAUSE_STATUSES = ['aguardando_peca', 'aguardando_solicitante', 'aguardando_terceiro'];
      if (PAUSE_STATUSES.includes(status) && !wo.paused_at) updates.paused_at = new Date().toISOString();
      if (!PAUSE_STATUSES.includes(status) && wo.paused_at) {
        updates.total_paused_ms = (wo.total_paused_ms || 0) + (Date.now() - new Date(wo.paused_at).getTime());
        updates.paused_at = null;
      }
      const { error } = await supabase.from('work_orders').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: async (_: any, vars: { id: string; status: string; wo: any }) => {
      await logAudit({ entity: 'work_order', entityId: vars.id, action: 'work_order.status_changed', tenantId: currentTenantId, diff: { from: vars.wo.status, to: vars.status } });
      qc.invalidateQueries({ queryKey: ['work_orders'] });
      qc.invalidateQueries({ queryKey: ['work_orders_all'] });
      toast({ title: 'Status atualizado!' });
    },
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5">
      {/* Hero greeting */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}, {profile?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Você tem <span className="font-semibold text-foreground">{activeOs.length}</span> OS ativas
          {overdue > 0 && (
            <span className="text-destructive font-semibold"> • {overdue} atrasada{overdue > 1 ? 's' : ''}</span>
          )}
        </p>
      </motion.div>

      {/* Running OS Hero Card with LIVE TIMER */}
      {runningOs && (
        <motion.div variants={itemVariants}>
          <Card
            className="border-primary/30 bg-gradient-to-br from-primary/8 to-primary/3 cursor-pointer group overflow-hidden relative"
            onClick={() => navigate(`/tech/os/${runningOs.id}`)}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-8 translate-x-8" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Em execução agora</span>
                </div>
                <LiveTimer
                  startedAt={runningOs.started_at}
                  pausedAt={runningOs.paused_at}
                  totalPausedMs={runningOs.total_paused_ms || 0}
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-muted-foreground">{runningOs.code}</p>
                  <p className="text-base font-semibold truncate mt-0.5">{runningOs.title}</p>
                  {memberships.length > 1 && (
                    <Badge variant="secondary" className="text-[9px] h-4 mt-1">
                      <Building2 className="h-2.5 w-2.5 mr-0.5" />{tenantMap[runningOs.tenant_id] || ''}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 text-xs gap-1.5 border-primary/30 hover:bg-primary/10"
                    onClick={() => statusMutation.mutate({ id: runningOs.id, status: 'aguardando_peca', wo: runningOs })}
                    disabled={statusMutation.isPending}
                  >
                    <Pause className="h-3.5 w-3.5" /> Pausar
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                    onClick={() => statusMutation.mutate({ id: runningOs.id, status: 'concluida', wo: runningOs })}
                    disabled={statusMutation.isPending}
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Concluir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={itemVariants}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Card className={`border ${stat.borderColor} shadow-none overflow-hidden relative group cursor-default`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <CardContent className="p-3 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                  <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <stat.icon className={`h-3.5 w-3.5 ${stat.iconColor}`} />
                  </div>
                </div>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <div className="text-2xl font-extrabold tabular-nums">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Performance Cards Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Card className="border-border/50 shadow-none">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Semana</span>
            </div>
            <div className="text-xl font-extrabold tabular-nums">{doneWeek}</div>
            <span className="text-[10px] text-muted-foreground">concluídas</span>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-none">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Mês</span>
            </div>
            <div className="text-xl font-extrabold tabular-nums">{doneMonth}</div>
            <span className="text-[10px] text-muted-foreground">concluídas</span>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-none">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Tempo Médio</span>
            </div>
            <div className="text-xl font-extrabold tabular-nums">
              {avgResolutionTime !== null ? `${avgResolutionTime.toFixed(1)}h` : '—'}
            </div>
            <span className="text-[10px] text-muted-foreground">resolução (30d)</span>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-none">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Sequência</span>
            </div>
            <div className="text-xl font-extrabold tabular-nums">{streak}</div>
            <span className="text-[10px] text-muted-foreground">dias consecutivos</span>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Weekly Production Chart */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Produção dos últimos 7 dias
            </CardTitle>
            <div className="flex gap-3 mt-1">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="w-2 h-2 rounded-sm bg-primary/30" /> Recebidas
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="w-2 h-2 rounded-sm bg-emerald-500/60" /> Concluídas
              </span>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            {isLoading ? <Skeleton className="h-28 w-full" /> : <WeeklyChart workOrders={myOs} />}
          </CardContent>
        </Card>

        {/* Activity Heatmap */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              Mapa de calor de atividade
              <Badge variant="secondary" className="text-[9px] h-4 ml-auto">30 dias</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {isLoading ? <Skeleton className="h-28 w-full" /> : <ActivityHeatmap workOrders={myOs} />}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick actions */}
      <motion.div variants={itemVariants} className="flex gap-2 flex-wrap">
        <Button size="sm" className="h-9 gap-1.5 shadow-md shadow-primary/10" onClick={() => navigate('/tech/os')}>
          <ClipboardList className="h-3.5 w-3.5" /> Ver Todas as OS
        </Button>
      </motion.div>

      {/* Critical OS */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-destructive/5 to-transparent">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-destructive" />
              </div>
              Próximas Críticas / SLA Urgente
              {criticalOs.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 ml-auto">{criticalOs.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
            ) : criticalOs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12 text-muted-foreground"
              >
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <p className="text-sm font-medium">Tudo em dia!</p>
                <p className="text-xs mt-1 text-muted-foreground">Nenhuma OS crítica no momento.</p>
              </motion.div>
            ) : (
              <div className="divide-y divide-border/50">
                {criticalOs.map((wo: any, index: number) => {
                  const isPaused = ['aguardando_peca', 'aguardando_solicitante', 'aguardando_terceiro'].includes(wo.status);
                  const isOpen = ['aberta', 'reaberta'].includes(wo.status);
                  const isRunning = wo.status === 'em_execucao';

                  return (
                    <motion.div
                      key={wo.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04, duration: 0.25 }}
                      className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer group transition-colors duration-150 hover:bg-accent/50 ${
                        (wo._sla.responseOverdue || wo._sla.resolveOverdue) ? 'bg-destructive/3' : ''
                      }`}
                      onClick={() => navigate(`/tech/os/${wo.id}`)}
                    >
                      <div className={`w-1 self-stretch rounded-full shrink-0 ${
                        wo.priority === 'critica' ? 'bg-destructive' :
                        wo.priority === 'alta' ? 'bg-orange-500' :
                        wo.priority === 'media' ? 'bg-amber-400' : 'bg-muted-foreground/30'
                      }`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="text-[11px] font-mono text-muted-foreground">{wo.code}</span>
                          {memberships.length > 1 && (
                            <Badge variant="secondary" className="text-[8px] h-3.5 px-1">
                              {tenantMap[wo.tenant_id] || ''}
                            </Badge>
                          )}
                          <Badge variant="outline" className={`text-[9px] h-4 ${statusColors[wo.status]}`}>
                            {statusLabels[wo.status]}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium truncate">{wo.title}</p>
                        {wo._sla.resolveRemainingMs !== null && (
                          <p className={`text-[11px] mt-0.5 flex items-center gap-1 ${
                            wo._sla.resolveOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'
                          }`}>
                            {wo._sla.resolveOverdue && <AlertTriangle className="h-3 w-3" />}
                            {wo._sla.resolveOverdue ? 'Atrasada ' : 'SLA: '}
                            {formatRemainingTime(wo._sla.resolveRemainingMs)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {isOpen && (
                          <Button size="sm" className="h-8 text-[11px] gap-1 shadow-sm" onClick={() => statusMutation.mutate({ id: wo.id, status: 'em_execucao', wo })} disabled={statusMutation.isPending}>
                            <Play className="h-3 w-3" /> Iniciar
                          </Button>
                        )}
                        {isRunning && (
                          <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1" onClick={() => statusMutation.mutate({ id: wo.id, status: 'aguardando_peca', wo })} disabled={statusMutation.isPending}>
                            <Pause className="h-3 w-3" /> Pausar
                          </Button>
                        )}
                        {isPaused && (
                          <Button size="sm" className="h-8 text-[11px] gap-1 shadow-sm" onClick={() => statusMutation.mutate({ id: wo.id, status: 'em_execucao', wo })} disabled={statusMutation.isPending}>
                            <Play className="h-3 w-3" /> Retomar
                          </Button>
                        )}
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

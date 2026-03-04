import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAllTenantsQuery } from '@/hooks/useAllTenantsQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/lib/permissions';
import { SlaIndicator } from '@/components/SlaIndicator';
import {
  ClipboardList, AlertTriangle, Clock, Zap, ChevronRight, Building2,
  TrendingUp, TrendingDown, CheckCircle2, Hourglass, BarChart3, Users,
  ArrowUpRight, ArrowDownRight, Timer, Activity, Target, Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, AreaChart, Area, Legend, RadialBarChart, RadialBar,
} from 'recharts';
import { format, subDays, startOfDay, parseISO, differenceInHours, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const STATUS_CHART_COLORS: Record<string, string> = {
  aberta: 'hsl(213, 94%, 38%)',
  triagem: 'hsl(262, 60%, 50%)',
  em_execucao: 'hsl(38, 92%, 50%)',
  aguardando_peca: 'hsl(25, 95%, 53%)',
  aguardando_solicitante: 'hsl(45, 93%, 47%)',
  aguardando_terceiro: 'hsl(45, 93%, 47%)',
  concluida: 'hsl(142, 71%, 38%)',
  aprovada: 'hsl(160, 60%, 45%)',
  encerrada: 'hsl(215, 14%, 46%)',
  reaberta: 'hsl(0, 72%, 45%)',
};

const PRIORITY_CHART_COLORS: Record<string, string> = {
  baixa: 'hsl(215, 14%, 46%)',
  media: 'hsl(213, 94%, 38%)',
  alta: 'hsl(25, 95%, 53%)',
  critica: 'hsl(0, 72%, 45%)',
};

export default function Dashboard() {
  const { profile, memberships } = useAuth();
  const navigate = useNavigate();
  const { data: rawWorkOrders = [], isLoading } = useAllTenantsQuery<any>('work_orders_all', 'work_orders');
  const workOrders = rawWorkOrders.filter((wo: any) => !wo.deleted_at);
  const tenantMap = Object.fromEntries(memberships.map(m => [m.tenant_id, m.tenant_name || m.tenant_slug || '']));

  // --- KPI calculations ---
  const activeWOs = workOrders.filter((wo: any) => !['encerrada', 'concluida', 'aprovada'].includes(wo.status));
  const open = activeWOs.filter((wo: any) => wo.status === 'aberta').length;
  const inProgress = activeWOs.filter((wo: any) => wo.status === 'em_execucao').length;
  const critical = activeWOs.filter((wo: any) => wo.priority === 'critica').length;
  const overdue = activeWOs.filter((wo: any) => wo.resolve_due_at && new Date(wo.resolve_due_at) < new Date()).length;
  const totalActive = activeWOs.length;
  const closedThisMonth = workOrders.filter((wo: any) => {
    if (!['concluida', 'aprovada', 'encerrada'].includes(wo.status)) return false;
    const d = new Date(wo.updated_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // --- Comparison with previous 7 days ---
  const now = new Date();
  const last7 = workOrders.filter((wo: any) => differenceInDays(now, parseISO(wo.created_at)) <= 7).length;
  const prev7 = workOrders.filter((wo: any) => {
    const d = differenceInDays(now, parseISO(wo.created_at));
    return d > 7 && d <= 14;
  }).length;
  const weekChange = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : 0;

  // --- Avg resolution time ---
  const avgResolutionHours = useMemo(() => {
    const resolved = workOrders.filter((wo: any) => wo.resolved_at);
    if (resolved.length === 0) return 0;
    return Math.round(resolved.reduce((acc: number, wo: any) =>
      acc + differenceInHours(parseISO(wo.resolved_at), parseISO(wo.created_at)), 0) / resolved.length);
  }, [workOrders]);

  // --- SLA compliance ---
  const slaCompliance = useMemo(() => {
    const withSla = workOrders.filter((wo: any) => wo.resolve_due_at);
    if (withSla.length === 0) return 100;
    const onTime = withSla.filter((wo: any) => {
      if (['concluida', 'aprovada', 'encerrada'].includes(wo.status)) {
        const resolved = wo.resolved_at || wo.updated_at;
        return new Date(resolved) <= new Date(wo.resolve_due_at);
      }
      return new Date(wo.resolve_due_at) >= now;
    }).length;
    return Math.round((onTime / withSla.length) * 100);
  }, [workOrders]);

  // --- Status distribution for donut chart ---
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    activeWOs.forEach((wo: any) => { counts[wo.status] = (counts[wo.status] || 0) + 1; });
    return Object.entries(counts)
      .map(([status, count]) => ({
        name: statusLabels[status] || status, value: count,
        color: STATUS_CHART_COLORS[status] || 'hsl(215, 14%, 46%)',
      }))
      .sort((a, b) => b.value - a.value);
  }, [activeWOs]);

  // --- Priority distribution ---
  const priorityDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    activeWOs.forEach((wo: any) => { counts[wo.priority] = (counts[wo.priority] || 0) + 1; });
    return Object.entries(counts)
      .map(([priority, count]) => ({
        name: priorityLabels[priority] || priority, value: count,
        color: PRIORITY_CHART_COLORS[priority] || 'hsl(215, 14%, 46%)',
      }))
      .sort((a, b) => b.value - a.value);
  }, [activeWOs]);

  // --- Trend data (last 14 days) ---
  const trendData = useMemo(() => {
    const days: { date: string; abertas: number; concluidas: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const dayStr = format(day, 'yyyy-MM-dd');
      const label = format(day, 'dd/MM', { locale: ptBR });
      const opened = workOrders.filter((wo: any) => format(startOfDay(parseISO(wo.created_at)), 'yyyy-MM-dd') === dayStr).length;
      const closed = workOrders.filter((wo: any) => {
        if (!wo.closed_at && !wo.resolved_at) return false;
        return format(startOfDay(parseISO(wo.closed_at || wo.resolved_at)), 'yyyy-MM-dd') === dayStr;
      }).length;
      days.push({ date: label, abertas: opened, concluidas: closed });
    }
    return days;
  }, [workOrders]);

  // --- Cumulative flow (last 14 days) ---
  const cumulativeFlow = useMemo(() => {
    const days: any[] = [];
    for (let i = 13; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const label = format(day, 'dd/MM', { locale: ptBR });
      const openCount = workOrders.filter((wo: any) => {
        const created = startOfDay(parseISO(wo.created_at));
        if (created > day) return false;
        if (['concluida', 'aprovada', 'encerrada'].includes(wo.status)) {
          const closedDate = wo.closed_at || wo.resolved_at || wo.updated_at;
          return startOfDay(parseISO(closedDate)) > day;
        }
        return true;
      }).length;
      days.push({ date: label, backlog: openCount });
    }
    return days;
  }, [workOrders]);

  // --- Backlog aging ---
  const agingData = useMemo(() => {
    const bands = [
      { label: '0-2d', min: 0, max: 2, color: 'hsl(142, 71%, 45%)' },
      { label: '3-7d', min: 3, max: 7, color: 'hsl(213, 94%, 50%)' },
      { label: '8-15d', min: 8, max: 15, color: 'hsl(38, 92%, 50%)' },
      { label: '16-30d', min: 16, max: 30, color: 'hsl(25, 95%, 53%)' },
      { label: '30+d', min: 31, max: Infinity, color: 'hsl(0, 72%, 51%)' },
    ];
    return bands.map(band => ({
      name: band.label,
      value: activeWOs.filter((wo: any) => {
        const age = differenceInDays(now, parseISO(wo.created_at));
        return age >= band.min && age <= band.max;
      }).length,
      fill: band.color,
    }));
  }, [activeWOs]);

  // --- By department ---
  const deptData = useMemo(() => {
    if (memberships.length <= 1) return [];
    const counts: Record<string, { name: string; total: number; active: number; critical: number }> = {};
    workOrders.forEach((wo: any) => {
      const name = tenantMap[wo.tenant_id] || 'Outro';
      if (!counts[wo.tenant_id]) counts[wo.tenant_id] = { name, total: 0, active: 0, critical: 0 };
      counts[wo.tenant_id].total++;
      if (!['encerrada', 'concluida', 'aprovada'].includes(wo.status)) {
        counts[wo.tenant_id].active++;
        if (wo.priority === 'critica') counts[wo.tenant_id].critical++;
      }
    });
    return Object.values(counts).sort((a, b) => b.active - a.active);
  }, [workOrders, memberships, tenantMap]);

  // --- Radial SLA gauge ---
  const slaGaugeData = [{ name: 'SLA', value: slaCompliance, fill: slaCompliance >= 90 ? 'hsl(142, 71%, 45%)' : slaCompliance >= 70 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 72%, 51%)' }];

  const stats = [
    { label: 'Ativas', value: totalActive, icon: ClipboardList, color: 'text-primary', bgColor: 'bg-primary/10', trend: null },
    { label: 'Abertas', value: open, icon: Clock, color: 'text-primary', bgColor: 'bg-primary/10', trend: null },
    { label: 'Em Execução', value: inProgress, icon: Activity, color: 'text-amber-500', bgColor: 'bg-amber-500/10', trend: null },
    { label: 'Críticas', value: critical, icon: Zap, color: 'text-destructive', bgColor: 'bg-destructive/10', trend: null },
    { label: 'SLA Atrasadas', value: overdue, icon: AlertTriangle, color: 'text-orange-500', bgColor: 'bg-orange-500/10', trend: null },
    { label: 'Tempo Médio', value: avgResolutionHours > 0 ? `${avgResolutionHours}h` : '-', icon: Timer, color: 'text-primary', bgColor: 'bg-primary/10', trend: null },
    { label: 'Encerradas (mês)', value: closedThisMonth, icon: CheckCircle2, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', trend: null },
    { label: 'Sem. Anterior', value: `${weekChange >= 0 ? '+' : ''}${weekChange}%`, icon: weekChange >= 0 ? TrendingUp : TrendingDown, color: weekChange >= 0 ? 'text-amber-500' : 'text-emerald-500', bgColor: weekChange >= 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10', trend: weekChange },
  ];

  const recentOrders = workOrders.slice(0, 8);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border border-border rounded-xl shadow-xl p-3 text-xs backdrop-blur-sm">
        <p className="font-semibold text-foreground mb-1.5">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Olá, <span className="font-medium text-foreground">{profile?.name || 'Usuário'}</span> — visão geral das operações
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Tempo real
        </Badge>
      </div>

      {/* SLA Alert */}
      {overdue > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-destructive/8 border border-destructive/15 rounded-xl p-3 text-xs text-destructive font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{overdue} OS com SLA atrasado agora</span>
          <Badge variant="destructive" className="ml-auto text-[10px]">Atenção</Badge>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="border-transparent shadow-[0_1px_3px_0_hsl(var(--foreground)/0.04)] hover:shadow-[0_4px_12px_0_hsl(var(--foreground)/0.08)] transition-shadow rounded-xl overflow-hidden">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground font-medium truncate">{stat.label}</span>
                  <div className={`h-7 w-7 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  </div>
                </div>
                {isLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <div className={cn('text-xl font-bold tracking-tight', stat.color === 'text-destructive' && (stat.value as number) > 0 ? 'text-destructive' : '')}>
                    {stat.value}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend Chart - spans 2 cols */}
        <Card className="border-transparent shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] rounded-xl lg:col-span-2">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                </div>
                Tendência de Volume
              </CardTitle>
              <span className="text-[10px] text-muted-foreground">Últimos 14 dias</span>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[240px] w-full" /> : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradOpen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(213, 94%, 38%)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(213, 94%, 38%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradClosed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 38%)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(142, 71%, 38%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="abertas" name="Abertas" stroke="hsl(213, 94%, 38%)" fill="url(#gradOpen)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="concluidas" name="Concluídas" stroke="hsl(142, 71%, 38%)" fill="url(#gradClosed)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 2 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* SLA Gauge */}
        <Card className="border-transparent shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] rounded-xl">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-3.5 w-3.5 text-primary" />
              </div>
              Conformidade SLA
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {isLoading ? <Skeleton className="h-[180px] w-[180px] rounded-full" /> : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="90%" barSize={14} data={slaGaugeData} startAngle={90} endAngle={-270}>
                    <RadialBar background={{ fill: 'hsl(var(--muted))' }} dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="text-center -mt-24 mb-4">
                  <p className={cn('text-3xl font-bold', slaCompliance >= 90 ? 'text-emerald-500' : slaCompliance >= 70 ? 'text-amber-500' : 'text-destructive')}>
                    {slaCompliance}%
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">dentro do prazo</p>
                </div>
                <div className="flex items-center gap-4 text-[11px] mt-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span className="text-muted-foreground">No prazo: <span className="font-semibold text-foreground">{totalActive - overdue}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-destructive" />
                    <span className="text-muted-foreground">Atrasadas: <span className="font-semibold text-destructive">{overdue}</span></span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row: Status Donut + Priority + Backlog Aging */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Status Donut */}
        <Card className="border-transparent shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] rounded-xl">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Layers className="h-3.5 w-3.5 text-primary" />
              </div>
              Por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[200px] w-full" /> : statusDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-xs text-muted-foreground">Sem dados</div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                        {statusDistribution.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-xl font-bold">{totalActive}</p>
                      <p className="text-[9px] text-muted-foreground">ativas</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  {statusDistribution.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px]">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate text-muted-foreground flex-1">{item.name}</span>
                      <span className="font-semibold tabular-nums">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priority Donut */}
        <Card className="border-transparent shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] rounded-xl">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
              </div>
              Por Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[200px] w-full" /> : priorityDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-xs text-muted-foreground">Sem dados</div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={priorityDistribution} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                        {priorityDistribution.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-xl font-bold">{totalActive}</p>
                      <p className="text-[9px] text-muted-foreground">total</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {priorityDistribution.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                        <span className="font-semibold tabular-nums">{item.value}</span>
                      </div>
                      <Progress value={totalActive > 0 ? (item.value / totalActive) * 100 : 0} className="h-1" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backlog Aging */}
        <Card className="border-transparent shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] rounded-xl">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Hourglass className="h-3.5 w-3.5 text-amber-500" />
              </div>
              Envelhecimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={agingData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="OS" radius={[4, 4, 0, 0]} barSize={20}>
                      {agingData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-5 gap-1 mt-1">
                  {agingData.map((band, i) => (
                    <div key={i} className="text-center">
                      <p className={cn("text-sm font-bold", i >= 3 && band.value > 0 ? 'text-destructive' : i >= 2 && band.value > 0 ? 'text-amber-500' : '')}>{band.value}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cumulative Flow + By Department */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cumulative Flow */}
        <Card className="border-transparent shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] rounded-xl">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                </div>
                Fluxo Acumulado (Backlog)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={cumulativeFlow} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradBacklog" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(262, 60%, 50%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(262, 60%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="backlog" name="Backlog" stroke="hsl(262, 60%, 50%)" fill="url(#gradBacklog)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* By Department (if multi-tenant) */}
        {deptData.length > 0 ? (
          <Card className="border-transparent shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] rounded-xl">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                </div>
                Por Departamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deptData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="active" name="Ativas" fill="hsl(213, 94%, 38%)" radius={[3, 3, 0, 0]} barSize={16} />
                  <Bar dataKey="critical" name="Críticas" fill="hsl(0, 72%, 51%)" radius={[3, 3, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          // Status bar chart for single-tenant
          <Card className="border-transparent shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] rounded-xl">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                </div>
                Volume por Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={statusDistribution} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={100} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Total" radius={[0, 4, 4, 0]} barSize={14}>
                      {statusDistribution.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Work Orders */}
      <Card className="border-transparent shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-3.5 w-3.5 text-primary" />
              </div>
              Ordens Recentes
            </CardTitle>
            <Badge variant="secondary" className="text-[10px] font-normal">
              {workOrders.length} total
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="mx-auto h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Nenhuma ordem de serviço encontrada.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentOrders.map((wo: any) => (
                <div
                  key={wo.id}
                  className="flex items-center gap-4 px-4 sm:px-5 py-3.5 cursor-pointer hover:bg-muted/50 transition-colors group"
                  onClick={() => navigate(`/os/${wo.id}`)}
                >
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{wo.code}</span>
                      {memberships.length > 1 && (
                        <Badge variant="secondary" className="text-[10px] h-4 font-normal gap-0.5">
                          <Building2 className="h-2.5 w-2.5" />
                          {tenantMap[wo.tenant_id] || ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{wo.title}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-[11px] ${priorityColors[wo.priority]}`}>
                      {priorityLabels[wo.priority]}
                    </Badge>
                    <Badge variant="outline" className={`text-[11px] ${statusColors[wo.status]}`}>
                      {statusLabels[wo.status]}
                    </Badge>
                  </div>
                  <div className="hidden md:block shrink-0 w-[100px]">
                    <SlaIndicator workOrder={wo} compact />
                  </div>
                  <span className="hidden lg:block text-xs text-muted-foreground shrink-0 w-[80px] text-right">
                    {new Date(wo.updated_at).toLocaleDateString('pt-BR')}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useTenantQuery } from '@/hooks/useTenantQuery';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { statusLabels, priorityLabels } from '@/lib/permissions';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area,
} from 'recharts';
import {
  ClipboardList, Clock, Star, Package, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Timer, BarChart3, Users, Activity, Zap, ArrowUpRight, ArrowDownRight,
  Target, ShieldCheck, CalendarDays, Layers, Hourglass, RotateCcw, UserCheck,
} from 'lucide-react';
import { format, subDays, subMonths, isAfter, parseISO, differenceInHours, differenceInMinutes, differenceInDays, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── Colors ──────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  aberta: 'hsl(213, 94%, 38%)', triagem: 'hsl(262, 60%, 50%)',
  em_execucao: 'hsl(38, 92%, 50%)', aguardando_peca: 'hsl(25, 95%, 53%)',
  aguardando_solicitante: 'hsl(45, 93%, 47%)', aguardando_terceiro: 'hsl(45, 93%, 47%)',
  concluida: 'hsl(142, 71%, 38%)', aprovada: 'hsl(160, 60%, 45%)',
  encerrada: 'hsl(215, 14%, 46%)', reaberta: 'hsl(0, 72%, 45%)',
};
const PRIORITY_COLORS: Record<string, string> = {
  baixa: 'hsl(215, 14%, 46%)', media: 'hsl(213, 94%, 38%)',
  alta: 'hsl(25, 95%, 53%)', critica: 'hsl(0, 72%, 45%)',
};
const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px', fontSize: '12px', boxShadow: '0 8px 30px -12px hsl(var(--foreground) / 0.15)' };

type Period = '7d' | '30d' | '90d' | '12m';

function getDateFilter(period: Period) {
  if (period === '7d') return subDays(new Date(), 7);
  if (period === '30d') return subDays(new Date(), 30);
  if (period === '90d') return subDays(new Date(), 90);
  return subMonths(new Date(), 12);
}

export default function Reports() {
  const { currentTenantId } = useAuth();
  const [period, setPeriod] = useState<Period>('30d');

  const { data: workOrders = [] } = useTenantQuery<any>('work_orders', 'work_orders');
  const { data: events = [] } = useTenantQuery<any>('wo_events_reports', 'work_order_events');
  const { data: memberships = [] } = useTenantQuery<any>('memberships_reports', 'user_memberships', {
    select: '*, profiles!inner(name)',
  });
  const { data: stockItems = [] } = useTenantQuery<any>('stock_items_reports', 'stock_items');
  const { data: stockMovements = [] } = useTenantQuery<any>('stock_movements_reports', 'stock_movements', {
    select: '*, stock_items(name)',
  });

  const cutoff = getDateFilter(period);
  const filteredWO = useMemo(() => workOrders.filter((wo: any) => isAfter(parseISO(wo.created_at), cutoff)), [workOrders, cutoff]);
  const closedWO = useMemo(() => filteredWO.filter((wo: any) => ['concluida', 'aprovada', 'encerrada'].includes(wo.status)), [filteredWO]);
  const activeWO = useMemo(() => filteredWO.filter((wo: any) => !['encerrada', 'concluida', 'aprovada'].includes(wo.status)), [filteredWO]);

  // ─── KPIs ──────────────────────────────────────────────────
  const total = filteredWO.length;
  const resolved = closedWO.length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const overdue = activeWO.filter((wo: any) => wo.resolve_due_at && new Date(wo.resolve_due_at) < new Date()).length;
  const slaCompliance = total > 0 ? Math.round(((total - overdue) / total) * 100) : 100;
  const reopenedCount = filteredWO.filter((wo: any) => wo.status === 'reaberta').length;

  const avgResolutionHours = useMemo(() => {
    const r = filteredWO.filter((wo: any) => wo.resolved_at);
    if (r.length === 0) return 0;
    return Math.round(r.reduce((acc: number, wo: any) => acc + differenceInHours(parseISO(wo.resolved_at), parseISO(wo.created_at)), 0) / r.length);
  }, [filteredWO]);

  const avgResponseMinutes = useMemo(() => {
    const r = filteredWO.filter((wo: any) => wo.started_at);
    if (r.length === 0) return 0;
    return Math.round(r.reduce((acc: number, wo: any) => acc + differenceInMinutes(parseISO(wo.started_at), parseISO(wo.created_at)), 0) / r.length);
  }, [filteredWO]);

  // ─── Status distribution ──────────────────────────────────
  const statusData = useMemo(() => Object.entries(statusLabels).map(([key, label]) => ({
    name: label, key, value: filteredWO.filter((wo: any) => wo.status === key).length,
    fill: STATUS_COLORS[key] || 'hsl(215, 14%, 46%)',
  })).filter(d => d.value > 0), [filteredWO]);

  // ─── Priority distribution ────────────────────────────────
  const priorityData = useMemo(() => Object.entries(priorityLabels).map(([key, label]) => ({
    name: label, key, value: filteredWO.filter((wo: any) => wo.priority === key).length,
    fill: PRIORITY_COLORS[key] || 'hsl(215, 14%, 46%)',
  })).filter(d => d.value > 0), [filteredWO]);

  // ─── Trend (daily/monthly) ────────────────────────────────
  const trendData = useMemo(() => {
    const fmt = period === '12m' ? 'MMM/yy' : 'dd/MM';
    const groups: Record<string, { created: number; closed: number }> = {};
    if (period !== '12m') {
      eachDayOfInterval({ start: cutoff, end: new Date() }).forEach(d => {
        groups[format(d, fmt, { locale: ptBR })] = { created: 0, closed: 0 };
      });
    }
    filteredWO.forEach((wo: any) => {
      const key = format(parseISO(wo.created_at), fmt, { locale: ptBR });
      if (!groups[key]) groups[key] = { created: 0, closed: 0 };
      groups[key].created++;
    });
    closedWO.forEach((wo: any) => {
      const closedDate = wo.closed_at || wo.resolved_at || wo.updated_at;
      const key = format(parseISO(closedDate), fmt, { locale: ptBR });
      if (!groups[key]) groups[key] = { created: 0, closed: 0 };
      groups[key].closed++;
    });
    return Object.entries(groups).map(([name, v]) => ({ name, ...v }));
  }, [filteredWO, closedWO, period, cutoff]);

  // ─── Heatmap (day of week x hour) ────────────────────────
  const heatmapData = useMemo(() => {
    const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const grid: Record<string, number> = {};
    filteredWO.forEach((wo: any) => {
      const d = parseISO(wo.created_at);
      const day = dayLabels[d.getDay()];
      const hour = d.getHours();
      const periodLabel = hour < 6 ? 'Madrugada' : hour < 12 ? 'Manhã' : hour < 18 ? 'Tarde' : 'Noite';
      grid[`${day}-${periodLabel}`] = (grid[`${day}-${periodLabel}`] || 0) + 1;
    });
    const periods = ['Madrugada', 'Manhã', 'Tarde', 'Noite'];
    return dayLabels.map(day => {
      const row: any = { name: day };
      periods.forEach(p => { row[p] = grid[`${day}-${p}`] || 0; });
      return row;
    });
  }, [filteredWO]);

  // ─── Backlog Aging ────────────────────────────────────────
  const agingData = useMemo(() => {
    const now = new Date();
    const bands = [
      { label: '0-2 dias', min: 0, max: 2 },
      { label: '3-7 dias', min: 3, max: 7 },
      { label: '8-15 dias', min: 8, max: 15 },
      { label: '16-30 dias', min: 16, max: 30 },
      { label: '30+ dias', min: 31, max: Infinity },
    ];
    const openWO = workOrders.filter((wo: any) => !['concluida', 'aprovada', 'encerrada'].includes(wo.status));
    return bands.map(band => {
      const count = openWO.filter((wo: any) => {
        const age = differenceInDays(now, parseISO(wo.created_at));
        return age >= band.min && age <= band.max;
      }).length;
      return { name: band.label, value: count };
    });
  }, [workOrders]);

  const totalBacklog = agingData.reduce((a, b) => a + b.value, 0);

  // ─── Resolution Time Trend ────────────────────────────────
  const resolutionTrendData = useMemo(() => {
    const resolvedWO = filteredWO.filter((wo: any) => wo.resolved_at);
    if (resolvedWO.length === 0) return [];

    const isWeekly = period === '90d' || period === '12m';
    const fmtStr = period === '12m' ? 'MMM/yy' : 'dd/MM';
    const groups: Record<string, { totalHrs: number; count: number }> = {};

    resolvedWO.forEach((wo: any) => {
      const resolvedDate = parseISO(wo.resolved_at);
      const key = isWeekly
        ? `Sem ${format(startOfWeek(resolvedDate, { locale: ptBR }), 'dd/MM', { locale: ptBR })}`
        : format(resolvedDate, fmtStr, { locale: ptBR });

      if (!groups[key]) groups[key] = { totalHrs: 0, count: 0 };
      groups[key].totalHrs += differenceInHours(resolvedDate, parseISO(wo.created_at));
      groups[key].count++;
    });

    return Object.entries(groups).map(([name, v]) => ({
      name,
      avgHours: Math.round(v.totalHrs / v.count),
    }));
  }, [filteredWO, period]);

  // ─── Tech performance ─────────────────────────────────────
  const techPerformance = useMemo(() => {
    const techs = memberships.filter((m: any) => ['tecnico', 'coordenador', 'admin', 'super_admin'].includes(m.role));
    return techs.map((t: any) => {
      const assigned = filteredWO.filter((wo: any) => wo.assigned_to_id === t.user_id);
      const resolvedList = assigned.filter((wo: any) => wo.resolved_at);
      const avgHrs = resolvedList.length > 0
        ? Math.round(resolvedList.reduce((a: number, wo: any) => a + differenceInHours(parseISO(wo.resolved_at), parseISO(wo.created_at)), 0) / resolvedList.length)
        : 0;
      const rate = assigned.length > 0 ? Math.round((resolvedList.length / assigned.length) * 100) : 0;
      return { name: t.profiles?.name || 'Sem nome', userId: t.user_id, total: assigned.length, resolved: resolvedList.length, avgHours: avgHrs, rate };
    }).filter(t => t.total > 0).sort((a, b) => b.resolved - a.resolved);
  }, [memberships, filteredWO]);

  // ─── Satisfaction ─────────────────────────────────────────
  const ratingEvents = useMemo(() => events.filter((ev: any) => {
    const payload = ev.payload as any;
    return ev.type === 'closed' && payload?.rating && isAfter(parseISO(ev.created_at), cutoff);
  }), [events, cutoff]);

  const avgRating = useMemo(() => {
    if (ratingEvents.length === 0) return 0;
    return +(ratingEvents.reduce((a: number, ev: any) => a + ((ev.payload as any)?.rating || 0), 0) / ratingEvents.length).toFixed(1);
  }, [ratingEvents]);

  const ratingDistribution = useMemo(() => [5, 4, 3, 2, 1].map(star => ({
    name: `${star}★`, value: ratingEvents.filter((ev: any) => (ev.payload as any)?.rating === star).length,
  })), [ratingEvents]);

  // ─── Satisfaction Trend ───────────────────────────────────
  const satisfactionTrend = useMemo(() => {
    if (ratingEvents.length === 0) return [];
    const fmt = period === '12m' ? 'MMM/yy' : 'dd/MM';
    const groups: Record<string, { total: number; count: number }> = {};
    ratingEvents.forEach((ev: any) => {
      const key = format(parseISO(ev.created_at), fmt, { locale: ptBR });
      if (!groups[key]) groups[key] = { total: 0, count: 0 };
      groups[key].total += (ev.payload as any)?.rating || 0;
      groups[key].count++;
    });
    return Object.entries(groups).map(([name, v]) => ({
      name,
      avgRating: +(v.total / v.count).toFixed(1),
    }));
  }, [ratingEvents, period]);

  // ─── Satisfaction by Technician ───────────────────────────
  const techSatisfaction = useMemo(() => {
    const techs = memberships.filter((m: any) => ['tecnico', 'coordenador', 'admin', 'super_admin'].includes(m.role));
    return techs.map((t: any) => {
      const techRatings = ratingEvents.filter((ev: any) => {
        const wo = workOrders.find((w: any) => w.id === ev.work_order_id);
        return wo?.assigned_to_id === t.user_id;
      });
      if (techRatings.length === 0) return null;
      const avg = +(techRatings.reduce((a: number, ev: any) => a + ((ev.payload as any)?.rating || 0), 0) / techRatings.length).toFixed(1);
      return { name: t.profiles?.name || 'Sem nome', avgRating: avg, count: techRatings.length };
    }).filter(Boolean).sort((a: any, b: any) => b.avgRating - a.avgRating) as { name: string; avgRating: number; count: number }[];
  }, [memberships, ratingEvents, workOrders]);

  // ─── Stock ────────────────────────────────────────────────
  const lowStockItems = stockItems.filter((i: any) => (i.current_level || 0) <= (i.min_level || 0) && i.min_level > 0);
  const stockOutCount = useMemo(() => stockMovements.filter((m: any) => m.type === 'out' && isAfter(parseISO(m.created_at), cutoff)).length, [stockMovements, cutoff]);
  const stockInCount = useMemo(() => stockMovements.filter((m: any) => m.type === 'in' && isAfter(parseISO(m.created_at), cutoff)).length, [stockMovements, cutoff]);
  const topConsumed = useMemo(() => {
    const outMovements = stockMovements.filter((m: any) => m.type === 'out' && isAfter(parseISO(m.created_at), cutoff));
    const grouped: Record<string, { name: string; qty: number }> = {};
    outMovements.forEach((m: any) => {
      const id = m.stock_item_id;
      if (!grouped[id]) grouped[id] = { name: m.stock_items?.name || 'Item', qty: 0 };
      grouped[id].qty += m.qty;
    });
    return Object.values(grouped).sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [stockMovements, cutoff]);

  const stockTrend = useMemo(() => {
    const fmt = period === '12m' ? 'MMM/yy' : 'dd/MM';
    const groups: Record<string, { entradas: number; saidas: number }> = {};
    stockMovements.filter((m: any) => isAfter(parseISO(m.created_at), cutoff)).forEach((m: any) => {
      const key = format(parseISO(m.created_at), fmt, { locale: ptBR });
      if (!groups[key]) groups[key] = { entradas: 0, saidas: 0 };
      if (m.type === 'in') groups[key].entradas += m.qty;
      else if (m.type === 'out') groups[key].saidas += m.qty;
    });
    return Object.entries(groups).map(([name, v]) => ({ name, ...v }));
  }, [stockMovements, cutoff, period]);

  return (
    <div className="space-y-5">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Análise operacional e indicadores de desempenho</p>
        </div>
        <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
          <SelectTrigger className="h-9 w-[160px] text-xs bg-card border-border rounded-lg">
            <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="12m">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ─── KPI Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <KPICard icon={ClipboardList} label="Total de OS" value={total} />
        <KPICard icon={CheckCircle} label="Resolvidas" value={resolved} accent="text-emerald-500" />
        <KPICard icon={Target} label="Taxa Resolução" value={`${resolutionRate}%`} accent={resolutionRate >= 70 ? 'text-emerald-500' : 'text-amber-500'} />
        <KPICard icon={Timer} label="Tempo Médio" value={avgResolutionHours > 0 ? `${avgResolutionHours}h` : '-'} />
        <KPICard icon={Zap} label="1ª Resposta" value={avgResponseMinutes > 0 ? `${avgResponseMinutes}min` : '-'} />
        <KPICard icon={ShieldCheck} label="SLA" value={`${slaCompliance}%`} accent={slaCompliance >= 90 ? 'text-emerald-500' : slaCompliance >= 70 ? 'text-amber-500' : 'text-destructive'} />
        <KPICard icon={Hourglass} label="Backlog" value={totalBacklog} accent={totalBacklog > 0 ? 'text-amber-500' : undefined} />
        <KPICard icon={RotateCcw} label="Reabertas" value={reopenedCount} accent={reopenedCount > 0 ? 'text-destructive' : undefined} />
      </div>

      {overdue > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-xs text-destructive font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{overdue} OS com SLA atrasado no momento</span>
          <Badge variant="destructive" className="ml-auto text-[10px]">Atenção</Badge>
        </motion.div>
      )}

      {/* ─── Tabs ───────────────────────────────────────────── */}
      <Tabs defaultValue="os" className="space-y-4">
        <TabsList className="bg-card border border-border h-10 p-1 rounded-xl">
          <TabsTrigger value="os" className="text-xs h-8 rounded-lg data-[state=active]:shadow-sm"><BarChart3 className="h-3.5 w-3.5 mr-1.5" />Ordens de Serviço</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs h-8 rounded-lg data-[state=active]:shadow-sm"><Users className="h-3.5 w-3.5 mr-1.5" />Desempenho</TabsTrigger>
          <TabsTrigger value="satisfaction" className="text-xs h-8 rounded-lg data-[state=active]:shadow-sm"><Star className="h-3.5 w-3.5 mr-1.5" />Satisfação</TabsTrigger>
          <TabsTrigger value="stock" className="text-xs h-8 rounded-lg data-[state=active]:shadow-sm"><Package className="h-3.5 w-3.5 mr-1.5" />Estoque</TabsTrigger>
        </TabsList>

        {/* ═══════════ OS Tab ═══════════ */}
        <TabsContent value="os" className="space-y-4">
          {/* Volume Trend */}
          <ChartCard title="Tendência de Volume" subtitle="Criadas vs Encerradas" icon={TrendingUp}>
            {trendData.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradClosed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="created" name="Criadas" stroke="hsl(var(--primary))" fill="url(#gradCreated)" strokeWidth={2} />
                  <Area type="monotone" dataKey="closed" name="Encerradas" stroke="hsl(142, 71%, 45%)" fill="url(#gradClosed)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Status Pie */}
            <ChartCard title="Distribuição por Status" icon={Layers}>
              {statusData.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}>
                      {statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Priority Pie */}
            <ChartCard title="Distribuição por Prioridade" icon={AlertTriangle}>
              {priorityData.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={priorityData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}>
                      {priorityData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Backlog Aging */}
            <ChartCard title="Envelhecimento do Backlog" subtitle={`${totalBacklog} OS abertas no total`} icon={Hourglass}>
              {totalBacklog === 0 ? <EmptyChart /> : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={agingData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" name="OS Abertas" radius={[6, 6, 0, 0]}>
                        {agingData.map((_, i) => (
                          <Cell key={i} fill={
                            i === 0 ? 'hsl(142, 71%, 45%)' :
                            i === 1 ? 'hsl(213, 94%, 50%)' :
                            i === 2 ? 'hsl(38, 92%, 50%)' :
                            i === 3 ? 'hsl(25, 95%, 53%)' :
                            'hsl(0, 72%, 51%)'
                          } />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-5 gap-1 mt-2">
                    {agingData.map((band, i) => (
                      <div key={i} className="text-center">
                        <p className={cn("text-lg font-bold", 
                          i >= 3 && band.value > 0 ? 'text-destructive' : 
                          i >= 2 && band.value > 0 ? 'text-amber-500' : ''
                        )}>{band.value}</p>
                        <p className="text-[10px] text-muted-foreground">{band.name}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </ChartCard>

            {/* Resolution Time Trend */}
            <ChartCard title="Tendência do Tempo de Resolução" subtitle="Tempo médio (horas) ao longo do período" icon={Timer}>
              {resolutionTrendData.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={resolutionTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} unit="h" />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`${value}h`, 'Tempo médio']} />
                    <Line type="monotone" dataKey="avgHours" name="Tempo médio" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--primary))' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Heatmap */}
          <ChartCard title="Horários de Pico" subtitle="Volume de OS por dia/período" icon={Activity}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Dia</th>
                    {['Madrugada', 'Manhã', 'Tarde', 'Noite'].map(p => (
                      <th key={p} className="py-2 px-3 text-muted-foreground font-medium text-center">{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map((row, i) => (
                    <tr key={i}>
                      <td className="py-1.5 px-3 font-medium">{row.name}</td>
                      {['Madrugada', 'Manhã', 'Tarde', 'Noite'].map(p => {
                        const val = row[p] as number;
                        const max = Math.max(...heatmapData.flatMap(r => ['Madrugada', 'Manhã', 'Tarde', 'Noite'].map(pp => r[pp] as number)));
                        const intensity = max > 0 ? val / max : 0;
                        return (
                          <td key={p} className="py-1.5 px-3 text-center">
                            <div className={cn(
                              "mx-auto w-10 h-8 rounded-md flex items-center justify-center font-semibold text-xs transition-colors",
                              intensity === 0 ? 'bg-muted/30 text-muted-foreground/40' :
                              intensity < 0.33 ? 'bg-primary/10 text-primary/70' :
                              intensity < 0.66 ? 'bg-primary/25 text-primary' :
                              'bg-primary/50 text-primary-foreground'
                            )}>
                              {val || ''}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </TabsContent>

        {/* ═══════════ Performance Tab ═══════════ */}
        <TabsContent value="performance" className="space-y-4">
          <ChartCard title="Desempenho por Técnico" subtitle="Atribuídas vs Resolvidas" icon={Users}>
            {techPerformance.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={Math.max(220, techPerformance.length * 50)}>
                <BarChart data={techPerformance} layout="vertical" barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={130} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="total" name="Atribuídas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="resolved" name="Resolvidas" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {techPerformance.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {techPerformance.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{t.name}</p>
                          <p className="text-[11px] text-muted-foreground">{t.resolved}/{t.total} OS resolvidas</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Taxa de resolução</span>
                          <span className={cn('font-semibold', t.rate >= 70 ? 'text-emerald-500' : 'text-amber-500')}>{t.rate}%</span>
                        </div>
                        <Progress value={t.rate} className="h-1.5" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Tempo médio</span>
                          <span className="font-medium text-foreground">{t.avgHours}h</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══════════ Satisfaction Tab ═══════════ */}
        <TabsContent value="satisfaction" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Nota Média" icon={Star}>
              <div className="flex flex-col items-center py-8">
                <div className="flex items-center gap-1.5 mb-3">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={cn('h-9 w-9 transition-colors', s <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20')} />
                  ))}
                </div>
                <p className="text-4xl font-bold tracking-tight">{avgRating || '-'}</p>
                <p className="text-xs text-muted-foreground mt-1.5">{ratingEvents.length} avaliações no período</p>
                {avgRating > 0 && (
                  <Badge variant="secondary" className={cn('mt-3 text-xs', avgRating >= 4 ? 'bg-emerald-500/10 text-emerald-500' : avgRating >= 3 ? 'bg-amber-500/10 text-amber-500' : 'bg-destructive/10 text-destructive')}>
                    {avgRating >= 4 ? 'Excelente' : avgRating >= 3 ? 'Bom' : 'Precisa melhorar'}
                  </Badge>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Distribuição de Notas" icon={BarChart3}>
              {ratingEvents.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ratingDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" name="Avaliações" fill="hsl(38, 92%, 50%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Satisfaction Trend */}
          <ChartCard title="Tendência de Satisfação" subtitle="Evolução da nota média ao longo do período" icon={TrendingUp}>
            {satisfactionTrend.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={satisfactionTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} domain={[0, 5]} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [value, 'Nota média']} />
                  <Line type="monotone" dataKey="avgRating" name="Nota média" stroke="hsl(38, 92%, 50%)" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(38, 92%, 50%)' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Satisfaction by Technician */}
          {techSatisfaction.length > 0 && (
            <ChartCard title="Satisfação por Técnico" subtitle="Nota média de cada membro da equipe" icon={UserCheck}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {techSatisfaction.map((t, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <div className="bg-muted/20 border border-border rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-xs font-bold text-amber-600">
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{t.name}</p>
                          <p className="text-[11px] text-muted-foreground">{t.count} avaliações</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={cn('h-4 w-4', s <= Math.round(t.avgRating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20')} />
                          ))}
                        </div>
                        <span className="text-lg font-bold">{t.avgRating}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ChartCard>
          )}
        </TabsContent>

        {/* ═══════════ Stock Tab ═══════════ */}
        <TabsContent value="stock" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPICard icon={Package} label="Total de Itens" value={stockItems.length} />
            <KPICard icon={AlertTriangle} label="Estoque Baixo" value={lowStockItems.length} accent={lowStockItems.length > 0 ? 'text-destructive' : undefined} />
            <KPICard icon={ArrowDownRight} label="Saídas" value={stockOutCount} accent="text-amber-500" />
            <KPICard icon={ArrowUpRight} label="Entradas" value={stockInCount} accent="text-emerald-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Movimentação de Estoque" subtitle="Entradas vs Saídas" icon={TrendingUp}>
              {stockTrend.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stockTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="entradas" name="Entradas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="saidas" name="Saídas" fill="hsl(25, 95%, 53%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Itens Mais Consumidos" icon={TrendingDown}>
              {topConsumed.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={Math.max(200, topConsumed.length * 35)}>
                  <BarChart data={topConsumed} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={120} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="qty" name="Saídas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {lowStockItems.length > 0 && (
            <ChartCard title="Itens Abaixo do Mínimo" icon={AlertTriangle} iconAccent="text-destructive">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {lowStockItems.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between bg-destructive/5 border border-destructive/10 rounded-xl p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      {item.sku && <p className="text-[11px] text-muted-foreground">SKU: {item.sku}</p>}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold text-destructive">{item.current_level}</p>
                      <p className="text-[10px] text-muted-foreground">Mín: {item.min_level}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function KPICard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string | number; accent?: string }) {
  return (
    <Card className="border-border overflow-hidden group">
      <CardContent className="p-3 flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground truncate">{label}</p>
          <p className={cn('text-lg font-bold leading-tight tracking-tight', accent)}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, subtitle, icon: Icon, iconAccent, children }: {
  title: string; subtitle?: string; icon?: React.ElementType; iconAccent?: string; children: React.ReactNode;
}) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        {Icon && (
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className={cn('h-4 w-4 text-primary', iconAccent)} />
          </div>
        )}
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
      <BarChart3 className="h-8 w-8 mb-2 opacity-30" />
      <p className="text-sm">Sem dados para exibir.</p>
    </div>
  );
}

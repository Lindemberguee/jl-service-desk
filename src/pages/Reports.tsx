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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area, RadialBarChart, RadialBar,
} from 'recharts';
import {
  ClipboardList, Clock, Star, Package, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Timer, BarChart3, Users, Activity, Zap, ArrowUpRight, ArrowDownRight,
  Target, ShieldCheck, CalendarDays, Layers, Hourglass, RotateCcw, UserCheck, Gauge,
  Wrench, DollarSign, Cpu, CircleDot, Info,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, subDays, subMonths, isAfter, parseISO, differenceInHours, differenceInMinutes, differenceInDays, eachDayOfInterval, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReportExportActions } from '@/components/reports/ReportExportActions';

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

type Period = '7d' | '30d' | '90d' | '12m';

function getDateFilter(period: Period) {
  if (period === '7d') return subDays(new Date(), 7);
  if (period === '30d') return subDays(new Date(), 30);
  if (period === '90d') return subDays(new Date(), 90);
  return subMonths(new Date(), 12);
}

export default function Reports() {
  const { currentTenantId, memberships: authMemberships } = useAuth();
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
  const { data: assets = [] } = useTenantQuery<any>('assets_reports', 'assets');
  const { data: maintenanceRecords = [] } = useTenantQuery<any>('maintenance_reports', 'asset_maintenance_records');

  const tenantName = authMemberships.find(m => m.tenant_id === currentTenantId)?.tenant_name || '';

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

  // ─── Advanced KPIs: MTTR, MTBF, Costs ────────────────────
  const mttr = useMemo(() => {
    // Mean Time To Repair: avg from started_at to resolved_at
    const repaired = filteredWO.filter((wo: any) => wo.started_at && wo.resolved_at);
    if (repaired.length === 0) return 0;
    return Math.round(repaired.reduce((acc: number, wo: any) => acc + differenceInHours(parseISO(wo.resolved_at), parseISO(wo.started_at)), 0) / repaired.length);
  }, [filteredWO]);

  const mtbf = useMemo(() => {
    // Mean Time Between Failures: for assets with 2+ WOs, avg time between them
    const assetWOs: Record<string, Date[]> = {};
    filteredWO.filter((wo: any) => wo.asset_id).forEach((wo: any) => {
      if (!assetWOs[wo.asset_id]) assetWOs[wo.asset_id] = [];
      assetWOs[wo.asset_id].push(parseISO(wo.created_at));
    });
    let totalGap = 0, gapCount = 0;
    Object.values(assetWOs).forEach(dates => {
      if (dates.length < 2) return;
      dates.sort((a, b) => a.getTime() - b.getTime());
      for (let i = 1; i < dates.length; i++) {
        totalGap += differenceInHours(dates[i], dates[i - 1]);
        gapCount++;
      }
    });
    return gapCount > 0 ? Math.round(totalGap / gapCount) : 0;
  }, [filteredWO]);

  const totalCost = useMemo(() => filteredWO.reduce((acc: number, wo: any) => acc + (wo.total_cost || 0), 0), [filteredWO]);
  const avgCostPerOS = resolved > 0 ? totalCost / resolved : 0;

  const costTrend = useMemo(() => {
    const fmt = period === '12m' ? 'MMM/yy' : 'dd/MM';
    const groups: Record<string, { labor: number; parts: number; total: number }> = {};
    closedWO.forEach((wo: any) => {
      const d = wo.resolved_at || wo.closed_at || wo.updated_at;
      const key = format(parseISO(d), fmt, { locale: ptBR });
      if (!groups[key]) groups[key] = { labor: 0, parts: 0, total: 0 };
      groups[key].labor += wo.labor_cost || 0;
      groups[key].parts += wo.parts_cost || 0;
      groups[key].total += wo.total_cost || 0;
    });
    return Object.entries(groups).map(([name, v]) => ({ name, ...v }));
  }, [closedWO, period]);

  const costByPriority = useMemo(() => Object.entries(priorityLabels).map(([key, label]) => {
    const wos = filteredWO.filter((wo: any) => wo.priority === key);
    return { name: label, value: wos.reduce((a: number, wo: any) => a + (wo.total_cost || 0), 0), count: wos.length };
  }).filter(d => d.value > 0), [filteredWO]);

  // ─── Previous period comparison ───────────────────────────
  const prevCutoff = useMemo(() => {
    const diff = new Date().getTime() - cutoff.getTime();
    return new Date(cutoff.getTime() - diff);
  }, [cutoff]);
  const prevWO = useMemo(() => workOrders.filter((wo: any) => {
    const d = parseISO(wo.created_at);
    return isAfter(d, prevCutoff) && !isAfter(d, cutoff);
  }), [workOrders, prevCutoff, cutoff]);
  const prevTotal = prevWO.length;
  const totalChange = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0;
  const prevResolved = prevWO.filter((wo: any) => ['concluida', 'aprovada', 'encerrada'].includes(wo.status)).length;
  const resolvedChange = prevResolved > 0 ? Math.round(((resolved - prevResolved) / prevResolved) * 100) : 0;

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
      { label: '0-2d', min: 0, max: 2, color: 'hsl(142, 71%, 45%)' },
      { label: '3-7d', min: 3, max: 7, color: 'hsl(213, 94%, 50%)' },
      { label: '8-15d', min: 8, max: 15, color: 'hsl(38, 92%, 50%)' },
      { label: '16-30d', min: 16, max: 30, color: 'hsl(25, 95%, 53%)' },
      { label: '30+d', min: 31, max: Infinity, color: 'hsl(0, 72%, 51%)' },
    ];
    const openWO = workOrders.filter((wo: any) => !['concluida', 'aprovada', 'encerrada'].includes(wo.status));
    return bands.map(band => ({
      name: band.label,
      value: openWO.filter((wo: any) => {
        const age = differenceInDays(now, parseISO(wo.created_at));
        return age >= band.min && age <= band.max;
      }).length,
      fill: band.color,
    }));
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
    return Object.entries(groups).map(([name, v]) => ({ name, avgHours: Math.round(v.totalHrs / v.count) }));
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
    return Object.entries(groups).map(([name, v]) => ({ name, avgRating: +(v.total / v.count).toFixed(1) }));
  }, [ratingEvents, period]);

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

  // ─── SLA Gauge ────────────────────────────────────────────
  const slaGaugeData = [{ name: 'SLA', value: slaCompliance, fill: slaCompliance >= 90 ? 'hsl(142, 71%, 45%)' : slaCompliance >= 70 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 72%, 51%)' }];
  const resRateGaugeData = [{ name: 'Resolução', value: resolutionRate, fill: resolutionRate >= 70 ? 'hsl(142, 71%, 45%)' : resolutionRate >= 50 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 72%, 51%)' }];

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
    <div className="space-y-5">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Análise operacional e indicadores de desempenho</p>
        </div>
        <div className="flex items-center gap-2">
          <ReportExportActions
            workOrders={filteredWO}
            techPerformance={techPerformance}
            period={period}
            tenantName={tenantName}
            kpis={{ total, resolved, resolutionRate, avgResolutionHours, avgResponseMinutes, slaCompliance, totalBacklog, reopenedCount, overdue, mttr, mtbf, avgCostPerOS, totalCost }}
          />
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
      </div>

      {/* ─── KPI Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <KPICard icon={ClipboardList} label="Total de OS" value={total} change={totalChange} description="Quantidade total de ordens de serviço criadas no período selecionado." />
        <KPICard icon={CheckCircle} label="Resolvidas" value={resolved} accent="text-emerald-500" change={resolvedChange} description="Ordens de serviço que foram finalizadas/resolvidas no período." />
        <KPICard icon={Target} label="Taxa Resolução" value={`${resolutionRate}%`} accent={resolutionRate >= 70 ? 'text-emerald-500' : 'text-amber-500'} description="Percentual de OS resolvidas em relação ao total criado. Meta ideal: acima de 70%." />
        <KPICard icon={Timer} label="Tempo Médio" value={avgResolutionHours > 0 ? `${avgResolutionHours}h` : '-'} description="Tempo médio entre a criação da OS e sua resolução, em horas." />
        <KPICard icon={Zap} label="1ª Resposta" value={avgResponseMinutes > 0 ? `${avgResponseMinutes}min` : '-'} description="Tempo médio até o primeiro atendimento (início da execução) após a criação da OS." />
        <KPICard icon={ShieldCheck} label="SLA" value={`${slaCompliance}%`} accent={slaCompliance >= 90 ? 'text-emerald-500' : slaCompliance >= 70 ? 'text-amber-500' : 'text-destructive'} description="Percentual de OS resolvidas dentro do prazo de SLA acordado. Meta: acima de 90%." />
        <KPICard icon={Hourglass} label="Backlog" value={totalBacklog} accent={totalBacklog > 0 ? 'text-amber-500' : undefined} description="Quantidade de OS ainda em aberto (não finalizadas) aguardando resolução." />
        <KPICard icon={RotateCcw} label="Reabertas" value={reopenedCount} accent={reopenedCount > 0 ? 'text-destructive' : undefined} description="OS que foram reabertas após terem sido concluídas, indicando retrabalho." />
      </div>

      {overdue > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-destructive/8 border border-destructive/15 rounded-xl p-3 text-xs text-destructive font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{overdue} OS com SLA atrasado no momento</span>
          <Badge variant="destructive" className="ml-auto text-[10px]">Atenção</Badge>
        </motion.div>
      )}

      {/* ─── Gauges Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GaugeCard title="Conformidade SLA" value={slaCompliance} data={slaGaugeData} subtitle={`${overdue} atrasadas de ${total} total`} />
        <GaugeCard title="Taxa de Resolução" value={resolutionRate} data={resRateGaugeData} subtitle={`${resolved} resolvidas de ${total} total`} />
      </div>

      {/* ─── Tabs ───────────────────────────────────────────── */}
      <Tabs defaultValue="os" className="space-y-4">
        <TabsList className="bg-card border border-border h-10 p-1 rounded-xl flex-wrap">
          <TabsTrigger value="os" className="text-xs h-8 rounded-lg data-[state=active]:shadow-sm"><BarChart3 className="h-3.5 w-3.5 mr-1.5" />Ordens de Serviço</TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs h-8 rounded-lg data-[state=active]:shadow-sm"><Cpu className="h-3.5 w-3.5 mr-1.5" />Indicadores Avançados</TabsTrigger>
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
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradClosedR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
                  <Area type="monotone" dataKey="created" name="Criadas" stroke="hsl(var(--primary))" fill="url(#gradCreated)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  <Area type="monotone" dataKey="closed" name="Encerradas" stroke="hsl(142, 71%, 45%)" fill="url(#gradClosedR)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Status Donut */}
            <ChartCard title="Distribuição por Status" icon={Layers}>
              {statusData.length === 0 ? <EmptyChart /> : (
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                          {statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{total}</p>
                        <p className="text-[9px] text-muted-foreground">total</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {statusData.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                        <span className="truncate text-muted-foreground flex-1">{d.name}</span>
                        <span className="font-semibold tabular-nums">{d.value}</span>
                        <span className="text-muted-foreground tabular-nums">({total > 0 ? Math.round((d.value / total) * 100) : 0}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ChartCard>

            {/* Priority Donut */}
            <ChartCard title="Distribuição por Prioridade" icon={AlertTriangle}>
              {priorityData.length === 0 ? <EmptyChart /> : (
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie data={priorityData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                          {priorityData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{total}</p>
                        <p className="text-[9px] text-muted-foreground">total</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {priorityData.map((d, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                            <span className="text-muted-foreground">{d.name}</span>
                          </div>
                          <span className="font-semibold tabular-nums">{d.value}</span>
                        </div>
                        <Progress value={total > 0 ? (d.value / total) * 100 : 0} className="h-1" />
                      </div>
                    ))}
                  </div>
                </div>
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
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="OS Abertas" radius={[6, 6, 0, 0]}>
                        {agingData.map((d, i) => <Cell key={i} fill={d.fill} />)}
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
                  <AreaChart data={resolutionTrendData}>
                    <defs>
                      <linearGradient id="gradRes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} unit="h" axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} formatter={(value: any) => [`${value}h`, 'Tempo médio']} />
                    <Area type="monotone" dataKey="avgHours" name="Tempo médio" stroke="hsl(var(--primary))" fill="url(#gradRes)" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--primary))' }} activeDot={{ r: 5 }} />
                  </AreaChart>
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
                              "mx-auto w-10 h-8 rounded-lg flex items-center justify-center font-semibold text-xs transition-colors",
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

        {/* ═══════════ Advanced Indicators Tab ═══════════ */}
        <TabsContent value="advanced" className="space-y-4">
          {/* Advanced KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPICard icon={Wrench} label="MTTR" value={mttr > 0 ? `${mttr}h` : '-'} accent={mttr > 0 && mttr <= 8 ? 'text-emerald-500' : mttr > 24 ? 'text-destructive' : undefined} description="Mean Time To Repair — Tempo médio entre o início do atendimento e a resolução da OS. Meta: abaixo de 8h." />
            <KPICard icon={CircleDot} label="MTBF" value={mtbf > 0 ? `${mtbf}h` : '-'} accent={mtbf > 168 ? 'text-emerald-500' : mtbf > 0 ? 'text-amber-500' : undefined} description="Mean Time Between Failures — Intervalo médio entre falhas em ativos com múltiplas OS. Meta: acima de 168h (1 semana)." />
            <KPICard icon={DollarSign} label="Custo Médio/OS" value={avgCostPerOS > 0 ? `R$ ${avgCostPerOS.toFixed(0)}` : '-'} description="Valor médio gasto por ordem de serviço, incluindo mão de obra e peças/materiais." />
            <KPICard icon={DollarSign} label="Custo Total" value={totalCost > 0 ? `R$ ${totalCost.toFixed(0)}` : '-'} accent="text-primary" description="Soma de todos os custos registrados nas OS do período selecionado." />
          </div>

          {/* MTTR / MTBF explanation cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-transparent shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Wrench className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">MTTR — Tempo Médio de Reparo</p>
                    <p className="text-[11px] text-muted-foreground">Mean Time To Repair</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold tracking-tight">{mttr > 0 ? mttr : '—'}</span>
                  <span className="text-sm text-muted-foreground">horas</span>
                </div>
                <Progress value={mttr > 0 ? Math.min((mttr / 48) * 100, 100) : 0} className="h-2 mb-2" />
                <p className="text-[11px] text-muted-foreground">
                  Tempo médio entre o início do atendimento e a resolução. Meta: &lt; 8h.
                </p>
              </CardContent>
            </Card>

            <Card className="border-transparent shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <CircleDot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">MTBF — Tempo Médio Entre Falhas</p>
                    <p className="text-[11px] text-muted-foreground">Mean Time Between Failures</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold tracking-tight">{mtbf > 0 ? mtbf : '—'}</span>
                  <span className="text-sm text-muted-foreground">horas</span>
                </div>
                <Progress value={mtbf > 0 ? Math.min((mtbf / 720) * 100, 100) : 0} className="h-2 mb-2" />
                <p className="text-[11px] text-muted-foreground">
                  Intervalo médio entre falhas em ativos com múltiplas OS. Meta: &gt; 168h (1 semana).
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cost Trend */}
          <ChartCard title="Tendência de Custos" subtitle="Mão de obra vs Peças ao longo do período" icon={DollarSign}>
            {costTrend.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={costTrend}>
                  <defs>
                    <linearGradient id="gradLabor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradParts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, '']} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
                  <Area type="monotone" dataKey="labor" name="Mão de Obra" stroke="hsl(var(--primary))" fill="url(#gradLabor)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  <Area type="monotone" dataKey="parts" name="Peças/Materiais" stroke="hsl(38, 92%, 50%)" fill="url(#gradParts)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Cost by Priority */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Custo por Prioridade" icon={AlertTriangle}>
              {costByPriority.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={costByPriority}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Custo']} />
                    <Bar dataKey="value" name="Custo Total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]}>
                      {costByPriority.map((_, i) => <Cell key={i} fill={Object.values(PRIORITY_COLORS)[i] || 'hsl(var(--primary))'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Cost Summary */}
            <ChartCard title="Resumo Financeiro" icon={DollarSign}>
              <div className="space-y-4 py-2">
                {[
                  { label: 'Custo Total (Mão de Obra)', value: closedWO.reduce((a: number, wo: any) => a + (wo.labor_cost || 0), 0), color: 'text-primary' },
                  { label: 'Custo Total (Peças)', value: closedWO.reduce((a: number, wo: any) => a + (wo.parts_cost || 0), 0), color: 'text-amber-500' },
                  { label: 'Custo Total Geral', value: totalCost, color: 'text-foreground' },
                  { label: 'Custo Médio por OS', value: avgCostPerOS, color: 'text-muted-foreground' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className={cn('text-sm font-bold tabular-nums', item.color)}>
                      R$ {item.value.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <ChartCard title="Desempenho por Técnico" subtitle="Atribuídas vs Resolvidas" icon={Users}>
            {techPerformance.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={Math.max(220, techPerformance.length * 50)}>
                <BarChart data={techPerformance} layout="vertical" barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={130} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
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
                  <Card className="border-transparent shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] rounded-xl">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{t.name}</p>
                          <p className="text-[11px] text-muted-foreground">{t.resolved}/{t.total} OS resolvidas</p>
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Taxa de resolução</span>
                            <span className={cn('font-semibold', t.rate >= 70 ? 'text-emerald-500' : 'text-amber-500')}>{t.rate}%</span>
                          </div>
                          <Progress value={t.rate} className="h-1.5" />
                        </div>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Avaliações" fill="hsl(38, 92%, 50%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <ChartCard title="Tendência de Satisfação" subtitle="Evolução da nota média ao longo do período" icon={TrendingUp}>
            {satisfactionTrend.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={satisfactionTrend}>
                  <defs>
                    <linearGradient id="gradSat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} domain={[0, 5]} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} formatter={(value: any) => [value, 'Nota média']} />
                  <Area type="monotone" dataKey="avgRating" name="Nota média" stroke="hsl(38, 92%, 50%)" fill="url(#gradSat)" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(38, 92%, 50%)' }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

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
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={120} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
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

function KPICard({ icon: Icon, label, value, accent, change, description }: { icon: React.ElementType; label: string; value: string | number; accent?: string; change?: number; description?: string }) {
  const content = (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-transparent shadow-[0_1px_3px_0_hsl(var(--foreground)/0.04)] hover:shadow-[0_4px_12px_0_hsl(var(--foreground)/0.08)] transition-shadow rounded-xl overflow-hidden group cursor-default">
        <CardContent className="p-3 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
              {label}
              {description && <Info className="h-2.5 w-2.5 opacity-40" />}
            </p>
            <div className="flex items-center gap-1.5">
              <p className={cn('text-lg font-bold leading-tight tracking-tight', accent)}>{value}</p>
              {change !== undefined && change !== 0 && (
                <Badge variant="secondary" className={cn('text-[9px] h-4 px-1', change > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600')}>
                  {change > 0 ? '+' : ''}{change}%
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  if (!description) return content;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px] text-[11px] leading-relaxed">
          {description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function GaugeCard({ title, value, data, subtitle }: { title: string; value: number; data: any[]; subtitle: string }) {
  return (
    <Card className="border-transparent shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] rounded-xl">
      <CardContent className="p-5 flex items-center gap-6">
        <div className="relative shrink-0">
          <ResponsiveContainer width={120} height={120}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="90%" barSize={10} data={data} startAngle={90} endAngle={-270}>
              <RadialBar background={{ fill: 'hsl(var(--muted))' }} dataKey="value" cornerRadius={10} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className={cn('text-2xl font-bold', value >= 90 ? 'text-emerald-500' : value >= 70 ? 'text-amber-500' : 'text-destructive')}>
              {value}%
            </p>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
          <Badge variant="secondary" className={cn('mt-2 text-[10px]',
            value >= 90 ? 'bg-emerald-500/10 text-emerald-600' :
            value >= 70 ? 'bg-amber-500/10 text-amber-600' :
            'bg-destructive/10 text-destructive'
          )}>
            {value >= 90 ? 'Excelente' : value >= 70 ? 'Atenção' : 'Crítico'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, subtitle, icon: Icon, iconAccent, children }: {
  title: string; subtitle?: string; icon?: React.ElementType; iconAccent?: string; children: React.ReactNode;
}) {
  return (
    <Card className="border-transparent shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] rounded-xl">
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

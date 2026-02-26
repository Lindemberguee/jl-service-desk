import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAllTenantsQuery } from '@/hooks/useAllTenantsQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/lib/permissions';
import { SlaIndicator } from '@/components/SlaIndicator';
import {
  ClipboardList, AlertTriangle, Clock, Zap, ChevronRight, Building2,
  TrendingUp, TrendingDown, CheckCircle2, Hourglass, BarChart3, Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, AreaChart, Area, Legend
} from 'recharts';
import { format, subDays, startOfDay, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  // --- Status distribution for pie chart ---
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    activeWOs.forEach((wo: any) => {
      counts[wo.status] = (counts[wo.status] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([status, count]) => ({
        name: statusLabels[status] || status,
        value: count,
        color: STATUS_CHART_COLORS[status] || 'hsl(215, 14%, 46%)',
      }))
      .sort((a, b) => b.value - a.value);
  }, [activeWOs]);

  // --- Priority distribution for pie chart ---
  const priorityDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    activeWOs.forEach((wo: any) => {
      counts[wo.priority] = (counts[wo.priority] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([priority, count]) => ({
        name: priorityLabels[priority] || priority,
        value: count,
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
      const nextDay = startOfDay(subDays(new Date(), i - 1));

      const opened = workOrders.filter((wo: any) => {
        const d = startOfDay(parseISO(wo.created_at));
        return format(d, 'yyyy-MM-dd') === dayStr;
      }).length;

      const closed = workOrders.filter((wo: any) => {
        if (!wo.closed_at && !wo.resolved_at) return false;
        const d = startOfDay(parseISO(wo.closed_at || wo.resolved_at));
        return format(d, 'yyyy-MM-dd') === dayStr;
      }).length;

      days.push({ date: label, abertas: opened, concluidas: closed });
    }
    return days;
  }, [workOrders]);

  // --- Status bar chart (horizontal) ---
  const statusBarData = useMemo(() => {
    const counts: Record<string, number> = {};
    workOrders.forEach((wo: any) => {
      counts[wo.status] = (counts[wo.status] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([status, count]) => ({
        name: statusLabels[status] || status,
        total: count,
        fill: STATUS_CHART_COLORS[status] || 'hsl(215, 14%, 46%)',
      }))
      .sort((a, b) => b.total - a.total);
  }, [workOrders]);

  const stats = [
    { label: 'Ativas', value: totalActive, icon: ClipboardList, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'Em Execução', value: inProgress, icon: Clock, color: 'text-warning', bgColor: 'bg-warning/10' },
    { label: 'Críticas', value: critical, icon: Zap, color: 'text-destructive', bgColor: 'bg-destructive/10' },
    { label: 'SLA Atrasadas', value: overdue, icon: AlertTriangle, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { label: 'Encerradas (mês)', value: closedThisMonth, icon: CheckCircle2, color: 'text-success', bgColor: 'bg-success/10' },
  ];

  const recentOrders = workOrders.slice(0, 8);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    if (percent < 0.08) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Olá, <span className="font-medium text-foreground">{profile?.name || 'Usuário'}</span>. Visão geral das operações.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50 shadow-none hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`h-9 w-9 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
              )}
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trend Chart */}
        <Card className="border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Tendência (últimos 14 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradOpen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(213, 94%, 38%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(213, 94%, 38%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradClosed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 38%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142, 71%, 38%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="abertas" name="Abertas" stroke="hsl(213, 94%, 38%)" fill="url(#gradOpen)" strokeWidth={2} />
                  <Area type="monotone" dataKey="concluidas" name="Concluídas" stroke="hsl(142, 71%, 38%)" fill="url(#gradClosed)" strokeWidth={2} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status Pie Chart */}
        <Card className="border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : statusDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
                Sem dados
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      labelLine={false}
                      label={PieLabel}
                    >
                      {statusDistribution.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {statusDistribution.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate text-muted-foreground">{item.name}</span>
                      <span className="ml-auto font-semibold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Priority Pie */}
        <Card className="border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-warning" />
              Distribuição por Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : priorityDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                Sem dados
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={priorityDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                      labelLine={false}
                      label={PieLabel}
                    >
                      {priorityDistribution.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {priorityDistribution.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate text-muted-foreground">{item.name}</span>
                      <span className="ml-auto font-semibold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Bar Chart */}
        <Card className="border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Volume por Status (todas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : statusBarData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                Sem dados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusBarData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Total" radius={[0, 4, 4, 0]} barSize={16}>
                    {statusBarData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Work Orders */}
      <Card className="border-border/50 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Ordens Recentes</CardTitle>
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

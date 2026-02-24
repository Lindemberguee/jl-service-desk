import { useState, useMemo } from 'react';
import { useTenantQuery } from '@/hooks/useTenantQuery';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { statusLabels, priorityLabels } from '@/lib/permissions';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { ClipboardList, Clock, Star, Package, TrendingUp, AlertTriangle, CheckCircle, Timer } from 'lucide-react';
import { format, subDays, subMonths, isAfter, parseISO, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(262, 60%, 55%)', 'hsl(38, 92%, 50%)', 'hsl(142, 71%, 45%)', 'hsl(0, 72%, 51%)', 'hsl(199, 89%, 48%)', 'hsl(330, 70%, 55%)', 'hsl(170, 60%, 45%)'];
const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' };

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

  // --- OS Stats ---
  const total = filteredWO.length;
  const resolved = closedWO.length;
  const overdue = filteredWO.filter((wo: any) => wo.resolve_due_at && new Date(wo.resolve_due_at) < new Date() && !['encerrada', 'concluida', 'aprovada'].includes(wo.status)).length;

  // Status distribution
  const statusData = useMemo(() => Object.entries(statusLabels).map(([key, label]) => ({
    name: label,
    value: filteredWO.filter((wo: any) => wo.status === key).length,
  })).filter(d => d.value > 0), [filteredWO]);

  // Priority distribution
  const priorityData = useMemo(() => Object.entries(priorityLabels).map(([key, label]) => ({
    name: label,
    value: filteredWO.filter((wo: any) => wo.priority === key).length,
  })).filter(d => d.value > 0), [filteredWO]);

  // Volume trend by day/week
  const trendData = useMemo(() => {
    const groups: Record<string, { created: number; closed: number }> = {};
    const fmt = period === '12m' ? 'MMM/yy' : 'dd/MM';
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
  }, [filteredWO, closedWO, period]);

  // --- Resolution Time ---
  const avgResolutionHours = useMemo(() => {
    const resolved = filteredWO.filter((wo: any) => wo.resolved_at);
    if (resolved.length === 0) return 0;
    const totalHours = resolved.reduce((acc: number, wo: any) => {
      return acc + differenceInHours(parseISO(wo.resolved_at), parseISO(wo.created_at));
    }, 0);
    return Math.round(totalHours / resolved.length);
  }, [filteredWO]);

  // Resolution by technician
  const techPerformance = useMemo(() => {
    const techs = memberships.filter((m: any) => ['tecnico', 'coordenador', 'admin', 'super_admin'].includes(m.role));
    return techs.map((t: any) => {
      const assigned = filteredWO.filter((wo: any) => wo.assigned_to_id === t.user_id);
      const resolved = assigned.filter((wo: any) => wo.resolved_at);
      const avgHrs = resolved.length > 0
        ? Math.round(resolved.reduce((a: number, wo: any) => a + differenceInHours(parseISO(wo.resolved_at), parseISO(wo.created_at)), 0) / resolved.length)
        : 0;
      return {
        name: t.profiles?.name || 'Sem nome',
        total: assigned.length,
        resolved: resolved.length,
        avgHours: avgHrs,
      };
    }).filter(t => t.total > 0).sort((a, b) => b.resolved - a.resolved);
  }, [memberships, filteredWO]);

  // --- Satisfaction ---
  const ratingEvents = useMemo(() => {
    return events.filter((ev: any) => {
      const payload = ev.payload as any;
      return ev.type === 'closed' && payload?.rating && isAfter(parseISO(ev.created_at), cutoff);
    });
  }, [events, cutoff]);

  const avgRating = useMemo(() => {
    if (ratingEvents.length === 0) return 0;
    const sum = ratingEvents.reduce((a: number, ev: any) => a + ((ev.payload as any)?.rating || 0), 0);
    return (sum / ratingEvents.length).toFixed(1);
  }, [ratingEvents]);

  const ratingDistribution = useMemo(() => {
    return [5, 4, 3, 2, 1].map(star => ({
      name: `${star}★`,
      value: ratingEvents.filter((ev: any) => (ev.payload as any)?.rating === star).length,
    }));
  }, [ratingEvents]);

  // --- Stock ---
  const lowStockItems = stockItems.filter((i: any) => (i.current_level || 0) <= (i.min_level || 0) && i.min_level > 0);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Relatórios</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Análise operacional e indicadores de desempenho</p>
        </div>
        <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
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

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard icon={ClipboardList} label="OS no período" value={total} />
        <KPICard icon={CheckCircle} label="Resolvidas" value={resolved} accent="text-green-500" />
        <KPICard icon={Timer} label="Tempo médio" value={`${avgResolutionHours}h`} />
        <KPICard icon={Star} label="Satisfação" value={avgRating ? `${avgRating} ★` : '-'} accent="text-yellow-500" />
      </div>

      {overdue > 0 && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-md p-2.5 text-xs text-destructive font-medium">
          <AlertTriangle className="h-3.5 w-3.5" />
          {overdue} OS com SLA atrasado no momento
        </div>
      )}

      <Tabs defaultValue="os" className="space-y-3">
        <TabsList className="bg-card border border-border h-9">
          <TabsTrigger value="os" className="text-xs h-7">Ordens de Serviço</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs h-7">Desempenho</TabsTrigger>
          <TabsTrigger value="satisfaction" className="text-xs h-7">Satisfação</TabsTrigger>
          <TabsTrigger value="stock" className="text-xs h-7">Estoque</TabsTrigger>
        </TabsList>

        {/* OS Tab */}
        <TabsContent value="os" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border shadow-none">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tendência de Volume</CardTitle></CardHeader>
              <CardContent>
                {trendData.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="created" name="Criadas" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="closed" name="Encerradas" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-none">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Por Status</CardTitle></CardHeader>
              <CardContent>
                {statusData.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={statusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" angle={-25} textAnchor="end" height={50} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Por Prioridade</CardTitle></CardHeader>
            <CardContent>
              {priorityData.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={priorityData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {priorityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card className="border-border shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Desempenho por Técnico</CardTitle></CardHeader>
            <CardContent>
              {techPerformance.length === 0 ? (
                <p className="text-center py-12 text-sm text-muted-foreground">Sem dados no período.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, techPerformance.length * 45)}>
                  <BarChart data={techPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={120} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="total" name="Atribuídas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="resolved" name="Resolvidas" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {techPerformance.length > 0 && (
            <Card className="border-border shadow-none">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tempo Médio de Resolução por Técnico</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {techPerformance.map((t, i) => (
                    <div key={i} className="bg-muted/30 rounded-md p-3 border border-border">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
                        <span>{t.resolved}/{t.total} OS</span>
                        <span className="font-medium text-foreground">{t.avgHours}h média</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Satisfaction Tab */}
        <TabsContent value="satisfaction" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border shadow-none">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Nota Média</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-col items-center py-6">
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`h-8 w-8 ${s <= Math.round(Number(avgRating)) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                  <p className="text-3xl font-bold">{avgRating || '-'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{ratingEvents.length} avaliações no período</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-none">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Distribuição de Notas</CardTitle></CardHeader>
              <CardContent>
                {ratingEvents.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={ratingDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" name="Avaliações" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stock Tab */}
        <TabsContent value="stock" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KPICard icon={Package} label="Total de itens" value={stockItems.length} />
            <KPICard icon={AlertTriangle} label="Estoque baixo" value={lowStockItems.length} accent={lowStockItems.length > 0 ? 'text-destructive' : undefined} />
            <KPICard icon={TrendingUp} label="Saídas no período" value={stockMovements.filter((m: any) => m.type === 'out' && isAfter(parseISO(m.created_at), cutoff)).length} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border shadow-none">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Itens Mais Consumidos</CardTitle></CardHeader>
              <CardContent>
                {topConsumed.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={Math.max(200, topConsumed.length * 35)}>
                    <BarChart data={topConsumed} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={120} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="qty" name="Saídas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {lowStockItems.length > 0 && (
              <Card className="border-border shadow-none">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Itens Abaixo do Mínimo
                </CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {lowStockItems.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between bg-destructive/5 border border-destructive/10 rounded-md p-2.5">
                        <div>
                          <p className="text-sm font-medium">{item.name}</p>
                          {item.sku && <p className="text-[11px] text-muted-foreground">SKU: {item.sku}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-destructive">{item.current_level}</p>
                          <p className="text-[10px] text-muted-foreground">Mín: {item.min_level}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string | number; accent?: string }) {
  return (
    <Card className="border-border shadow-none">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground truncate">{label}</p>
          <p className={`text-lg font-bold leading-tight ${accent || ''}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return <p className="text-center py-12 text-sm text-muted-foreground">Sem dados para exibir.</p>;
}

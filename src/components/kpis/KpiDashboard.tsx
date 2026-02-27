import { useKpis } from '@/hooks/useKpis';
import { useOkrs } from '@/hooks/useOkrs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Target, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

function KpiStatusBadge({ value, target, direction, warning, critical }: {
  value: number; target: number; direction: string; warning?: number | null; critical?: number | null;
}) {
  const pct = target !== 0 ? (value / target) * 100 : 0;
  const isHigherBetter = direction === 'higher_is_better';

  let status: 'success' | 'warning' | 'danger' = 'success';
  if (isHigherBetter) {
    if (critical && value <= critical) status = 'danger';
    else if (warning && value <= warning) status = 'warning';
  } else {
    if (critical && value >= critical) status = 'danger';
    else if (warning && value >= warning) status = 'warning';
  }

  const colors = {
    success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    danger: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  const icons = {
    success: <TrendingUp className="h-3 w-3" />,
    warning: <Minus className="h-3 w-3" />,
    danger: <TrendingDown className="h-3 w-3" />,
  };

  return (
    <Badge variant="outline" className={cn('gap-1 text-xs', colors[status])}>
      {icons[status]}
      {pct.toFixed(0)}%
    </Badge>
  );
}

export function KpiDashboard() {
  const { kpis, entries, isLoading } = useKpis();
  const { cycles, objectives, keyResults } = useOkrs();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const activeKpis = kpis.filter(k => k.is_active);
  const activeCycle = cycles.find(c => c.status === 'active');
  const cycleObjectives = activeCycle ? objectives.filter(o => o.cycle_id === activeCycle.id) : [];
  const cycleKRs = cycleObjectives.flatMap(o => keyResults.filter(kr => kr.objective_id === o.id));

  // Latest entry per KPI
  const latestEntries = new Map<string, number>();
  for (const e of entries) {
    if (!latestEntries.has(e.kpi_id)) latestEntries.set(e.kpi_id, e.value);
  }

  // Chart data: last 30 days trend for top KPIs
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(new Date(), 29 - i);
    return format(d, 'yyyy-MM-dd');
  });

  const trendData = last30.map(date => {
    const point: Record<string, any> = { date: format(parseISO(date), 'dd/MM', { locale: ptBR }) };
    activeKpis.slice(0, 4).forEach(kpi => {
      const entry = entries.find(e => e.kpi_id === kpi.id && e.period_end === date);
      point[kpi.name] = entry?.value ?? null;
    });
    return point;
  });

  // OKR summary
  const avgObjectiveProgress = cycleObjectives.length > 0
    ? cycleObjectives.reduce((sum, o) => sum + o.progress, 0) / cycleObjectives.length : 0;

  const okrRadialData = [
    { name: 'Progresso', value: Math.round(avgObjectiveProgress), fill: 'hsl(var(--primary))' },
  ];

  const statusCounts = {
    on_track: cycleObjectives.filter(o => o.status === 'on_track').length,
    at_risk: cycleObjectives.filter(o => o.status === 'at_risk').length,
    behind: cycleObjectives.filter(o => o.status === 'behind').length,
    completed: cycleObjectives.filter(o => o.status === 'completed').length,
  };

  const kpiColors = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeKpis.slice(0, 8).map(kpi => {
          const currentValue = latestEntries.get(kpi.id) ?? 0;
          return (
            <Card key={kpi.id} className="relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: kpi.color }} />
              <CardContent className="p-4 pl-5">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.category}</p>
                  <KpiStatusBadge
                    value={currentValue}
                    target={kpi.target_value}
                    direction={kpi.direction}
                    warning={kpi.warning_threshold}
                    critical={kpi.critical_threshold}
                  />
                </div>
                <p className="text-2xl font-bold tracking-tight">{currentValue.toLocaleString('pt-BR')} <span className="text-sm font-normal text-muted-foreground">{kpi.unit}</span></p>
                <p className="text-sm text-muted-foreground mt-1">{kpi.name}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Progresso</span>
                    <span>Meta: {kpi.target_value.toLocaleString('pt-BR')}</span>
                  </div>
                  <Progress value={Math.min((currentValue / (kpi.target_value || 1)) * 100, 100)} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {activeKpis.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">Nenhum KPI configurado</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-md">
              Acesse a aba "Indicadores" para criar seus primeiros KPIs e começar a monitorar a performance.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        {activeKpis.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Tendência — Últimos 30 dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  />
                  {activeKpis.slice(0, 4).map((kpi, i) => (
                    <Area
                      key={kpi.id}
                      type="monotone"
                      dataKey={kpi.name}
                      stroke={kpiColors[i]}
                      fill={kpiColors[i]}
                      fillOpacity={0.1}
                      strokeWidth={2}
                      connectNulls
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* OKR Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              {activeCycle ? activeCycle.name : 'OKRs'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeCycle ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width={140} height={140}>
                    <RadialBarChart
                      cx="50%" cy="50%" innerRadius="70%" outerRadius="100%"
                      startAngle={90} endAngle={-270} data={okrRadialData}
                      barSize={12}
                    >
                      <RadialBar background dataKey="value" cornerRadius={6} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute text-center">
                    <span className="text-3xl font-bold">{Math.round(avgObjectiveProgress)}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <p className="text-lg font-bold text-emerald-500">{statusCounts.on_track}</p>
                    <p className="text-[10px] text-muted-foreground">No caminho</p>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 p-2">
                    <p className="text-lg font-bold text-amber-500">{statusCounts.at_risk}</p>
                    <p className="text-[10px] text-muted-foreground">Em risco</p>
                  </div>
                  <div className="rounded-lg bg-destructive/10 p-2">
                    <p className="text-lg font-bold text-destructive">{statusCounts.behind}</p>
                    <p className="text-[10px] text-muted-foreground">Atrasados</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-2">
                    <p className="text-lg font-bold text-primary">{statusCounts.completed}</p>
                    <p className="text-[10px] text-muted-foreground">Concluídos</p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground text-center">
                  {cycleObjectives.length} objetivos · {cycleKRs.length} resultados-chave
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Target className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum ciclo OKR ativo</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Crie um ciclo na aba OKRs</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

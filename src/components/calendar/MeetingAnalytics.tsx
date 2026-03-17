import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import {
  Clock, CalendarDays, TrendingUp, Download, Users, BarChart3,
} from 'lucide-react';

interface CalEvent {
  uid: string;
  summary: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  calendarName: string;
  calendarColor: string;
}

type Period = 'week' | 'month' | 'quarter';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Alinhamento': ['alinhamento', 'sync', 'daily', 'standup', 'stand-up', 'weekly', 'status'],
  '1:1': ['1:1', '1-1', 'one on one', 'one-on-one', '1x1'],
  'Planejamento': ['planejamento', 'planning', 'sprint', 'roadmap', 'kickoff'],
  'Apresentação': ['apresentação', 'apresentacao', 'demo', 'review', 'retrospectiva', 'retro'],
  'Cliente': ['cliente', 'client', 'customer', 'externo', 'parceiro'],
  'Treinamento': ['treinamento', 'training', 'workshop', 'onboarding', 'capacitação'],
};

function categorizeEvent(summary: string): string {
  const lower = summary.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return cat;
  }
  return 'Outros';
}

const COLORS = ['hsl(var(--primary))', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

interface Props {
  events: CalEvent[];
}

export function MeetingAnalytics({ events }: Props) {
  const [period, setPeriod] = useState<Period>('month');

  const now = new Date();

  const filteredEvents = useMemo(() => {
    const cutoff = new Date();
    if (period === 'week') cutoff.setDate(cutoff.getDate() - 7);
    else if (period === 'month') cutoff.setMonth(cutoff.getMonth() - 1);
    else cutoff.setMonth(cutoff.getMonth() - 3);
    return events.filter((e) => e.start >= cutoff && e.start <= now);
  }, [events, period]);

  const stats = useMemo(() => {
    const totalMeetings = filteredEvents.length;
    const totalMinutes = filteredEvents.reduce((sum, e) => {
      return sum + Math.max(0, (e.end.getTime() - e.start.getTime()) / 60000);
    }, 0);
    const totalHours = totalMinutes / 60;
    const avgDuration = totalMeetings > 0 ? totalMinutes / totalMeetings : 0;

    // Unique days with meetings
    const uniqueDays = new Set(
      filteredEvents.map((e) => e.start.toISOString().slice(0, 10))
    ).size;

    const avgPerDay = uniqueDays > 0 ? totalMeetings / uniqueDays : 0;

    // Weeks count for period
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    const weeks = Math.max(1, days / 7);
    const avgPerWeek = totalMeetings / weeks;

    return { totalMeetings, totalHours, avgDuration, avgPerDay, avgPerWeek, uniqueDays };
  }, [filteredEvents, period]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredEvents.forEach((e) => {
      const cat = categorizeEvent(e.summary);
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredEvents]);

  // Daily distribution
  const dailyData = useMemo(() => {
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const counts = Array(7).fill(0);
    const hours = Array(7).fill(0);
    filteredEvents.forEach((e) => {
      const day = e.start.getDay();
      counts[day]++;
      hours[day] += Math.max(0, (e.end.getTime() - e.start.getTime()) / 3600000);
    });
    return dayNames.map((name, i) => ({
      name,
      reunioes: counts[i],
      horas: Number(hours[i].toFixed(1)),
    }));
  }, [filteredEvents]);

  // Timeline (meetings per day)
  const timelineData = useMemo(() => {
    const map: Record<string, { count: number; hours: number }> = {};
    filteredEvents.forEach((e) => {
      const key = e.start.toISOString().slice(0, 10);
      if (!map[key]) map[key] = { count: 0, hours: 0 };
      map[key].count++;
      map[key].hours += Math.max(0, (e.end.getTime() - e.start.getTime()) / 3600000);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        reunioes: v.count,
        horas: Number(v.hours.toFixed(1)),
      }));
  }, [filteredEvents]);

  // Export CSV
  function exportCSV() {
    const header = 'Título,Data,Início,Fim,Duração (min),Categoria,Calendário,Local\n';
    const rows = filteredEvents.map((e) => {
      const dur = Math.round((e.end.getTime() - e.start.getTime()) / 60000);
      const cat = categorizeEvent(e.summary);
      return [
        `"${e.summary.replace(/"/g, '""')}"`,
        e.start.toLocaleDateString('pt-BR'),
        e.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        e.end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        dur,
        cat,
        e.calendarName,
        `"${(e.location || '').replace(/"/g, '""')}"`,
      ].join(',');
    });
    const csv = header + rows.join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const periodLabel = period === 'week' ? 'semana' : period === 'month' ? 'mes' : 'trimestre';
    a.download = `relatorio-reunioes-${periodLabel}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const periodLabel = period === 'week' ? 'na última semana' : period === 'month' ? 'no último mês' : 'no último trimestre';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Métricas de Reuniões</span>
          <Badge variant="secondary" className="text-[10px]">{periodLabel}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Último mês</SelectItem>
              <SelectItem value="quarter">Último trimestre</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={filteredEvents.length === 0}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total de Reuniões', value: stats.totalMeetings, icon: CalendarDays, suffix: '' },
          { label: 'Horas em Reunião', value: stats.totalHours.toFixed(1), icon: Clock, suffix: 'h' },
          { label: 'Duração Média', value: Math.round(stats.avgDuration), icon: TrendingUp, suffix: ' min' },
          { label: 'Média / Dia Útil', value: stats.avgPerDay.toFixed(1), icon: Users, suffix: '' },
          { label: 'Média / Semana', value: stats.avgPerWeek.toFixed(1), icon: BarChart3, suffix: '' },
          { label: 'Dias com Reunião', value: stats.uniqueDays, icon: CalendarDays, suffix: '' },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-0">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium">{kpi.label}</span>
              </div>
              <span className="text-lg font-bold tracking-tight">
                {kpi.value}{kpi.suffix}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Reuniões por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            {timelineData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Sem dados no período.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    formatter={(v: number, name: string) =>
                      [v, name === 'reunioes' ? 'Reuniões' : 'Horas']
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="reunioes"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.15)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* By category (Pie) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Sem dados no período.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    style={{ fontSize: 10 }}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* By weekday */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição por Dia da Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  formatter={(v: number, name: string) =>
                    [v, name === 'reunioes' ? 'Reuniões' : 'Horas']
                  }
                />
                <Bar dataKey="reunioes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="reunioes" />
                <Bar dataKey="horas" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} name="horas" />
                <Legend
                  formatter={(v) => (v === 'reunioes' ? 'Reuniões' : 'Horas')}
                  wrapperStyle={{ fontSize: 11 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category detail table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Detalhamento por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-muted-foreground">Categoria</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">Reuniões</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">Horas</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">Dur. Média</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">% do Total</th>
                </tr>
              </thead>
              <tbody>
                {categoryData.map((cat, i) => {
                  const catEvents = filteredEvents.filter(
                    (e) => categorizeEvent(e.summary) === cat.name
                  );
                  const totalMin = catEvents.reduce(
                    (s, e) => s + Math.max(0, (e.end.getTime() - e.start.getTime()) / 60000),
                    0
                  );
                  const pct = stats.totalMeetings > 0 ? (cat.value / stats.totalMeetings) * 100 : 0;
                  return (
                    <tr key={cat.name} className="border-b last:border-0">
                      <td className="py-2 flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        {cat.name}
                      </td>
                      <td className="text-center py-2 font-medium">{cat.value}</td>
                      <td className="text-center py-2">{(totalMin / 60).toFixed(1)}h</td>
                      <td className="text-center py-2">{Math.round(totalMin / cat.value)} min</td>
                      <td className="text-center py-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {pct.toFixed(0)}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

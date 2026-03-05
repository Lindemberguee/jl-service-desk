import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, BarChart3, MailCheck, MailX, Clock, TrendingUp, Mail, MessageSquare, RefreshCw,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DayStats { date: string; sent: number; failed: number; }

const PIE_COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#0ea5e9', '#ec4899'];

export default function NotificationMetricsPage() {
  const { currentTenantId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, queued: 0 });
  const [dailyData, setDailyData] = useState<DayStats[]>([]);
  const [byType, setByType] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    if (!currentTenantId) return;
    loadMetrics();
  }, [currentTenantId]);

  const loadMetrics = async () => {
    setLoading(true);
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

    const [logsRes, queueRes] = await Promise.all([
      supabase.from('email_logs').select('*').eq('tenant_id', currentTenantId!).gte('created_at', thirtyDaysAgo),
      supabase.from('email_queue').select('*').eq('tenant_id', currentTenantId!).in('status', ['pending', 'retrying', 'processing']),
    ]);

    const logs = (logsRes.data || []) as any[];
    const queue = (queueRes.data || []) as any[];

    const sent = logs.filter(l => l.status === 'sent').length;
    const failed = logs.filter(l => l.status === 'failed').length;
    setStats({ total: logs.length, sent, failed, queued: queue.length });

    // Daily breakdown (last 14 days)
    const daily: Record<string, { sent: number; failed: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      daily[d] = { sent: 0, failed: 0 };
    }
    for (const log of logs) {
      const d = format(new Date(log.created_at), 'yyyy-MM-dd');
      if (daily[d]) {
        if (log.status === 'sent') daily[d].sent++;
        else if (log.status === 'failed') daily[d].failed++;
      }
    }
    setDailyData(Object.entries(daily).map(([date, v]) => ({
      date: format(new Date(date), 'dd/MM', { locale: ptBR }),
      ...v,
    })));

    // By type
    const typeMap: Record<string, number> = {};
    for (const log of logs) {
      const t = log.email_type || 'outro';
      typeMap[t] = (typeMap[t] || 0) + 1;
    }
    const typeLabels: Record<string, string> = {
      test: 'Teste', os_created: 'OS Criada', os_status_changed: 'Status OS',
      stock_critical: 'Estoque', new_user: 'Novo Usuário', maintenance: 'Manutenção',
      sla_warning: 'SLA', custom: 'Personalizado',
    };
    setByType(Object.entries(typeMap).map(([k, v]) => ({ name: typeLabels[k] || k, value: v })));
    setLoading(false);
  };

  if (loading) return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-[300px]" />
    </div>
  );

  const successRate = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0;

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/integracoes')} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Métricas de Notificações</h1>
          <p className="text-sm text-muted-foreground">Estatísticas dos últimos 30 dias</p>
        </div>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" onClick={loadMetrics}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Atualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Enviados', value: stats.total, icon: Mail, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Sucesso', value: stats.sent, icon: MailCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Falhas', value: stats.failed, icon: MailX, color: 'text-red-500', bg: 'bg-red-500/10' },
          { label: 'Na Fila', value: stats.queued, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`h-8 w-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                {kpi.label === 'Sucesso' && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    {successRate}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Envios por Dia (14 dias)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Area type="monotone" dataKey="sent" name="Enviados" stroke="hsl(var(--primary))" fill="url(#colorSent)" strokeWidth={2} />
                <Area type="monotone" dataKey="failed" name="Falhas" stroke="#ef4444" fill="url(#colorFailed)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - By Type */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Por Tipo</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {byType.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                      {byType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {byType.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-[10px] text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft, BarChart3, MailCheck, MailX, Clock, TrendingUp, Mail, MessageSquare, RefreshCw, CheckCircle2, XCircle, Activity,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DayStats { date: string; sent: number; failed: number; }

const PIE_COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#0ea5e9', '#ec4899'];

const TYPE_LABELS: Record<string, string> = {
  test: 'Teste', os_created: 'OS Criada', os_status_changed: 'Status OS',
  stock_critical: 'Estoque', new_user: 'Novo Usuário', maintenance: 'Manutenção',
  sla_warning: 'SLA', custom: 'Personalizado',
};

export default function NotificationMetricsPage() {
  const { currentTenantId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [emailStats, setEmailStats] = useState({ total: 0, sent: 0, failed: 0, queued: 0 });
  const [teamsStats, setTeamsStats] = useState({ total: 0, sent: 0, failed: 0 });
  const [dailyEmail, setDailyEmail] = useState<DayStats[]>([]);
  const [dailyTeams, setDailyTeams] = useState<DayStats[]>([]);
  const [byType, setByType] = useState<{ name: string; value: number }[]>([]);
  const [teamsLogs, setTeamsLogs] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!currentTenantId) return;
    loadMetrics();
  }, [currentTenantId]);

  const buildDaily = (logs: any[], statusField = 'status'): DayStats[] => {
    const daily: Record<string, { sent: number; failed: number }> = {};
    for (let i = 13; i >= 0; i--) {
      daily[format(subDays(new Date(), i), 'yyyy-MM-dd')] = { sent: 0, failed: 0 };
    }
    for (const log of logs) {
      const d = format(new Date(log.created_at), 'yyyy-MM-dd');
      if (daily[d]) {
        if (log[statusField] === 'sent') daily[d].sent++;
        else if (log[statusField] === 'failed') daily[d].failed++;
      }
    }
    return Object.entries(daily).map(([date, v]) => ({
      date: format(new Date(date), 'dd/MM', { locale: ptBR }), ...v,
    }));
  };

  const loadMetrics = async () => {
    setLoading(true);
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

    const [emailLogsRes, queueRes, teamsLogsRes] = await Promise.all([
      supabase.from('email_logs').select('*').eq('tenant_id', currentTenantId!).gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }),
      supabase.from('email_queue').select('*').eq('tenant_id', currentTenantId!).in('status', ['pending', 'retrying', 'processing']),
      supabase.from('teams_notification_logs' as any).select('*').eq('tenant_id', currentTenantId!).gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }),
    ]);

    const eLogs = (emailLogsRes.data || []) as any[];
    const queue = (queueRes.data || []) as any[];
    const tLogs = (teamsLogsRes.data || []) as any[];

    setEmailLogs(eLogs.slice(0, 50));
    setTeamsLogs(tLogs.slice(0, 50));

    const eSent = eLogs.filter(l => l.status === 'sent').length;
    const eFailed = eLogs.filter(l => l.status === 'failed').length;
    setEmailStats({ total: eLogs.length, sent: eSent, failed: eFailed, queued: queue.length });

    const tSent = tLogs.filter((l: any) => l.status === 'sent').length;
    const tFailed = tLogs.filter((l: any) => l.status === 'failed').length;
    setTeamsStats({ total: tLogs.length, sent: tSent, failed: tFailed });

    setDailyEmail(buildDaily(eLogs));
    setDailyTeams(buildDaily(tLogs));

    // Combined by type
    const typeMap: Record<string, number> = {};
    for (const log of eLogs) { const t = log.email_type || 'outro'; typeMap[t] = (typeMap[t] || 0) + 1; }
    for (const log of tLogs) { const t = (log as any).notification_type || 'outro'; typeMap[t] = (typeMap[t] || 0) + 1; }
    setByType(Object.entries(typeMap).map(([k, v]) => ({ name: TYPE_LABELS[k] || k, value: v })));
    setLoading(false);
  };

  if (loading) return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-[300px]" />
    </div>
  );

  const totalAll = emailStats.total + teamsStats.total;
  const totalSent = emailStats.sent + teamsStats.sent;
  const totalFailed = emailStats.failed + teamsStats.failed;
  const successRate = totalAll > 0 ? Math.round((totalSent / totalAll) * 100) : 0;

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/integracoes')} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Métricas de Notificações</h1>
          <p className="text-sm text-muted-foreground">Estatísticas de E-mail e Teams — últimos 30 dias</p>
        </div>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" onClick={loadMetrics}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Combined KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: totalAll, icon: Activity, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'E-mails', value: emailStats.total, icon: Mail, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Teams', value: teamsStats.total, icon: MessageSquare, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
          { label: 'Sucesso', value: totalSent, icon: MailCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10', badge: `${successRate}%` },
          { label: 'Falhas', value: totalFailed, icon: MailX, color: 'text-red-500', bg: 'bg-red-500/10' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`h-8 w-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                {'badge' in kpi && kpi.badge && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    {kpi.badge}
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs: Email / Teams / Logs */}
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="text-xs"><TrendingUp className="h-3.5 w-3.5 mr-1" /> Visão Geral</TabsTrigger>
          <TabsTrigger value="email" className="text-xs"><Mail className="h-3.5 w-3.5 mr-1" /> E-mail</TabsTrigger>
          <TabsTrigger value="teams" className="text-xs"><MessageSquare className="h-3.5 w-3.5 mr-1" /> Teams</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs"><Clock className="h-3.5 w-3.5 mr-1" /> Logs</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Envios por Dia (14 dias)</CardTitle></CardHeader>
              <CardContent>
                <ChartArea data={dailyEmail} label="E-mail" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Por Tipo</CardTitle></CardHeader>
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
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <StatMiniCard label="Enviados" value={emailStats.sent} icon={MailCheck} color="text-emerald-500" bg="bg-emerald-500/10" />
            <StatMiniCard label="Falhas" value={emailStats.failed} icon={MailX} color="text-red-500" bg="bg-red-500/10" />
            <StatMiniCard label="Na Fila" value={emailStats.queued} icon={Clock} color="text-amber-500" bg="bg-amber-500/10" />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Envios de E-mail (14 dias)</CardTitle></CardHeader>
            <CardContent><ChartArea data={dailyEmail} label="E-mail" /></CardContent>
          </Card>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <StatMiniCard label="Enviados" value={teamsStats.sent} icon={CheckCircle2} color="text-emerald-500" bg="bg-emerald-500/10" />
            <StatMiniCard label="Falhas" value={teamsStats.failed} icon={XCircle} color="text-red-500" bg="bg-red-500/10" />
            <StatMiniCard label="Total" value={teamsStats.total} icon={MessageSquare} color="text-indigo-500" bg="bg-indigo-500/10" />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Envios do Teams (14 dias)</CardTitle></CardHeader>
            <CardContent><ChartArea data={dailyTeams} label="Teams" /></CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          <Tabs defaultValue="teams_logs">
            <TabsList>
              <TabsTrigger value="teams_logs" className="text-xs"><MessageSquare className="h-3 w-3 mr-1" /> Teams</TabsTrigger>
              <TabsTrigger value="email_logs" className="text-xs"><Mail className="h-3 w-3 mr-1" /> E-mail</TabsTrigger>
            </TabsList>

            <TabsContent value="teams_logs" className="mt-3">
              <Card>
                <CardContent className="pt-4">
                  {teamsLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum log de envio do Teams encontrado</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Data</TableHead>
                            <TableHead className="text-xs">Tipo</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">Erro</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamsLogs.map((log: any) => (
                            <TableRow key={log.id}>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(new Date(log.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">
                                  {TYPE_LABELS[log.notification_type] || log.notification_type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {log.status === 'sent' ? (
                                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Enviado
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20">
                                    <XCircle className="h-2.5 w-2.5 mr-0.5" /> Falha
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                {log.error_message || '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email_logs" className="mt-3">
              <Card>
                <CardContent className="pt-4">
                  {emailLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum log de e-mail encontrado</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Data</TableHead>
                            <TableHead className="text-xs">Para</TableHead>
                            <TableHead className="text-xs">Tipo</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">Erro</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {emailLogs.map((log: any) => (
                            <TableRow key={log.id}>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(new Date(log.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                              </TableCell>
                              <TableCell className="text-xs max-w-[150px] truncate">{log.to_email}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">
                                  {TYPE_LABELS[log.email_type] || log.email_type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {log.status === 'sent' ? (
                                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Enviado
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20">
                                    <XCircle className="h-2.5 w-2.5 mr-0.5" /> Falha
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                {log.error_message || '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Reusable Sub-components ─────────────────────────────────────── */

function StatMiniCard({ label, value, icon: Icon, color, bg }: { label: string; value: number; icon: any; color: string; bg: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 flex items-center gap-3">
        <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div>
          <p className="text-lg font-bold">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartArea({ data, label }: { data: DayStats[]; label: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`sent-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`failed-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Area type="monotone" dataKey="sent" name="Enviados" stroke="hsl(var(--primary))" fill={`url(#sent-${label})`} strokeWidth={2} />
        <Area type="monotone" dataKey="failed" name="Falhas" stroke="#ef4444" fill={`url(#failed-${label})`} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

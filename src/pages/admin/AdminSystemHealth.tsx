import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Database, Users, ClipboardList, HardDrive, TrendingUp, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

export default function AdminSystemHealth() {
  const { data: profiles = [], isLoading: pLoading } = useQuery({
    queryKey: ['admin_health_profiles'],
    queryFn: async () => { const { data } = await supabase.from('profiles').select('id, is_active, created_at'); return data || []; },
  });

  const { data: workOrders = [], isLoading: woLoading } = useQuery({
    queryKey: ['admin_health_wo'],
    queryFn: async () => { const { data } = await supabase.from('work_orders').select('id, status, priority, created_at, resolved_at, started_at, tenant_id, deleted_at').is('deleted_at', null); return data || []; },
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['admin_health_memberships'],
    queryFn: async () => { const { data } = await supabase.from('user_memberships').select('id, is_active, role'); return data || []; },
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ['admin_health_tenants'],
    queryFn: async () => { const { data } = await supabase.from('tenants').select('id, is_active'); return data || []; },
  });

  const { data: auditCount = 0 } = useQuery({
    queryKey: ['admin_health_audit_count'],
    queryFn: async () => { const { count } = await supabase.from('audit_logs').select('id', { count: 'exact', head: true }); return count || 0; },
  });

  const isLoading = pLoading || woLoading;

  const stats = useMemo(() => {
    const now = new Date();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prev7d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const woLast7 = workOrders.filter(wo => new Date(wo.created_at) >= last7d).length;
    const woPrev7 = workOrders.filter(wo => new Date(wo.created_at) >= prev7d && new Date(wo.created_at) < last7d).length;
    const woTrend = woPrev7 > 0 ? ((woLast7 - woPrev7) / woPrev7 * 100) : 0;

    const resolvedOrders = workOrders.filter(wo => wo.resolved_at && wo.started_at);
    const avgResolutionMs = resolvedOrders.length > 0
      ? resolvedOrders.reduce((sum, wo) => sum + (new Date(wo.resolved_at!).getTime() - new Date(wo.started_at!).getTime()), 0) / resolvedOrders.length
      : 0;
    const avgResolutionHours = Math.round(avgResolutionMs / (1000 * 60 * 60));

    const statusDistribution = workOrders.reduce((acc, wo) => { acc[wo.status] = (acc[wo.status] || 0) + 1; return acc; }, {} as Record<string, number>);

    const roleDistribution = memberships.reduce((acc, m) => { if (m.is_active) acc[m.role] = (acc[m.role] || 0) + 1; return acc; }, {} as Record<string, number>);

    return { woLast7, woTrend, avgResolutionHours, statusDistribution, roleDistribution };
  }, [workOrders, memberships]);

  const roleLabelsMap: Record<string, string> = {
    super_admin: 'Super Admin', admin: 'Admin', coordenador: 'Coordenador',
    tecnico: 'Técnico', analista: 'Analista', solicitante: 'Solicitante', leitura: 'Leitura',
  };

  const statusLabelsMap: Record<string, string> = {
    aberta: 'Abertas', triagem: 'Triagem', em_execucao: 'Em Execução',
    aguardando_peca: 'Ag. Peça', aguardando_solicitante: 'Ag. Solicitante',
    aguardando_terceiro: 'Ag. Terceiro', concluida: 'Concluída',
    aprovada: 'Aprovada', encerrada: 'Encerrada', reaberta: 'Reaberta',
  };

  const TrendIcon = stats.woTrend > 0 ? ArrowUp : stats.woTrend < 0 ? ArrowDown : Minus;
  const trendColor = stats.woTrend > 0 ? 'text-green-500' : stats.woTrend < 0 ? 'text-destructive' : 'text-muted-foreground';

  const healthCards = [
    { label: 'Usuários Ativos', value: profiles.filter(p => p.is_active).length, total: profiles.length, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Departamentos', value: tenants.filter((t: any) => t.is_active).length, total: tenants.length, icon: Database, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Total OS', value: workOrders.length, icon: ClipboardList, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Vínculos Ativos', value: memberships.filter(m => m.is_active).length, total: memberships.length, icon: HardDrive, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Logs Auditoria', value: auditCount, icon: Activity, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Resolução Média', value: `${stats.avgResolutionHours}h`, icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Saúde do Sistema</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Métricas operacionais e indicadores de performance</p>
      </div>

      {/* Health KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {healthCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-border shadow-none rounded-xl">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-muted-foreground">{card.label}</span>
                  <div className={`h-7 w-7 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                  </div>
                </div>
                {isLoading ? <Skeleton className="h-7 w-12" /> : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{card.value}</span>
                    {card.total !== undefined && <span className="text-xs text-muted-foreground">/{card.total}</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Trend + Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly trend */}
        <Card className="border-border shadow-none rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />Últimos 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats.woLast7}</span>
              <span className="text-sm text-muted-foreground">novas OS</span>
            </div>
            <div className={`flex items-center gap-1 mt-1 text-xs ${trendColor}`}>
              <TrendIcon className="h-3 w-3" />
              <span>{Math.abs(Math.round(stats.woTrend))}% vs semana anterior</span>
            </div>
          </CardContent>
        </Card>

        {/* Status distribution */}
        <Card className="border-border shadow-none rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.statusDistribution)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([status, count]) => {
                  const pct = workOrders.length > 0 ? ((count as number) / workOrders.length * 100) : 0;
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground w-24 truncate">{statusLabelsMap[status] || status}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-medium w-8 text-right">{count as number}</span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Role distribution */}
        <Card className="border-border shadow-none rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />Distribuição por Papel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.roleDistribution)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([role, count]) => {
                  const total = memberships.filter(m => m.is_active).length;
                  const pct = total > 0 ? ((count as number) / total * 100) : 0;
                  return (
                    <div key={role} className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground w-24 truncate">{roleLabelsMap[role] || role}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-medium w-8 text-right">{count as number}</span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

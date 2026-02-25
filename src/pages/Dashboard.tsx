import { useAuth } from '@/contexts/AuthContext';
import { useAllTenantsQuery } from '@/hooks/useAllTenantsQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/lib/permissions';
import { ClipboardList, AlertTriangle, Clock, Zap, ChevronRight, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SlaIndicator } from '@/components/SlaIndicator';


export default function Dashboard() {
  const { profile, memberships } = useAuth();
  const navigate = useNavigate();
  const { data: rawWorkOrders = [], isLoading } = useAllTenantsQuery<any>('work_orders_all', 'work_orders');
  const workOrders = rawWorkOrders.filter((wo: any) => !wo.deleted_at);
  const tenantMap = Object.fromEntries(memberships.map(m => [m.tenant_id, m.tenant_name || m.tenant_slug || '']));

  const open = workOrders.filter((wo: any) => wo.status === 'aberta').length;
  const inProgress = workOrders.filter((wo: any) => wo.status === 'em_execucao').length;
  const critical = workOrders.filter((wo: any) => wo.priority === 'critica' && !['encerrada', 'concluida', 'aprovada'].includes(wo.status)).length;
  const overdue = workOrders.filter((wo: any) => wo.resolve_due_at && new Date(wo.resolve_due_at) < new Date() && !['encerrada', 'concluida', 'aprovada'].includes(wo.status)).length;

  const stats = [
    { label: 'Abertas', value: open, icon: ClipboardList, color: 'text-primary' },
    { label: 'Em Execução', value: inProgress, icon: Clock, color: 'text-amber-600' },
    { label: 'Críticas', value: critical, icon: Zap, color: 'text-destructive' },
    { label: 'SLA Atrasadas', value: overdue, icon: AlertTriangle, color: 'text-orange-600' },
  ];

  const recentOrders = workOrders.slice(0, 10);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Olá, {profile?.name || 'Usuário'}. Resumo das suas ordens de serviço.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Work Orders Table */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Ordens Recentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
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
                  {/* Left: code + title block */}
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

                  {/* Middle: priority + status */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-[11px] ${priorityColors[wo.priority]}`}>
                      {priorityLabels[wo.priority]}
                    </Badge>
                    <Badge variant="outline" className={`text-[11px] ${statusColors[wo.status]}`}>
                      {statusLabels[wo.status]}
                    </Badge>
                  </div>

                  {/* SLA */}
                  <div className="hidden md:block shrink-0 w-[100px]">
                    <SlaIndicator workOrder={wo} compact />
                  </div>

                  {/* Date */}
                  <span className="hidden lg:block text-xs text-muted-foreground shrink-0 w-[80px] text-right">
                    {new Date(wo.updated_at).toLocaleDateString('pt-BR')}
                  </span>

                  {/* Arrow */}
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

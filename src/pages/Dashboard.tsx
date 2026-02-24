import { useAuth } from '@/contexts/AuthContext';
import { useAllTenantsQuery } from '@/hooks/useAllTenantsQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/lib/permissions';
import { ClipboardList, AlertTriangle, Clock, Zap, ChevronRight, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SlaIndicator } from '@/components/SlaIndicator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[110px]">Código</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Título</TableHead>
                  {memberships.length > 1 && (
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[100px]">Depto</TableHead>
                  )}
                  <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[90px]">Prioridade</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[100px]">Status</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[100px]">SLA</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((wo: any) => (
                  <TableRow
                    key={wo.id}
                    className="cursor-pointer group"
                    onClick={() => navigate(`/os/${wo.id}`)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{wo.code}</TableCell>
                    <TableCell className="text-sm font-medium truncate max-w-[250px]">{wo.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] ${priorityColors[wo.priority]}`}>
                        {priorityLabels[wo.priority]}
                      </Badge>
                    </TableCell>
                    {memberships.length > 1 && (
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[100px]">
                        {tenantMap[wo.tenant_id] || '—'}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] ${statusColors[wo.status]}`}>
                        {statusLabels[wo.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <SlaIndicator workOrder={wo} compact />
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

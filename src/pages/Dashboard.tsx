import { useAuth } from '@/contexts/AuthContext';
import { useTenantQuery } from '@/hooks/useTenantQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/lib/permissions';
import { ClipboardList, AlertTriangle, Clock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: workOrders = [], isLoading } = useTenantQuery<any>('work_orders', 'work_orders');

  const open = workOrders.filter((wo: any) => wo.status === 'aberta').length;
  const inProgress = workOrders.filter((wo: any) => wo.status === 'em_execucao').length;
  const critical = workOrders.filter((wo: any) => wo.priority === 'critica' && !['encerrada', 'concluida', 'aprovada'].includes(wo.status)).length;
  const overdue = workOrders.filter((wo: any) => wo.resolve_due_at && new Date(wo.resolve_due_at) < new Date() && !['encerrada', 'concluida', 'aprovada'].includes(wo.status)).length;

  const stats = [
    { label: 'Abertas', value: open, icon: ClipboardList, color: 'text-blue-500' },
    { label: 'Em Execução', value: inProgress, icon: Clock, color: 'text-amber-500' },
    { label: 'Críticas', value: critical, icon: Zap, color: 'text-destructive' },
    { label: 'SLA Atrasadas', value: overdue, icon: AlertTriangle, color: 'text-orange-500' },
  ];

  const recentOrders = workOrders.slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Olá, {profile?.name || 'Usuário'}. Aqui está o resumo das suas ordens de serviço.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-3xl font-bold">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ordens Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="mx-auto h-10 w-10 mb-2 opacity-50" />
              <p>Nenhuma ordem de serviço encontrada.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((wo: any) => (
                <div
                  key={wo.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/os/${wo.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground">{wo.code}</span>
                    <span className="text-sm font-medium truncate">{wo.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={priorityColors[wo.priority]}>
                      {priorityLabels[wo.priority]}
                    </Badge>
                    <Badge variant="outline" className={statusColors[wo.status]}>
                      {statusLabels[wo.status]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

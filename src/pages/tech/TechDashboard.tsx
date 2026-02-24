import { useAuth } from '@/contexts/AuthContext';
import { useTenantQuery } from '@/hooks/useTenantQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/lib/permissions';
import { SlaIndicator } from '@/components/SlaIndicator';
import { calculateSlaStatus, formatRemainingTime } from '@/lib/sla';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Play, Pause, Package, UserCheck, AlertTriangle, Clock, CheckCircle, ChevronRight, Zap } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function TechDashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: rawWorkOrders = [], isLoading } = useTenantQuery<any>('work_orders', 'work_orders');
  const workOrders = rawWorkOrders.filter((wo: any) => !wo.deleted_at);

  const myOs = workOrders.filter((wo: any) => wo.assigned_to_id === user?.id);
  const open = myOs.filter((wo: any) => ['aberta', 'reaberta'].includes(wo.status)).length;
  const inExec = myOs.filter((wo: any) => wo.status === 'em_execucao').length;
  const awaitPart = myOs.filter((wo: any) => wo.status === 'aguardando_peca').length;
  const awaitReq = myOs.filter((wo: any) => wo.status === 'aguardando_solicitante').length;
  const overdue = myOs.filter((wo: any) => {
    const sla = calculateSlaStatus(wo);
    return (sla.responseOverdue || sla.resolveOverdue) && !['concluida', 'aprovada', 'encerrada'].includes(wo.status);
  }).length;
  const doneToday = myOs.filter((wo: any) => {
    if (!wo.resolved_at) return false;
    const today = new Date();
    const resolved = new Date(wo.resolved_at);
    return resolved.toDateString() === today.toDateString();
  }).length;

  const stats = [
    { label: 'Abertas', value: open, icon: ClipboardList, color: 'text-primary' },
    { label: 'Em Execução', value: inExec, icon: Play, color: 'text-amber-500' },
    { label: 'Aguard. Peça', value: awaitPart, icon: Package, color: 'text-orange-500' },
    { label: 'Aguard. Solic.', value: awaitReq, icon: UserCheck, color: 'text-yellow-500' },
    { label: 'Atrasadas', value: overdue, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Concluídas Hoje', value: doneToday, icon: CheckCircle, color: 'text-green-500' },
  ];

  // Critical OS sorted by SLA
  const criticalOs = myOs
    .filter((wo: any) => !['concluida', 'aprovada', 'encerrada'].includes(wo.status))
    .map((wo: any) => ({ ...wo, _sla: calculateSlaStatus(wo) }))
    .sort((a: any, b: any) => {
      // Overdue first, then by remaining time
      const aOv = a._sla.responseOverdue || a._sla.resolveOverdue ? 0 : 1;
      const bOv = b._sla.responseOverdue || b._sla.resolveOverdue ? 0 : 1;
      if (aOv !== bOv) return aOv - bOv;
      const aRem = a._sla.resolveRemainingMs ?? Infinity;
      const bRem = b._sla.resolveRemainingMs ?? Infinity;
      return aRem - bRem;
    })
    .slice(0, 8);

  // Quick action mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status, wo }: { id: string; status: string; wo: any }) => {
      const updates: any = { status };
      if (status === 'em_execucao' && !wo.started_at) updates.started_at = new Date().toISOString();
      if (status === 'concluida') updates.resolved_at = new Date().toISOString();
      const PAUSE_STATUSES = ['aguardando_peca', 'aguardando_solicitante', 'aguardando_terceiro'];
      if (PAUSE_STATUSES.includes(status) && !wo.paused_at) updates.paused_at = new Date().toISOString();
      if (!PAUSE_STATUSES.includes(status) && wo.paused_at) {
        updates.total_paused_ms = (wo.total_paused_ms || 0) + (Date.now() - new Date(wo.paused_at).getTime());
        updates.paused_at = null;
      }
      const { error } = await supabase.from('work_orders').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work_orders'] }); toast({ title: 'Status atualizado!' }); },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Painel Técnico</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Olá, {profile?.name}. Você tem {myOs.filter((wo: any) => !['concluida', 'aprovada', 'encerrada'].includes(wo.status)).length} OS ativas.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(stat => (
          <Card key={stat.label} className="border-border shadow-none">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">{stat.label}</span>
                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
              </div>
              {isLoading ? <Skeleton className="h-7 w-10" /> : <div className="text-2xl font-bold">{stat.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" className="h-9 gap-1.5" onClick={() => navigate('/tech/os')}>
          <ClipboardList className="h-3.5 w-3.5" /> Ver Minhas OS
        </Button>
      </div>

      {/* Critical OS */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-destructive" />
            Próximas Críticas / SLA Urgente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : criticalOs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle className="mx-auto h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Tudo em dia! Nenhuma OS crítica.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {criticalOs.map((wo: any) => {
                const isPaused = ['aguardando_peca', 'aguardando_solicitante', 'aguardando_terceiro'].includes(wo.status);
                const isOpen = ['aberta', 'reaberta'].includes(wo.status);
                const isRunning = wo.status === 'em_execucao';

                return (
                  <div
                    key={wo.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer group"
                    onClick={() => navigate(`/tech/os/${wo.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-muted-foreground">{wo.code}</span>
                        <Badge variant="outline" className={`text-[10px] h-5 ${priorityColors[wo.priority]}`}>
                          {priorityLabels[wo.priority]}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] h-5 ${statusColors[wo.status]}`}>
                          {statusLabels[wo.status]}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium truncate">{wo.title}</p>
                      {wo._sla.resolveRemainingMs !== null && (
                        <p className={`text-[11px] mt-0.5 ${wo._sla.resolveOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                          {wo._sla.resolveOverdue ? '⚠ Atrasada ' : 'SLA: '}{formatRemainingTime(wo._sla.resolveRemainingMs)}
                        </p>
                      )}
                    </div>

                    {/* Quick actions - stop propagation */}
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      {isOpen && (
                        <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => statusMutation.mutate({ id: wo.id, status: 'em_execucao', wo })} disabled={statusMutation.isPending}>
                          <Play className="h-3 w-3" /> Iniciar
                        </Button>
                      )}
                      {isRunning && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => statusMutation.mutate({ id: wo.id, status: 'aguardando_peca', wo })} disabled={statusMutation.isPending}>
                          <Pause className="h-3 w-3" /> Pausar
                        </Button>
                      )}
                      {isPaused && (
                        <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => statusMutation.mutate({ id: wo.id, status: 'em_execucao', wo })} disabled={statusMutation.isPending}>
                          <Play className="h-3 w-3" /> Retomar
                        </Button>
                      )}
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

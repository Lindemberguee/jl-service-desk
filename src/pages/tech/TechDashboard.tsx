import { useAuth } from '@/contexts/AuthContext';
import { useAllTenantsQuery } from '@/hooks/useAllTenantsQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/lib/permissions';
import { SlaIndicator } from '@/components/SlaIndicator';
import { calculateSlaStatus, formatRemainingTime } from '@/lib/sla';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Play, Pause, Package, UserCheck, AlertTriangle, CheckCircle, ChevronRight, Zap, Building2, TrendingUp, Timer } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function TechDashboard() {
  const { profile, user, memberships } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: rawWorkOrders = [], isLoading } = useAllTenantsQuery<any>('work_orders_all', 'work_orders');
  const workOrders = rawWorkOrders.filter((wo: any) => !wo.deleted_at);
  const tenantMap = Object.fromEntries(memberships.map(m => [m.tenant_id, m.tenant_name || m.tenant_slug || '']));

  const myOs = workOrders.filter((wo: any) => wo.assigned_to_id === user?.id);
  const activeOs = myOs.filter((wo: any) => !['concluida', 'aprovada', 'encerrada'].includes(wo.status));
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
    { label: 'Abertas', value: open, icon: ClipboardList, gradient: 'from-primary/15 to-primary/5', iconColor: 'text-primary', borderColor: 'border-primary/20' },
    { label: 'Em Execução', value: inExec, icon: Timer, gradient: 'from-amber-500/15 to-amber-500/5', iconColor: 'text-amber-500', borderColor: 'border-amber-500/20' },
    { label: 'Aguard. Peça', value: awaitPart, icon: Package, gradient: 'from-orange-500/15 to-orange-500/5', iconColor: 'text-orange-500', borderColor: 'border-orange-500/20' },
    { label: 'Aguard. Solic.', value: awaitReq, icon: UserCheck, gradient: 'from-yellow-500/15 to-yellow-500/5', iconColor: 'text-yellow-500', borderColor: 'border-yellow-500/20' },
    { label: 'Atrasadas', value: overdue, icon: AlertTriangle, gradient: 'from-destructive/15 to-destructive/5', iconColor: 'text-destructive', borderColor: 'border-destructive/20' },
    { label: 'Concluídas Hoje', value: doneToday, icon: TrendingUp, gradient: 'from-emerald-500/15 to-emerald-500/5', iconColor: 'text-emerald-500', borderColor: 'border-emerald-500/20' },
  ];

  // Critical OS sorted by SLA
  const criticalOs = activeOs
    .map((wo: any) => ({ ...wo, _sla: calculateSlaStatus(wo) }))
    .sort((a: any, b: any) => {
      const aOv = a._sla.responseOverdue || a._sla.resolveOverdue ? 0 : 1;
      const bOv = b._sla.responseOverdue || b._sla.resolveOverdue ? 0 : 1;
      if (aOv !== bOv) return aOv - bOv;
      return (a._sla.resolveRemainingMs ?? Infinity) - (b._sla.resolveRemainingMs ?? Infinity);
    })
    .slice(0, 8);

  // Currently running OS (for the hero card)
  const runningOs = myOs.find((wo: any) => wo.status === 'em_execucao');

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work_orders'] });
      qc.invalidateQueries({ queryKey: ['work_orders_all'] });
      toast({ title: 'Status atualizado!' });
    },
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5">
      {/* Hero greeting */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}, {profile?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Você tem <span className="font-semibold text-foreground">{activeOs.length}</span> OS ativas
          {overdue > 0 && (
            <span className="text-destructive font-semibold"> • {overdue} atrasada{overdue > 1 ? 's' : ''}</span>
          )}
        </p>
      </motion.div>

      {/* Running OS Hero Card */}
      {runningOs && (
        <motion.div variants={itemVariants}>
          <Card
            className="border-primary/30 bg-gradient-to-br from-primary/8 to-primary/3 cursor-pointer group overflow-hidden relative"
            onClick={() => navigate(`/tech/os/${runningOs.id}`)}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-8 translate-x-8" />
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Em execução agora</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-muted-foreground">{runningOs.code}</p>
                  <p className="text-base font-semibold truncate mt-0.5">{runningOs.title}</p>
                  {memberships.length > 1 && (
                    <Badge variant="secondary" className="text-[9px] h-4 mt-1">
                      <Building2 className="h-2.5 w-2.5 mr-0.5" />{tenantMap[runningOs.tenant_id] || ''}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 text-xs gap-1.5 border-primary/30 hover:bg-primary/10"
                    onClick={() => statusMutation.mutate({ id: runningOs.id, status: 'aguardando_peca', wo: runningOs })}
                    disabled={statusMutation.isPending}
                  >
                    <Pause className="h-3.5 w-3.5" /> Pausar
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                    onClick={() => statusMutation.mutate({ id: runningOs.id, status: 'concluida', wo: runningOs })}
                    disabled={statusMutation.isPending}
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Concluir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            variants={itemVariants}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Card className={`border ${stat.borderColor} shadow-none overflow-hidden relative group cursor-default`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <CardContent className="p-3 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                  <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <stat.icon className={`h-3.5 w-3.5 ${stat.iconColor}`} />
                  </div>
                </div>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <div className="text-2xl font-extrabold tabular-nums">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick actions */}
      <motion.div variants={itemVariants} className="flex gap-2 flex-wrap">
        <Button size="sm" className="h-9 gap-1.5 shadow-md shadow-primary/10" onClick={() => navigate('/tech/os')}>
          <ClipboardList className="h-3.5 w-3.5" /> Ver Todas as OS
        </Button>
      </motion.div>

      {/* Critical OS */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-destructive/5 to-transparent">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-destructive" />
              </div>
              Próximas Críticas / SLA Urgente
              {criticalOs.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 ml-auto">{criticalOs.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
            ) : criticalOs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12 text-muted-foreground"
              >
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <p className="text-sm font-medium">Tudo em dia!</p>
                <p className="text-xs mt-1 text-muted-foreground">Nenhuma OS crítica no momento.</p>
              </motion.div>
            ) : (
              <div className="divide-y divide-border/50">
                {criticalOs.map((wo: any, index: number) => {
                  const isPaused = ['aguardando_peca', 'aguardando_solicitante', 'aguardando_terceiro'].includes(wo.status);
                  const isOpen = ['aberta', 'reaberta'].includes(wo.status);
                  const isRunning = wo.status === 'em_execucao';

                  return (
                    <motion.div
                      key={wo.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04, duration: 0.25 }}
                      className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer group transition-colors duration-150 hover:bg-accent/50 ${
                        (wo._sla.responseOverdue || wo._sla.resolveOverdue) ? 'bg-destructive/3' : ''
                      }`}
                      onClick={() => navigate(`/tech/os/${wo.id}`)}
                    >
                      {/* Priority indicator bar */}
                      <div className={`w-1 self-stretch rounded-full shrink-0 ${
                        wo.priority === 'critica' ? 'bg-destructive' :
                        wo.priority === 'alta' ? 'bg-orange-500' :
                        wo.priority === 'media' ? 'bg-amber-400' : 'bg-muted-foreground/30'
                      }`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="text-[11px] font-mono text-muted-foreground">{wo.code}</span>
                          {memberships.length > 1 && (
                            <Badge variant="secondary" className="text-[8px] h-3.5 px-1">
                              {tenantMap[wo.tenant_id] || ''}
                            </Badge>
                          )}
                          <Badge variant="outline" className={`text-[9px] h-4 ${statusColors[wo.status]}`}>
                            {statusLabels[wo.status]}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium truncate">{wo.title}</p>
                        {wo._sla.resolveRemainingMs !== null && (
                          <p className={`text-[11px] mt-0.5 flex items-center gap-1 ${
                            wo._sla.resolveOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'
                          }`}>
                            {wo._sla.resolveOverdue && <AlertTriangle className="h-3 w-3" />}
                            {wo._sla.resolveOverdue ? 'Atrasada ' : 'SLA: '}
                            {formatRemainingTime(wo._sla.resolveRemainingMs)}
                          </p>
                        )}
                      </div>

                      {/* Quick actions */}
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {isOpen && (
                          <Button
                            size="sm"
                            className="h-8 text-[11px] gap-1 shadow-sm"
                            onClick={() => statusMutation.mutate({ id: wo.id, status: 'em_execucao', wo })}
                            disabled={statusMutation.isPending}
                          >
                            <Play className="h-3 w-3" /> Iniciar
                          </Button>
                        )}
                        {isRunning && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-[11px] gap-1"
                            onClick={() => statusMutation.mutate({ id: wo.id, status: 'aguardando_peca', wo })}
                            disabled={statusMutation.isPending}
                          >
                            <Pause className="h-3 w-3" /> Pausar
                          </Button>
                        )}
                        {isPaused && (
                          <Button
                            size="sm"
                            className="h-8 text-[11px] gap-1 shadow-sm"
                            onClick={() => statusMutation.mutate({ id: wo.id, status: 'em_execucao', wo })}
                            disabled={statusMutation.isPending}
                          >
                            <Play className="h-3 w-3" /> Retomar
                          </Button>
                        )}
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

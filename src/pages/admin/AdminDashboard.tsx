import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, AlertTriangle, Clock, Zap, Building2, Users, TrendingUp, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ['admin_tenants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenants').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: allOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['admin_all_work_orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('work_orders').select('*').is('deleted_at', null).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allMemberships = [] } = useQuery({
    queryKey: ['admin_memberships_count'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_memberships').select('tenant_id, is_active');
      if (error) throw error;
      return data;
    },
  });

  const isLoading = tenantsLoading || ordersLoading;

  const totalOpen = allOrders.filter((wo: any) => wo.status === 'aberta').length;
  const totalInProgress = allOrders.filter((wo: any) => wo.status === 'em_execucao').length;
  const totalCritical = allOrders.filter((wo: any) => wo.priority === 'critica' && !['encerrada', 'concluida', 'aprovada'].includes(wo.status)).length;
  const totalOverdue = allOrders.filter((wo: any) => wo.resolve_due_at && new Date(wo.resolve_due_at) < new Date() && !['encerrada', 'concluida', 'aprovada'].includes(wo.status)).length;
  const totalResolved = allOrders.filter((wo: any) => ['concluida', 'aprovada', 'encerrada'].includes(wo.status)).length;
  const totalMembers = allMemberships.filter((m: any) => m.is_active).length;

  const globalStats = [
    { label: 'Total OS', value: allOrders.length, icon: ClipboardList, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Abertas', value: totalOpen, icon: Clock, color: 'text-primary', bg: 'bg-primary/5' },
    { label: 'Em Execução', value: totalInProgress, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/5' },
    { label: 'Resolvidas', value: totalResolved, icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/5' },
    { label: 'Críticas', value: totalCritical, icon: Zap, color: 'text-destructive', bg: 'bg-destructive/5' },
    { label: 'SLA Atrasadas', value: totalOverdue, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/5' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Painel Consolidado</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Visão geral de todos os departamentos • {tenants.length} departamentos • {totalMembers} membros ativos</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {globalStats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-transparent shadow-[0_1px_3px_0_hsl(var(--foreground)/0.04),0_1px_2px_-1px_hsl(var(--foreground)/0.04)] rounded-xl">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-muted-foreground">{stat.label}</span>
                  <div className={`h-7 w-7 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  </div>
                </div>
                {isLoading ? <Skeleton className="h-7 w-12" /> : <div className="text-2xl font-bold">{stat.value}</div>}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Department Cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Departamentos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tenants.map((tenant: any, i: number) => {
            const deptOrders = allOrders.filter((wo: any) => wo.tenant_id === tenant.id);
            const deptOpen = deptOrders.filter((wo: any) => wo.status === 'aberta').length;
            const deptInProgress = deptOrders.filter((wo: any) => wo.status === 'em_execucao').length;
            const deptResolved = deptOrders.filter((wo: any) => ['concluida', 'aprovada', 'encerrada'].includes(wo.status)).length;
            const deptMembers = allMemberships.filter((m: any) => m.tenant_id === tenant.id && m.is_active).length;

            return (
              <motion.div key={tenant.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.04 }}>
                <Card
                  className="border-transparent shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04),0_1px_3px_-1px_hsl(var(--foreground)/0.03)] rounded-xl cursor-pointer hover:shadow-[0_4px_16px_0_hsl(var(--foreground)/0.08)] transition-shadow duration-200 group"
                  onClick={() => navigate('/admin/departamentos')}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{tenant.name}</p>
                        <p className="text-[11px] text-muted-foreground">{deptMembers} membros</p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors shrink-0" />
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="text-muted-foreground">{deptOpen} abertas</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                        <span className="text-muted-foreground">{deptInProgress} execução</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                        <span className="text-muted-foreground">{deptResolved} resolvidas</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-lg font-bold">{deptOrders.length}</span>
                      <Badge variant={tenant.is_active ? 'secondary' : 'outline'} className="text-[10px] h-5 font-normal">
                        {tenant.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

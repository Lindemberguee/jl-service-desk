import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, AlertTriangle, Clock, Zap, Building2, Users, TrendingUp, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminDashboard() {
  const { switchTenant } = useAuth();
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
    { label: 'Abertas', value: totalOpen, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Em Execução', value: totalInProgress, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Resolvidas', value: totalResolved, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Críticas', value: totalCritical, icon: Zap, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: 'SLA Atrasadas', value: totalOverdue, icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  const goToDept = (tenantId: string) => {
    switchTenant(tenantId);
    navigate('/dashboard');
  };

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
            <Card className="border-border shadow-none rounded-xl">
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
              <motion.div key={tenant.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
                <Card
                  className="border-border shadow-none rounded-xl cursor-pointer hover:border-primary/30 transition-all overflow-hidden group"
                  onClick={() => goToDept(tenant.id)}
                >
                  <div className="h-1" style={{ background: `linear-gradient(90deg, ${tenant.primary_color || '#3B82F6'}, ${tenant.accent_color || '#8B5CF6'})` }} />
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: tenant.primary_color || '#3B82F6' }}>
                        <Building2 className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{tenant.name}</p>
                        <p className="text-[11px] text-muted-foreground">{deptMembers} membros • {deptOrders.length} OS</p>
                      </div>
                      <Badge variant={tenant.is_active ? 'default' : 'secondary'} className="text-[10px] h-5 shrink-0">
                        {tenant.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-muted/40 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-blue-500">{deptOpen}</p>
                        <p className="text-[10px] text-muted-foreground">Abertas</p>
                      </div>
                      <div className="bg-muted/40 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-amber-500">{deptInProgress}</p>
                        <p className="text-[10px] text-muted-foreground">Execução</p>
                      </div>
                      <div className="bg-muted/40 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-green-500">{deptResolved}</p>
                        <p className="text-[10px] text-muted-foreground">Resolvidas</p>
                      </div>
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

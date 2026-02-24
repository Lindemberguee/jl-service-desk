import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { statusLabels, statusColors, priorityLabels, priorityColors } from '@/lib/permissions';
import { ClipboardList, AlertTriangle, Clock, Zap, Building2, Users } from 'lucide-react';
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

  const globalStats = [
    { label: 'Total Abertas', value: totalOpen, icon: ClipboardList, color: 'text-blue-500' },
    { label: 'Em Execução', value: totalInProgress, icon: Clock, color: 'text-amber-500' },
    { label: 'Críticas', value: totalCritical, icon: Zap, color: 'text-destructive' },
    { label: 'SLA Atrasadas', value: totalOverdue, icon: AlertTriangle, color: 'text-orange-500' },
  ];

  const goToDept = (tenantId: string) => {
    switchTenant(tenantId);
    navigate('/dashboard');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel Consolidado</h1>
        <p className="text-sm text-muted-foreground">Visão geral de todos os departamentos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {globalStats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold">{stat.value}</div>}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tenants.map((tenant: any) => {
          const deptOrders = allOrders.filter((wo: any) => wo.tenant_id === tenant.id);
          const deptOpen = deptOrders.filter((wo: any) => wo.status === 'aberta').length;
          const deptInProgress = deptOrders.filter((wo: any) => wo.status === 'em_execucao').length;
          const deptTotal = deptOrders.length;
          const deptMembers = allMemberships.filter((m: any) => m.tenant_id === tenant.id && m.is_active).length;

          return (
            <Card
              key={tenant.id}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => goToDept(tenant.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: tenant.primary_color || '#3B82F6' }}>
                      <Building2 className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{tenant.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                    </div>
                  </div>
                  <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
                    {tenant.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Abertas</p>
                    <p className="text-lg font-bold text-blue-500">{deptOpen}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Em Execução</p>
                    <p className="text-lg font-bold text-amber-500">{deptInProgress}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Total OS</p>
                    <p className="text-lg font-bold">{deptTotal}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Users className="h-3 w-3" /> Membros</p>
                    <p className="text-lg font-bold">{deptMembers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

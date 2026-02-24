import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantQuery } from '@/hooks/useTenantQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { roleLabels, hasPermission, statusLabels } from '@/lib/permissions';
import { Users, Shield, Lock, ClipboardList, Star, Timer, BarChart3 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { differenceInHours, parseISO } from 'date-fns';

export default function UsersPage() {
  const { currentRole } = useAuth();
  const isMobile = useIsMobile();
  const canManage = currentRole && hasPermission(currentRole, 'users:manage');

  const { data: memberships = [], isLoading } = useTenantQuery<any>(
    'user_memberships', 'user_memberships',
    { select: '*, profiles!inner(name, email)' }
  );

  const { data: workOrders = [] } = useTenantQuery<any>('work_orders_team', 'work_orders');
  const { data: events = [] } = useTenantQuery<any>('wo_events_team', 'work_order_events');

  // Compute team performance metrics
  const teamMetrics = useMemo(() => {
    const techs = memberships.filter((m: any) => ['tecnico', 'coordenador', 'admin', 'super_admin'].includes(m.role));
    return techs.map((t: any) => {
      const assigned = workOrders.filter((wo: any) => wo.assigned_to_id === t.user_id);
      const active = assigned.filter((wo: any) => !['concluida', 'aprovada', 'encerrada'].includes(wo.status));
      const resolved = assigned.filter((wo: any) => wo.resolved_at);
      const avgHrs = resolved.length > 0
        ? Math.round(resolved.reduce((a: number, wo: any) => a + differenceInHours(parseISO(wo.resolved_at), parseISO(wo.created_at)), 0) / resolved.length)
        : 0;

      // Get ratings for this tech
      const techRatings = events.filter((ev: any) => {
        if (ev.type !== 'closed' || !(ev.payload as any)?.rating) return false;
        const wo = workOrders.find((w: any) => w.id === ev.work_order_id);
        return wo?.assigned_to_id === t.user_id;
      });
      const avgRating = techRatings.length > 0
        ? (techRatings.reduce((a: number, ev: any) => a + ((ev.payload as any)?.rating || 0), 0) / techRatings.length).toFixed(1)
        : null;

      return {
        id: t.id,
        userId: t.user_id,
        name: t.profiles?.name || '-',
        email: t.profiles?.email || '-',
        role: t.role,
        isActive: t.is_active,
        totalAssigned: assigned.length,
        activeCount: active.length,
        resolvedCount: resolved.length,
        avgResolutionHours: avgHrs,
        avgRating,
        ratingCount: techRatings.length,
      };
    }).sort((a, b) => b.activeCount - a.activeCount);
  }, [memberships, workOrders, events]);

  // Non-tech members (solicitantes, leitura)
  const otherMembers = memberships.filter((m: any) => !['tecnico', 'coordenador', 'admin', 'super_admin'].includes(m.role));

  const maxActive = Math.max(...teamMetrics.map(t => t.activeCount), 1);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive' as const;
      case 'admin': return 'default' as const;
      case 'coordenador': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Equipe do Departamento</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {canManage
            ? 'Gerencie os membros e acompanhe o desempenho da equipe.'
            : 'Visualize a equipe e indicadores de desempenho.'}
        </p>
      </div>

      {!canManage && (
        <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-md p-3 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          Somente administradores podem gerenciar usuários e acessos.
        </div>
      )}

      <Tabs defaultValue="workload">
        <TabsList className="bg-card border border-border h-9">
          <TabsTrigger value="workload" className="text-xs h-7 gap-1"><BarChart3 className="h-3 w-3" />Carga de Trabalho</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs h-7 gap-1"><Star className="h-3 w-3" />Desempenho</TabsTrigger>
          <TabsTrigger value="members" className="text-xs h-7 gap-1"><Users className="h-3 w-3" />Membros</TabsTrigger>
        </TabsList>

        {/* Workload Tab */}
        <TabsContent value="workload" className="mt-3 space-y-3">
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : teamMetrics.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {teamMetrics.map((t) => (
                <Card key={t.id} className="border-border shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{t.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{t.email}</p>
                      </div>
                      <Badge variant={getRoleBadgeVariant(t.role)} className="text-[10px] gap-1 shrink-0">
                        <Shield className="h-2.5 w-2.5" />
                        {roleLabels[t.role as keyof typeof roleLabels] || t.role}
                      </Badge>
                    </div>

                    {/* Workload bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground">OS ativas</span>
                        <span className="font-semibold text-foreground">{t.activeCount}</span>
                      </div>
                      <Progress value={(t.activeCount / maxActive) * 100} className="h-2" />
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center bg-muted/30 rounded-md p-2">
                        <p className="text-[10px] text-muted-foreground">Total</p>
                        <p className="text-sm font-bold">{t.totalAssigned}</p>
                      </div>
                      <div className="text-center bg-muted/30 rounded-md p-2">
                        <p className="text-[10px] text-muted-foreground">Resolvidas</p>
                        <p className="text-sm font-bold text-green-500">{t.resolvedCount}</p>
                      </div>
                      <div className="text-center bg-muted/30 rounded-md p-2">
                        <p className="text-[10px] text-muted-foreground">Tempo médio</p>
                        <p className="text-sm font-bold">{t.avgResolutionHours}h</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="mt-3 space-y-3">
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : teamMetrics.length === 0 ? (
            <EmptyState />
          ) : isMobile ? (
            <div className="space-y-2">
              {teamMetrics.map((t) => (
                <Card key={t.id} className="border-border shadow-none">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <Badge variant={getRoleBadgeVariant(t.role)} className="text-[10px] shrink-0">
                        {roleLabels[t.role as keyof typeof roleLabels] || t.role}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div>
                        <p className="text-[10px] text-muted-foreground">OS</p>
                        <p className="font-bold">{t.totalAssigned}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Resolvidas</p>
                        <p className="font-bold text-green-500">{t.resolvedCount}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Tempo</p>
                        <p className="font-bold">{t.avgResolutionHours}h</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Nota</p>
                        <div className="flex items-center justify-center gap-0.5">
                          {t.avgRating ? (
                            <><Star className="h-3 w-3 text-yellow-500 fill-yellow-500" /><span className="font-bold">{t.avgRating}</span></>
                          ) : <span className="text-muted-foreground">-</span>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border shadow-none">
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Nome</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Papel</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[80px] text-center">OS Total</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[90px] text-center">Resolvidas</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[90px] text-center">Tempo Médio</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[100px] text-center">Avaliação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMetrics.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <p className="text-sm font-medium">{t.name}</p>
                          <p className="text-[11px] text-muted-foreground">{t.email}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(t.role)} className="text-[11px] gap-1">
                            <Shield className="h-3 w-3" />
                            {roleLabels[t.role as keyof typeof roleLabels] || t.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm font-medium">{t.totalAssigned}</TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium text-green-500">{t.resolvedCount}</span>
                          <span className="text-[11px] text-muted-foreground ml-0.5">/{t.totalAssigned}</span>
                        </TableCell>
                        <TableCell className="text-center text-sm font-medium">{t.avgResolutionHours}h</TableCell>
                        <TableCell className="text-center">
                          {t.avgRating ? (
                            <div className="flex items-center justify-center gap-1">
                              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                              <span className="text-sm font-medium">{t.avgRating}</span>
                              <span className="text-[10px] text-muted-foreground">({t.ratingCount})</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem avaliações</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-3">
          <Card className="border-border shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Todos os Membros ({memberships.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : memberships.length === 0 ? (
                <EmptyState />
              ) : isMobile ? (
                <div className="space-y-2">
                  {memberships.map((m: any) => (
                    <div key={m.id} className="border border-border rounded-md p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{m.profiles?.name || '-'}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.profiles?.email || '-'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant={getRoleBadgeVariant(m.role)} className="text-[10px] gap-1">
                            <Shield className="h-2.5 w-2.5" />
                            {roleLabels[m.role as keyof typeof roleLabels] || m.role}
                          </Badge>
                          <Badge variant={m.is_active ? 'default' : 'secondary'} className="text-[10px]">
                            {m.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Nome</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Email</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Papel</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberships.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.profiles?.name || '-'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{m.profiles?.email || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(m.role)} className="gap-1 text-[11px]">
                            <Shield className="h-3 w-3" />
                            {roleLabels[m.role as keyof typeof roleLabels] || m.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={m.is_active ? 'default' : 'secondary'} className="text-[11px]">
                            {m.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Users className="mx-auto h-10 w-10 mb-2 opacity-50" />
      <p className="text-sm">Nenhum membro encontrado.</p>
    </div>
  );
}

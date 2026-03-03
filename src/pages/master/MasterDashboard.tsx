import { useState } from 'react';
import { useMasterTenants, usePlatformStats, useDeleteTenant } from '@/hooks/useMasterAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Building2, Users, ClipboardList, TrendingUp, Plus, Search, Crown, Settings,
  AlertTriangle, Clock, CalendarX, DollarSign, Trash2, BarChart3, PieChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardTenantDialog } from './OnboardTenantDialog';
import { EditSubscriptionDialog } from './EditSubscriptionDialog';
import { format, differenceInDays, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const planLabels: Record<string, string> = {
  trial: 'Trial', starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise', custom: 'Custom',
};
const planColors: Record<string, string> = {
  trial: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  starter: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  professional: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  enterprise: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  custom: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};
const statusLabels: Record<string, string> = {
  active: 'Ativo', trial: 'Trial', expired: 'Expirado', suspended: 'Suspenso', cancelled: 'Cancelado',
};
const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  trial: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  expired: 'bg-red-500/10 text-red-500 border-red-500/20',
  suspended: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  cancelled: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

function getExpiryInfo(sub: any): { label: string; urgent: boolean; icon: React.ElementType } | null {
  if (!sub) return null;
  if (sub.status === 'trial' && sub.trial_ends_at) {
    const endDate = parseISO(sub.trial_ends_at);
    if (isPast(endDate)) return { label: 'Trial expirado', urgent: true, icon: CalendarX };
    const days = differenceInDays(endDate, new Date());
    if (days <= 7) return { label: `Trial expira em ${days}d`, urgent: true, icon: AlertTriangle };
    return { label: `Trial até ${format(endDate, 'dd/MM', { locale: ptBR })}`, urgent: false, icon: Clock };
  }
  if (sub.current_period_end) {
    const endDate = parseISO(sub.current_period_end);
    if (endDate.getFullYear() >= 2090) return { label: 'Indeterminado ∞', urgent: false, icon: Clock };
    if (isPast(endDate)) return { label: 'Período expirado', urgent: true, icon: CalendarX };
    const days = differenceInDays(endDate, new Date());
    if (days <= 7) return { label: `Renova em ${days}d`, urgent: true, icon: AlertTriangle };
    return { label: `Até ${format(endDate, 'dd/MM', { locale: ptBR })}`, urgent: false, icon: Clock };
  }
  return null;
}

export default function MasterDashboard() {
  const { data: tenants = [], isLoading: tenantsLoading } = useMasterTenants();
  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const deleteTenant = useDeleteTenant();
  const [search, setSearch] = useState('');
  const [showOnboard, setShowOnboard] = useState(false);
  const [editTenant, setEditTenant] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const filtered = tenants.filter((t: any) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.subscription?.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const alertCount = tenants.filter((t: any) => getExpiryInfo(t.subscription)?.urgent).length;
  const expiredCount = tenants.filter((t: any) => ['expired', 'suspended', 'cancelled'].includes(t.subscription?.status)).length;
  const activeCount = tenants.filter((t: any) => t.subscription?.status === 'active').length;
  const trialCount = tenants.filter((t: any) => t.subscription?.status === 'trial').length;

  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirmText !== deleteTarget.slug) return;
    await deleteTenant.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
    setDeleteConfirmText('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-500" />
            Painel Master
          </h1>
          <p className="text-sm text-muted-foreground mt-1">CRM & Gestão da plataforma OrdFy</p>
        </div>
        <Button onClick={() => setShowOnboard(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Empresa
        </Button>
      </div>

      {/* CRM Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'MRR', value: stats?.mrr ? `R$ ${Number(stats.mrr).toLocaleString('pt-BR')}` : 'R$ 0', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/5' },
          { label: 'Empresas', value: stats?.total_tenants || 0, icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/5' },
          { label: 'Ativos', value: activeCount, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/5' },
          { label: 'Trial', value: trialCount, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/5' },
          { label: 'Usuários', value: stats?.total_users || 0, icon: Users, color: 'text-violet-500', bg: 'bg-violet-500/5' },
          { label: 'OS Total', value: stats?.total_work_orders || 0, icon: ClipboardList, color: 'text-blue-500', bg: 'bg-blue-500/5' },
        ].map(s => (
          <Card key={s.label} className={cn("border-0 shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)]", s.bg)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{s.label}</p>
                  <p className="text-xl font-bold mt-0.5">{statsLoading ? '...' : s.value}</p>
                </div>
                <s.icon className={cn('h-6 w-6 opacity-60', s.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {alertCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm">
            <span className="font-semibold text-amber-600 dark:text-amber-400">{alertCount}</span> empresa{alertCount > 1 ? 's' : ''} com vencimento próximo ou expirado
            {expiredCount > 0 && <span className="text-red-500 ml-2">({expiredCount} expirado{expiredCount > 1 ? 's' : ''})</span>}
          </p>
          <Button size="sm" variant="outline" className="ml-auto text-xs h-7" onClick={() => setStatusFilter('expired')}>
            Ver
          </Button>
        </div>
      )}

      {/* Plan distribution chips */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {stats?.plans && Object.entries(stats.plans as Record<string, number>).map(([plan, count]) => (
            <Badge key={plan} variant="outline" className={cn('text-xs px-3 py-1.5 cursor-pointer', planColors[plan])}
              onClick={() => setStatusFilter('all')}>
              {planLabels[plan] || plan}: {count}
            </Badge>
          ))}
        </div>
        <div className="flex gap-1.5">
          {['all', 'active', 'trial', 'expired', 'suspended', 'cancelled'].map(st => (
            <Button
              key={st}
              size="sm"
              variant={statusFilter === st ? 'default' : 'ghost'}
              className={cn("text-xs h-7", statusFilter !== st && "text-muted-foreground")}
              onClick={() => setStatusFilter(st)}
            >
              {st === 'all' ? 'Todos' : statusLabels[st] || st}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Tenant list */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} empresa{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {tenantsLoading ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Nenhuma empresa encontrada</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((t: any) => {
              const sub = t.subscription;
              const plan = sub?.plan || 'sem plano';
              const status = sub?.status || 'sem assinatura';
              const usage = sub ? `${t.active_users}/${sub.max_users}` : `${t.active_users}/?`;
              const usagePercent = sub ? (t.active_users / sub.max_users) * 100 : 0;
              const expiryInfo = getExpiryInfo(sub);

              return (
                <Card key={t.id} className={cn(
                  "border-0 shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] hover:shadow-[0_4px_16px_0_hsl(var(--foreground)/0.08)] transition-shadow",
                  expiryInfo?.urgent && "ring-1 ring-amber-500/20"
                )}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{t.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">{t.slug}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <Badge variant="outline" className={cn('text-[10px]', planColors[plan])}>
                          {planLabels[plan] || plan}
                        </Badge>
                        <Badge variant="outline" className={cn('text-[10px]', statusColors[status])}>
                          {statusLabels[status] || status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Usuários</span>
                        <span className="font-medium">{usage}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all',
                            usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                          )}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      {expiryInfo ? (
                        <span className={cn("flex items-center gap-1", expiryInfo.urgent ? "text-amber-600" : "text-muted-foreground")}>
                          <expiryInfo.icon className="h-3 w-3" />
                          {expiryInfo.label}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {sub?.monthly_price > 0 && (
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          R$ {Number(sub.monthly_price).toLocaleString('pt-BR')}/mês
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{sub?.enabled_modules?.length || 0} módulos</span>
                      <span className="font-mono text-[10px]">
                        {t.created_at ? format(parseISO(t.created_at), "dd/MM/yy", { locale: ptBR }) : ''}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1"
                        onClick={() => setEditTenant(t)}>
                        <Settings className="h-3 w-3" /> Gerenciar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(t)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <OnboardTenantDialog open={showOnboard} onClose={() => setShowOnboard(false)} />
      {editTenant && (
        <EditSubscriptionDialog tenant={editTenant} open={!!editTenant} onClose={() => setEditTenant(null)} />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) { setDeleteTarget(null); setDeleteConfirmText(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir empresa "{deleteTarget?.name}"
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Esta ação é <strong>irreversível</strong>. Todos os dados da empresa serão permanentemente excluídos:
                ordens de serviço, ativos, estoque, documentos, usuários órfãos e toda configuração.
              </p>
              <div className="space-y-1.5">
                <p className="text-xs font-medium">Para confirmar, digite o slug da empresa: <code className="text-destructive font-bold">{deleteTarget?.slug}</code></p>
                <Input
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder={deleteTarget?.slug}
                  className="font-mono text-sm"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteConfirmText !== deleteTarget?.slug || deleteTenant.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTenant.isPending ? 'Excluindo...' : 'Excluir Permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

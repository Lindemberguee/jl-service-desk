import { useState } from 'react';
import { useMasterTenants, usePlatformStats, useDeleteTenant } from '@/hooks/useMasterAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Building2, Users, ClipboardList, TrendingUp, Plus, Search, Crown, Settings,
  AlertTriangle, Clock, CalendarX, DollarSign, Trash2, MessageCircle, ArrowUpRight,
  Sparkles, Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardTenantDialog } from './OnboardTenantDialog';
import { EditSubscriptionDialog } from './EditSubscriptionDialog';
import { format, differenceInDays, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const planLabels: Record<string, string> = {
  trial: 'Trial', starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise', custom: 'Custom',
};
const planEmojis: Record<string, string> = {
  trial: '🧪', starter: '🚀', professional: '💼', enterprise: '🏢', custom: '⚙️',
};
const planColors: Record<string, string> = {
  trial: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
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
  trial: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
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

  const crmStats = [
    { label: 'MRR', value: stats?.mrr ? `R$ ${Number(stats.mrr).toLocaleString('pt-BR')}` : 'R$ 0', icon: DollarSign, gradient: 'from-emerald-500/15 to-emerald-600/5', color: 'text-emerald-500' },
    { label: 'Empresas', value: stats?.total_tenants || 0, icon: Building2, gradient: 'from-blue-500/15 to-blue-600/5', color: 'text-blue-500' },
    { label: 'Ativos', value: activeCount, icon: TrendingUp, gradient: 'from-emerald-500/15 to-emerald-600/5', color: 'text-emerald-500' },
    { label: 'Trial', value: trialCount, icon: Clock, gradient: 'from-amber-500/15 to-amber-600/5', color: 'text-amber-500' },
    { label: 'Usuários', value: stats?.total_users || 0, icon: Users, gradient: 'from-violet-500/15 to-violet-600/5', color: 'text-violet-500' },
    { label: 'OS Total', value: stats?.total_work_orders || 0, icon: ClipboardList, gradient: 'from-blue-500/15 to-blue-600/5', color: 'text-blue-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 border border-primary/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Crown className="h-5 w-5 text-white" />
              </div>
              Painel Master
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">CRM & Gestão da plataforma OrdFy</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => window.open('https://wa.me/5512996543522', '_blank')}
            >
              <MessageCircle className="h-4 w-4" />
              Suporte
            </Button>
            <Button onClick={() => setShowOnboard(true)} className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Nova Empresa
            </Button>
          </div>
        </div>
      </div>

      {/* CRM Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {crmStats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={cn("border-0 shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] bg-gradient-to-br", s.gradient)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{s.label}</p>
                    <p className="text-xl font-bold mt-1">{statsLoading ? '...' : s.value}</p>
                  </div>
                  <div className="h-9 w-9 rounded-xl bg-background/60 backdrop-blur-sm flex items-center justify-center">
                    <s.icon className={cn('h-4.5 w-4.5', s.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {alertCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
          >
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-sm flex-1">
              <span className="font-semibold text-amber-600 dark:text-amber-400">{alertCount}</span> empresa{alertCount > 1 ? 's' : ''} com vencimento próximo ou expirado
              {expiredCount > 0 && <span className="text-destructive ml-2">({expiredCount} expirado{expiredCount > 1 ? 's' : ''})</span>}
            </p>
            <Button size="sm" variant="outline" className="text-xs h-7 border-amber-500/30 text-amber-600 hover:bg-amber-500/10" onClick={() => setStatusFilter('expired')}>
              Ver alertas
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {stats?.plans && Object.entries(stats.plans as Record<string, number>).map(([plan, count]) => (
            <Badge key={plan} variant="outline" className={cn('text-xs px-3 py-1.5 cursor-pointer gap-1.5 transition-all hover:scale-105', planColors[plan])}
              onClick={() => setStatusFilter('all')}>
              <span>{planEmojis[plan]}</span>
              {planLabels[plan] || plan}: {count}
            </Badge>
          ))}
        </div>
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
          {['all', 'active', 'trial', 'expired', 'suspended'].map(st => (
            <button
              key={st}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg transition-all duration-200 font-medium",
                statusFilter === st
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setStatusFilter(st)}
            >
              {st === 'all' ? 'Todos' : statusLabels[st] || st}
            </button>
          ))}
        </div>
      </div>

      {/* Search + tenant list */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} empresa{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {tenantsLoading ? (
          <div className="py-20 text-center">
            <Sparkles className="h-8 w-8 mx-auto text-primary/40 animate-pulse mb-3" />
            <p className="text-sm text-muted-foreground">Carregando plataforma...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Building2 className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma empresa encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((t: any, i: number) => {
              const sub = t.subscription;
              const plan = sub?.plan || 'sem plano';
              const status = sub?.status || 'sem assinatura';
              const usagePercent = sub ? Math.min((t.active_users / sub.max_users) * 100, 100) : 0;
              const expiryInfo = getExpiryInfo(sub);

              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className={cn(
                    "group border-0 shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] hover:shadow-[0_8px_24px_0_hsl(var(--foreground)/0.08)] transition-all duration-300 rounded-xl overflow-hidden",
                    expiryInfo?.urgent && "ring-1 ring-amber-500/20"
                  )}>
                    {/* Plan color strip */}
                    <div className={cn("h-1", planColors[plan]?.replace('text-', 'bg-').replace('/10', '/40').split(' ')[0] || 'bg-muted')} />

                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-lg">
                            {planEmojis[plan] || '📦'}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{t.name}</h3>
                            <p className="text-[11px] text-muted-foreground font-mono">{t.slug}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant="outline" className={cn('text-[10px] h-5', planColors[plan])}>
                            {planLabels[plan] || plan}
                          </Badge>
                          <Badge variant="outline" className={cn('text-[10px] h-5', statusColors[status])}>
                            {statusLabels[status] || status}
                          </Badge>
                        </div>
                      </div>

                      {/* Usage bar */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1.5">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> Usuários
                          </span>
                          <span className="font-medium">{t.active_users}/{sub?.max_users >= 999 ? '∞' : sub?.max_users || '?'}</span>
                        </div>
                        <Progress
                          value={usagePercent}
                          className={cn("h-1.5", usagePercent >= 90 ? '[&>div]:bg-destructive' : usagePercent >= 70 ? '[&>div]:bg-amber-500' : '')}
                        />
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
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {sub?.enabled_modules?.length || 0} mód.
                          </span>
                          {sub?.monthly_price > 0 && (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              R$ {Number(sub.monthly_price).toLocaleString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1.5 rounded-lg group-hover:border-primary/30 group-hover:text-primary transition-colors"
                          onClick={() => setEditTenant(t)}>
                          <Settings className="h-3 w-3" /> Gerenciar
                          <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive rounded-lg"
                          onClick={() => setDeleteTarget(t)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
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
                Esta ação é <strong>irreversível</strong>. Todos os dados serão permanentemente excluídos.
              </p>
              <div className="space-y-1.5">
                <p className="text-xs font-medium">Para confirmar, digite o slug: <code className="text-destructive font-bold">{deleteTarget?.slug}</code></p>
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

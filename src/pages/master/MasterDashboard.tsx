import { useState } from 'react';
import { useMasterTenants, usePlatformStats } from '@/hooks/useMasterAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Building2, Users, ClipboardList, TrendingUp, Plus, Search, Crown, Settings, Eye, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardTenantDialog } from './OnboardTenantDialog';
import { EditSubscriptionDialog } from './EditSubscriptionDialog';

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

export default function MasterDashboard() {
  const { data: tenants = [], isLoading: tenantsLoading } = useMasterTenants();
  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const [search, setSearch] = useState('');
  const [showOnboard, setShowOnboard] = useState(false);
  const [editTenant, setEditTenant] = useState<any>(null);

  const filtered = tenants.filter((t: any) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase())
  );

  const statCards = [
    { label: 'Empresas', value: stats?.total_tenants || 0, icon: Building2, color: 'text-blue-500' },
    { label: 'Usuários Totais', value: stats?.total_users || 0, icon: Users, color: 'text-violet-500' },
    { label: 'Usuários Ativos', value: stats?.active_users || 0, icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Ordens de Serviço', value: stats?.total_work_orders || 0, icon: ClipboardList, color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-500" />
            Painel Master
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gestão da plataforma OrdFy</p>
        </div>
        <Button onClick={() => setShowOnboard(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Empresa
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(s => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">
                    {statsLoading ? '...' : s.value}
                  </p>
                </div>
                <s.icon className={cn('h-8 w-8', s.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan distribution */}
      {stats?.plans && Object.keys(stats.plans).length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {Object.entries(stats.plans as Record<string, number>).map(([plan, count]) => (
            <Badge key={plan} variant="outline" className={cn('text-xs px-3 py-1.5', planColors[plan])}>
              {planLabels[plan] || plan}: {count}
            </Badge>
          ))}
        </div>
      )}

      <Separator />

      {/* Tenant list */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empresa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
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

              return (
                <Card key={t.id} className="hover:border-primary/20 transition-colors">
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
                    {/* User usage bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Usuários</span>
                        <span className="font-medium">{usage}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                          )}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {sub?.monthly_price > 0 && (
                      <p className="text-xs text-muted-foreground">
                        R$ {Number(sub.monthly_price).toLocaleString('pt-BR')}/mês
                      </p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs gap-1"
                        onClick={() => setEditTenant(t)}
                      >
                        <Settings className="h-3 w-3" /> Plano
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
        <EditSubscriptionDialog
          tenant={editTenant}
          open={!!editTenant}
          onClose={() => setEditTenant(null)}
        />
      )}
    </div>
  );
}

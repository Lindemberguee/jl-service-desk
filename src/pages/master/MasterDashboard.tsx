import { useState } from 'react';
import { useMasterTenants, usePlatformStats, useDeleteTenant } from '@/hooks/useMasterAdmin';
import { usePlatformSetting, useUpdatePlatformSetting } from '@/hooks/usePlatformSettings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Trash2, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardTenantDialog } from './OnboardTenantDialog';
import { EditSubscriptionDialog } from './EditSubscriptionDialog';
import { format, differenceInDays, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const planLabels: Record<string, string> = {
  trial: 'Trial', starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise', custom: 'Custom',
};
const statusLabels: Record<string, string> = {
  active: 'Ativo', trial: 'Trial', expired: 'Expirado', suspended: 'Suspenso', cancelled: 'Cancelado',
};
const statusDot: Record<string, string> = {
  active: 'bg-emerald-500',
  trial: 'bg-amber-500',
  expired: 'bg-red-500',
  suspended: 'bg-orange-500',
  cancelled: 'bg-muted-foreground/40',
};

function getExpiryLabel(sub: any): { label: string; urgent: boolean } | null {
  if (!sub) return null;
  if (sub.status === 'trial' && sub.trial_ends_at) {
    const endDate = parseISO(sub.trial_ends_at);
    if (isPast(endDate)) return { label: 'Expirado', urgent: true };
    const days = differenceInDays(endDate, new Date());
    if (days <= 7) return { label: `${days}d restantes`, urgent: true };
    return { label: format(endDate, 'dd/MM/yy', { locale: ptBR }), urgent: false };
  }
  if (sub.current_period_end) {
    const endDate = parseISO(sub.current_period_end);
    if (endDate.getFullYear() >= 2090) return { label: 'Indeterminado', urgent: false };
    if (isPast(endDate)) return { label: 'Expirado', urgent: true };
    const days = differenceInDays(endDate, new Date());
    if (days <= 7) return { label: `${days}d restantes`, urgent: true };
    return { label: format(endDate, 'dd/MM/yy', { locale: ptBR }), urgent: false };
  }
  return null;
}

export default function MasterDashboard() {
  const { data: tenants = [], isLoading: tenantsLoading } = useMasterTenants();
  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const deleteTenant = useDeleteTenant();
  const { data: whatsappEnabled } = usePlatformSetting('whatsapp_button_enabled');
  const updateSetting = useUpdatePlatformSetting();
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

  const alertCount = tenants.filter((t: any) => getExpiryLabel(t.subscription)?.urgent).length;
  const activeCount = tenants.filter((t: any) => t.subscription?.status === 'active').length;
  const trialCount = tenants.filter((t: any) => t.subscription?.status === 'trial').length;

  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirmText !== deleteTarget.slug) return;
    await deleteTenant.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
    setDeleteConfirmText('');
  };

  const kpis = [
    { label: 'MRR', value: stats?.mrr ? `R$ ${Number(stats.mrr).toLocaleString('pt-BR')}` : '—' },
    { label: 'Empresas', value: stats?.total_tenants ?? '—' },
    { label: 'Ativos', value: activeCount },
    { label: 'Trial', value: trialCount },
    { label: 'Usuários', value: stats?.total_users ?? '—' },
    { label: 'Ordens', value: stats?.total_work_orders ?? '—' },
  ];

  const filterTabs = [
    { key: 'all', label: 'Todos' },
    { key: 'active', label: 'Ativos' },
    { key: 'trial', label: 'Trial' },
    { key: 'expired', label: 'Expirados' },
    { key: 'suspended', label: 'Suspensos' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Visão Geral</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {alertCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-medium mr-1">{alertCount} alerta{alertCount > 1 ? 's' : ''} ·</span>
            )}
            {filtered.length} empresa{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowOnboard(true)} size="sm" className="h-8 text-xs gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Nova Empresa
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-px bg-border rounded-lg overflow-hidden">
        {kpis.map(k => (
          <div key={k.label} className="bg-background px-4 py-3.5 text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{k.label}</p>
            <p className="text-lg font-semibold mt-0.5 tabular-nums">{statsLoading ? '…' : k.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Settings */}
      <div className="flex items-center gap-6 bg-card border rounded-lg px-5 py-3">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-4 w-4 text-emerald-500" />
          <Label htmlFor="whatsapp-toggle" className="text-sm font-medium cursor-pointer">Botão "Fale Conosco"</Label>
        </div>
        <Switch
          id="whatsapp-toggle"
          checked={whatsappEnabled === true}
          onCheckedChange={(checked) => updateSetting.mutate({ key: 'whatsapp_button_enabled', value: checked })}
        />
        <span className="text-xs text-muted-foreground">
          {whatsappEnabled ? 'Visível no menu lateral' : 'Oculto para todos'}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              className={cn(
                "text-xs px-3 py-1.5 rounded-md transition-all font-medium",
                statusFilter === tab.key
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Tenant table */}
      {tenantsLoading ? (
        <div className="py-20 text-center">
          <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma empresa encontrada</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-2.5">Empresa</th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-2.5">Plano</th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-2.5">Status</th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-2.5">Usuários</th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-2.5">Vencimento</th>
                <th className="text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-2.5">Valor</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t: any) => {
                const sub = t.subscription;
                const plan = sub?.plan || '—';
                const status = sub?.status || '—';
                const expiryInfo = getExpiryLabel(sub);
                const usagePercent = sub?.max_users ? Math.min((t.active_users / sub.max_users) * 100, 100) : 0;

                return (
                  <tr
                    key={t.id}
                    className="group hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setEditTenant(t)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{t.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium">{planLabels[plan] || plan}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[status] || 'bg-muted-foreground/40')} />
                        {statusLabels[status] || status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 w-24">
                        <span className="text-xs tabular-nums">{t.active_users}/{sub?.max_users >= 999 ? '∞' : sub?.max_users || '—'}</span>
                        <Progress value={usagePercent} className="h-1" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {expiryInfo ? (
                        <span className={cn("text-xs", expiryInfo.urgent ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground")}>
                          {expiryInfo.label}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {sub?.monthly_price > 0 ? (
                        <span className="text-xs font-medium tabular-nums">R$ {Number(sub.monthly_price).toLocaleString('pt-BR')}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        onClick={e => { e.stopPropagation(); setDeleteTarget(t); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <OnboardTenantDialog open={showOnboard} onClose={() => setShowOnboard(false)} />
      {editTenant && (
        <EditSubscriptionDialog tenant={editTenant} open={!!editTenant} onClose={() => setEditTenant(null)} />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) { setDeleteTarget(null); setDeleteConfirmText(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deleteTarget?.name}"</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Esta ação é <strong>irreversível</strong>. Todos os dados serão permanentemente excluídos.</p>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium">Para confirmar, digite: <code className="text-destructive font-bold">{deleteTarget?.slug}</code></p>
                  <Input
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    placeholder={deleteTarget?.slug}
                    className="font-mono text-sm"
                  />
                </div>
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
              {deleteTenant.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

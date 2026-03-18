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
import {
  Plus, Search, Trash2, MessageCircle, Building2, Users, FileText, BarChart3,
  Shield, CreditCard, Bell, Globe, Palette, Database, Zap, HardDrive,
  TrendingUp, Plug, Headphones, BookOpen, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardTenantDialog } from './OnboardTenantDialog';
import { EditSubscriptionDialog } from './EditSubscriptionDialog';
import { format, differenceInDays, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

/* ─── Helpers ───────────────────────────────── */

const planLabels: Record<string, string> = {
  trial: 'Trial', starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise', custom: 'Custom',
};
const statusLabels: Record<string, string> = {
  active: 'Ativo', trial: 'Trial', expired: 'Expirado', suspended: 'Suspenso', cancelled: 'Cancelado',
};
const statusDot: Record<string, string> = {
  active: 'bg-emerald-500', trial: 'bg-amber-500', expired: 'bg-red-500',
  suspended: 'bg-orange-500', cancelled: 'bg-muted-foreground/40',
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

/* ─── Future Modules ────────────────────────── */

const modules = [
  { icon: Building2, label: 'Empresas', description: 'Gestão de tenants e planos', href: '#tenants', active: true },
  { icon: Users, label: 'Usuários', description: 'Todos os usuários da plataforma', href: '/master/usuarios', active: true },
  { icon: FileText, label: 'Auditoria', description: 'Logs globais de atividades', href: '/master/auditoria', active: true },
  { icon: Zap, label: 'E-mail', description: 'SMTP e templates do sistema', href: '/master/email', active: true },
  { icon: CreditCard, label: 'Faturamento', description: 'Cobranças, notas fiscais e pagamentos', href: '#', active: false },
  { icon: BarChart3, label: 'Analytics', description: 'Métricas de uso e engajamento', href: '#', active: false },
  { icon: Shield, label: 'Segurança', description: 'Políticas de senha, 2FA e IP allowlist', href: '#', active: false },
  { icon: Bell, label: 'Notificações', description: 'Push, e-mail e webhooks globais', href: '#', active: false },
  { icon: Globe, label: 'Domínios', description: 'White-label e domínios customizados', href: '#', active: false },
  { icon: Palette, label: 'Branding', description: 'Temas globais e personalização', href: '#', active: false },
  { icon: Database, label: 'Backups', description: 'Snapshots e restauração de dados', href: '#', active: false },
  { icon: HardDrive, label: 'Storage', description: 'Uso de armazenamento por tenant', href: '#', active: false },
  { icon: TrendingUp, label: 'SLA Global', description: 'Monitoramento de SLA da plataforma', href: '#', active: false },
  { icon: Plug, label: 'Integrações', description: 'APIs externas e marketplaces', href: '#', active: false },
  { icon: Headphones, label: 'Suporte', description: 'Tickets e help-desk interno', href: '#', active: false },
  { icon: BookOpen, label: 'Changelog', description: 'Histórico de versões e releases', href: '#', active: false },
];

/* ─── Component ─────────────────────────────── */

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
    { label: 'MRR', value: stats?.mrr ? `R$ ${Number(stats.mrr).toLocaleString('pt-BR')}` : '—', icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Empresas', value: stats?.total_tenants ?? '—', icon: Building2, color: 'text-primary' },
    { label: 'Ativos', value: activeCount, icon: Activity, color: 'text-emerald-500' },
    { label: 'Trial', value: trialCount, icon: Zap, color: 'text-amber-500' },
    { label: 'Usuários', value: stats?.total_users ?? '—', icon: Users, color: 'text-blue-500' },
    { label: 'Ordens', value: stats?.total_work_orders ?? '—', icon: FileText, color: 'text-violet-500' },
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
      {/* ─── Header ─── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel Master</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administração centralizada da plataforma
            {alertCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-medium ml-2">· {alertCount} alerta{alertCount > 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <Button onClick={() => setShowOnboard(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Nova Empresa
        </Button>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="rounded-xl border bg-card p-4 shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] hover:shadow-[0_4px_16px_0_hsl(var(--foreground)/0.08)] transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{k.label}</span>
              <k.icon className={cn("h-4 w-4", k.color)} />
            </div>
            <p className="text-2xl font-bold tabular-nums">{statsLoading ? '…' : k.value}</p>
          </div>
        ))}
      </div>

      {/* ─── Modules Grid ─── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Módulos de Administração</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {modules.map(mod => {
            const Inner = (
              <div
                key={mod.label}
                className={cn(
                  "group relative rounded-xl border p-4 transition-all cursor-pointer",
                  mod.active
                    ? "bg-card hover:shadow-[0_4px_16px_0_hsl(var(--foreground)/0.08)] hover:border-primary/30"
                    : "bg-muted/30 border-dashed opacity-60 cursor-default"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "rounded-lg p-2 transition-colors",
                    mod.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <mod.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{mod.label}</span>
                      {!mod.active && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-medium">Em breve</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{mod.description}</p>
                  </div>
                </div>
              </div>
            );
            if (mod.active && mod.href !== '#tenants') {
              return <Link key={mod.label} to={mod.href} className="no-underline">{Inner}</Link>;
            }
            return <div key={mod.label} onClick={mod.href === '#tenants' ? () => document.getElementById('tenant-section')?.scrollIntoView({ behavior: 'smooth' }) : undefined}>{Inner}</div>;
          })}
        </div>
      </div>

      {/* ─── Quick Settings ─── */}
      <div className="flex items-center gap-6 bg-card border rounded-xl px-5 py-3 shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)]">
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

      {/* ─── Tenant Section ─── */}
      <div id="tenant-section" className="space-y-4">
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
            <Input placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>
        </div>

        {tenantsLoading ? (
          <div className="py-20 text-center">
            <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma empresa encontrada</p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)]">
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
                    <tr key={t.id} className="group hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setEditTenant(t)}>
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
                          size="sm" variant="ghost"
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
      </div>

      {/* ─── Dialogs ─── */}
      <OnboardTenantDialog open={showOnboard} onClose={() => setShowOnboard(false)} />
      {editTenant && <EditSubscriptionDialog tenant={editTenant} open={!!editTenant} onClose={() => setEditTenant(null)} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) { setDeleteTarget(null); setDeleteConfirmText(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deleteTarget?.name}"</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Esta ação é <strong>irreversível</strong>. Todos os dados serão permanentemente excluídos.</p>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium">Para confirmar, digite: <code className="text-destructive font-bold">{deleteTarget?.slug}</code></p>
                  <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder={deleteTarget?.slug} className="font-mono text-sm" />
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

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useOnboardTenant } from '@/hooks/useMasterAdmin';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const allModuleKeys = ['os', 'dashboard', 'assets', 'stock', 'portal', 'notifications', 'kpis', 'manutencao', 'reports', 'docs', 'knowledge', 'checklist', 'canvas', 'notes', 'reminders', 'vault', 'audit', 'disposal', 'api', 'theme'];

const planModules: Record<string, string[]> = {
  starter: ['os', 'dashboard', 'assets', 'stock', 'portal', 'notifications'],
  professional: ['os', 'dashboard', 'assets', 'stock', 'portal', 'notifications', 'kpis', 'manutencao', 'reports', 'docs', 'knowledge', 'checklist', 'api'],
  enterprise: allModuleKeys,
  custom: allModuleKeys,
  trial: ['os', 'dashboard', 'assets', 'stock', 'portal', 'notifications'],
};

const planMaxUsers: Record<string, number> = {
  starter: 5, professional: 20, enterprise: 999, custom: 999, trial: 5,
};

const planPrices: Record<string, number> = {
  starter: 299, professional: 799, enterprise: 1999, custom: 0, trial: 0,
};

export function OnboardTenantDialog({ open, onClose }: Props) {
  const onboard = useOnboardTenant();
  const [form, setForm] = useState({
    tenant_name: '', tenant_slug: '', plan: 'trial',
    admin_email: '', admin_password: '', admin_name: '',
    max_users: 5, monthly_price: 0, trial_days: 14,
    indefinite: false, custom_days: 365,
  });

  const update = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const handlePlanChange = (plan: string) => {
    update('plan', plan);
    update('max_users', planMaxUsers[plan] || 5);
    update('monthly_price', planPrices[plan] || 0);
  };

  const slugify = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      ...form,
      enabled_modules: planModules[form.plan] || planModules.starter,
    };
    // For custom/enterprise with indefinite, set trial_days to a very large number
    if (form.indefinite) {
      payload.trial_days = null; // signal to backend: no expiry
    } else if (form.plan === 'custom') {
      payload.trial_days = form.custom_days;
    }
    await onboard.mutateAsync(payload);
    setForm({
      tenant_name: '', tenant_slug: '', plan: 'trial',
      admin_email: '', admin_password: '', admin_name: '',
      max_users: 5, monthly_price: 0, trial_days: 14,
      indefinite: false, custom_days: 365,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Empresa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome da Empresa</Label>
              <Input
                required
                value={form.tenant_name}
                onChange={e => {
                  update('tenant_name', e.target.value);
                  update('tenant_slug', slugify(e.target.value));
                }}
                placeholder="Empresa XPTO"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Slug (URL)</Label>
              <Input
                required
                value={form.tenant_slug}
                onChange={e => update('tenant_slug', e.target.value)}
                placeholder="empresa-xpto"
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Plano</Label>
              <Select value={form.plan} onValueChange={handlePlanChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="custom">Custom (Personalizado)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Máx. Usuários</Label>
              <Input
                type="number" min={1}
                value={form.max_users}
                onChange={e => update('max_users', parseInt(e.target.value) || 5)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Preço/mês (R$)</Label>
              <Input
                type="number" min={0} step={0.01}
                value={form.monthly_price}
                onChange={e => update('monthly_price', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {form.plan === 'trial' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Dias de Trial</Label>
              <Input
                type="number" min={1}
                value={form.trial_days}
                onChange={e => update('trial_days', parseInt(e.target.value) || 14)}
              />
            </div>
          )}

          {(form.plan === 'custom' || form.plan === 'enterprise') && (
            <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={form.indefinite}
                  onCheckedChange={(v) => update('indefinite', !!v)}
                />
                <span className="text-xs font-medium">Validade indeterminada (sem expiração)</span>
              </label>
              {!form.indefinite && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Validade em dias</Label>
                  <Input
                    type="number" min={1}
                    value={form.custom_days}
                    onChange={e => update('custom_days', parseInt(e.target.value) || 365)}
                    placeholder="365"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    ≈ {Math.round((form.custom_days || 365) / 365 * 10) / 10} ano(s)
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="border-t pt-4 space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Primeiro Administrador</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input required value={form.admin_name} onChange={e => update('admin_name', e.target.value)} placeholder="João Silva" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail</Label>
                <Input required type="email" value={form.admin_email} onChange={e => update('admin_email', e.target.value)} placeholder="joao@empresa.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Senha</Label>
                <Input required type="password" value={form.admin_password} onChange={e => update('admin_password', e.target.value)} placeholder="Min. 6 caracteres" minLength={6} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={onboard.isPending}>
              {onboard.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Empresa
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useUpdateSubscription } from '@/hooks/useMasterAdmin';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';

interface Props {
  tenant: any;
  open: boolean;
  onClose: () => void;
}

const allModules = [
  { key: 'os', label: 'Ordens de Serviço', core: true },
  { key: 'dashboard', label: 'Dashboard', core: true },
  { key: 'portal', label: 'Portal Solicitante', core: true },
  { key: 'notifications', label: 'Notificações', core: true },
  { key: 'assets', label: 'Ativos', core: false },
  { key: 'stock', label: 'Estoque', core: false },
  { key: 'kpis', label: 'KPIs & OKRs', core: false },
  { key: 'manutencao', label: 'Manutenção', core: false },
  { key: 'reports', label: 'Relatórios', core: false },
  { key: 'docs', label: 'Documentos', core: false },
  { key: 'knowledge', label: 'Base de Conhecimento', core: false },
  { key: 'checklist', label: 'Checklists', core: false },
  { key: 'canvas', label: 'Canvas', core: false },
  { key: 'notes', label: 'Anotações', core: false },
  { key: 'reminders', label: 'Lembretes', core: false },
  { key: 'vault', label: 'Cofre Digital', core: false },
  { key: 'audit', label: 'Auditoria', core: false },
  { key: 'disposal', label: 'Descartes', core: false },
  { key: 'api', label: 'API', core: false },
  { key: 'theme', label: 'Tema Personalizado', core: false },
];

const coreModules = allModules.filter(m => m.core).map(m => m.key);

const planPresets: Record<string, { modules: string[]; max_users: number; price: number }> = {
  trial: { modules: [...coreModules], max_users: 3, price: 0 },
  starter: { modules: [...coreModules, 'reports'], max_users: 10, price: 199 },
  professional: { modules: [...coreModules, 'assets', 'stock', 'manutencao', 'reports', 'docs', 'kpis', 'checklist', 'disposal'], max_users: 30, price: 499 },
  enterprise: { modules: allModules.map(m => m.key), max_users: 999, price: 999 },
  custom: { modules: allModules.map(m => m.key), max_users: 999, price: 0 },
};

const plans = ['trial', 'starter', 'professional', 'enterprise', 'custom'] as const;
const planLabels: Record<string, string> = { trial: 'Trial', starter: 'Starter', professional: 'Pro', enterprise: 'Enterprise', custom: 'Custom' };

export function EditSubscriptionDialog({ tenant, open, onClose }: Props) {
  const update = useUpdateSubscription();
  const sub = tenant.subscription;

  const [form, setForm] = useState({
    plan: sub?.plan || 'starter',
    status: sub?.status || 'active',
    max_users: sub?.max_users || 5,
    monthly_price: sub?.monthly_price || 0,
    enabled_modules: sub?.enabled_modules || ['os', 'dashboard'],
    notes: sub?.notes || '',
  });

  useEffect(() => {
    if (sub) {
      setForm({
        plan: sub.plan, status: sub.status, max_users: sub.max_users,
        monthly_price: sub.monthly_price || 0, enabled_modules: sub.enabled_modules || [],
        notes: sub.notes || '',
      });
    }
  }, [sub]);

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const handlePlanChange = (newPlan: string) => {
    const preset = planPresets[newPlan];
    if (preset) {
      setForm(prev => ({
        ...prev,
        plan: newPlan,
        enabled_modules: preset.modules,
        max_users: newPlan === 'custom' ? prev.max_users : preset.max_users,
        monthly_price: newPlan === 'custom' ? prev.monthly_price : preset.price,
      }));
    } else {
      set('plan', newPlan);
    }
  };

  const toggleModule = (mod: string) => {
    set('enabled_modules',
      form.enabled_modules.includes(mod)
        ? form.enabled_modules.filter((m: string) => m !== mod)
        : [...form.enabled_modules, mod]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await update.mutateAsync({ tenant_id: tenant.id, ...form });
    onClose();
  };

  const usagePercent = form.max_users ? Math.min((tenant.active_users / form.max_users) * 100, 100) : 0;

  // Expiry summary
  const periodEnd = sub?.current_period_end ? parseISO(sub.current_period_end) : null;
  const trialEnd = sub?.trial_ends_at ? parseISO(sub.trial_ends_at) : null;
  const relevantDate = sub?.status === 'trial' ? trialEnd : periodEnd;
  let expiryText = '—';
  if (relevantDate) {
    if (relevantDate.getFullYear() >= 2090) expiryText = 'Indeterminado';
    else if (isPast(relevantDate)) expiryText = 'Expirado';
    else expiryText = `${differenceInDays(relevantDate, new Date())} dias restantes`;
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{tenant.name}</DialogTitle>
          <p className="text-xs text-muted-foreground font-mono">{tenant.slug}</p>
        </DialogHeader>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-3 text-center py-2">
          <div>
            <p className="text-lg font-semibold tabular-nums">{tenant.active_users}/{form.max_users >= 999 ? '∞' : form.max_users}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Usuários</p>
          </div>
          <div>
            <p className="text-lg font-semibold tabular-nums">{form.enabled_modules.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Módulos</p>
          </div>
          <div>
            <p className={cn("text-lg font-semibold", expiryText === 'Expirado' && "text-destructive")}>{expiryText}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Vigência</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Plan selector */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Plano</Label>
            <div className="grid grid-cols-5 gap-1">
              {plans.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePlanChange(p)}
                  className={cn(
                    "py-2 rounded-md text-xs font-medium transition-all border",
                    form.plan === p
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/40"
                  )}
                >
                  {planLabels[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Máx. Usuários</Label>
              <Input type="number" min={1} value={form.max_users} onChange={e => set('max_users', parseInt(e.target.value) || 5)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Preço/mês (R$)</Label>
              <Input type="number" min={0} step={0.01} value={form.monthly_price} onChange={e => set('monthly_price', parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
            </div>
          </div>

          {/* License bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Uso de licenças</span>
              <span className="tabular-nums">{usagePercent.toFixed(0)}%</span>
            </div>
            <Progress value={usagePercent} className="h-1" />
          </div>

          {/* Modules */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Módulos ({form.enabled_modules.length}/{allModules.length})</Label>
              <div className="flex gap-1">
                <button type="button" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5"
                  onClick={() => set('enabled_modules', allModules.map(m => m.key))}>
                  Todos
                </button>
                <span className="text-muted-foreground/30">|</span>
                <button type="button" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5"
                  onClick={() => set('enabled_modules', coreModules)}>
                  Core
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-0.5 max-h-48 overflow-y-auto border rounded-md p-2">
              {allModules.map(m => {
                const checked = form.enabled_modules.includes(m.key);
                return (
                  <label
                    key={m.key}
                    className={cn(
                      "flex items-center gap-2 text-xs cursor-pointer py-1.5 px-2 rounded transition-colors",
                      checked ? "text-foreground" : "text-muted-foreground",
                      !m.core && "hover:bg-muted/50",
                      m.core && "cursor-default"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleModule(m.key)}
                      disabled={m.core}
                      className="h-3.5 w-3.5"
                    />
                    <span className="flex-1">{m.label}</span>
                    {m.core && (
                      <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 border-border text-muted-foreground">
                        core
                      </Badge>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Notas internas sobre este cliente..." className="resize-none text-xs" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={update.isPending} className="gap-1.5">
              {update.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

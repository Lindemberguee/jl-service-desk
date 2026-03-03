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
import { Loader2, AlertTriangle, CalendarDays, Users, Package, Crown, Sparkles, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

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

// Plan presets: modules + max_users + price defaults
const planPresets: Record<string, { modules: string[]; max_users: number; price: number }> = {
  trial: {
    modules: [...coreModules],
    max_users: 3,
    price: 0,
  },
  starter: {
    modules: [...coreModules, 'reports'],
    max_users: 10,
    price: 199,
  },
  professional: {
    modules: [...coreModules, 'assets', 'stock', 'manutencao', 'reports', 'docs', 'kpis', 'checklist', 'disposal'],
    max_users: 30,
    price: 499,
  },
  enterprise: {
    modules: allModules.map(m => m.key),
    max_users: 999,
    price: 999,
  },
  custom: {
    modules: allModules.map(m => m.key),
    max_users: 999,
    price: 0,
  },
};

const planIcons: Record<string, string> = {
  trial: '🧪', starter: '🚀', professional: '💼', enterprise: '🏢', custom: '⚙️',
};

const planGradients: Record<string, string> = {
  trial: 'from-amber-500/20 to-amber-600/5',
  starter: 'from-blue-500/20 to-blue-600/5',
  professional: 'from-violet-500/20 to-violet-600/5',
  enterprise: 'from-emerald-500/20 to-emerald-600/5',
  custom: 'from-slate-500/20 to-slate-600/5',
};

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

  const [planJustChanged, setPlanJustChanged] = useState(false);

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

  // Auto-apply plan preset when plan changes
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
      setPlanJustChanged(true);
      setTimeout(() => setPlanJustChanged(false), 1500);
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

  // Expiry info
  const trialExpiry = sub?.trial_ends_at ? parseISO(sub.trial_ends_at) : null;
  const periodEnd = sub?.current_period_end ? parseISO(sub.current_period_end) : null;
  const trialExpired = trialExpiry ? isPast(trialExpiry) : false;
  const trialDaysLeft = trialExpiry ? differenceInDays(trialExpiry, new Date()) : null;

  const usagePercent = sub?.max_users ? Math.min((tenant.active_users / sub.max_users) * 100, 100) : 0;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {/* Gradient header */}
        <div className={cn("px-6 pt-6 pb-4 bg-gradient-to-br", planGradients[form.plan] || planGradients.starter)}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <span className="text-xl">{planIcons[form.plan] || '📦'}</span>
              Gerenciar Plano — {tenant.name}
            </DialogTitle>
          </DialogHeader>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <motion.div layout className="p-3 rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 text-center">
              <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold">{tenant.active_users}/{form.max_users >= 999 ? '∞' : form.max_users}</p>
              <p className="text-[10px] text-muted-foreground">Usuários</p>
            </motion.div>
            <motion.div layout className="p-3 rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 text-center">
              <Package className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <AnimatePresence mode="wait">
                <motion.p
                  key={form.enabled_modules.length}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-lg font-bold"
                >
                  {form.enabled_modules.length}
                </motion.p>
              </AnimatePresence>
              <p className="text-[10px] text-muted-foreground">Módulos</p>
            </motion.div>
            <motion.div layout className={cn(
              "p-3 rounded-xl bg-background/80 backdrop-blur-sm border text-center",
              trialExpired ? "border-destructive/30" : "border-border/50"
            )}>
              <CalendarDays className={cn("h-4 w-4 mx-auto mb-1", trialExpired ? "text-destructive" : "text-muted-foreground")} />
              {sub?.status === 'trial' && trialDaysLeft !== null ? (
                <>
                  <p className={cn("text-lg font-bold", trialDaysLeft <= 0 ? "text-destructive" : trialDaysLeft <= 7 ? "text-amber-500" : "")}>
                    {trialDaysLeft <= 0 ? 'Expirado' : `${trialDaysLeft}d`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Trial restante</p>
                </>
              ) : periodEnd && periodEnd.getFullYear() >= 2090 ? (
                <>
                  <p className="text-lg font-bold text-emerald-500">∞</p>
                  <p className="text-[10px] text-muted-foreground">Indeterminado</p>
                </>
              ) : periodEnd ? (
                <>
                  <p className="text-lg font-bold">{format(periodEnd, 'dd/MM')}</p>
                  <p className="text-[10px] text-muted-foreground">Próx. renovação</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold">—</p>
                  <p className="text-[10px] text-muted-foreground">Sem data</p>
                </>
              )}
            </motion.div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Warning for expired */}
          {(trialExpired || sub?.status === 'expired' || sub?.status === 'suspended') && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">
                {sub?.status === 'suspended' ? 'Assinatura suspensa. Empresa sem acesso a novos recursos.' : 'Plano expirado. Atualize o status para restaurar.'}
              </p>
            </div>
          )}

          {/* Plan changed notification */}
          <AnimatePresence>
            {planJustChanged && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20"
              >
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs text-primary font-medium">
                  Módulos, usuários e preço ajustados automaticamente para o plano {form.plan}.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Plan selection as visual cards */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Plano</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {(['trial', 'starter', 'professional', 'enterprise', 'custom'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePlanChange(p)}
                    className={cn(
                      "p-2.5 rounded-xl border-2 transition-all duration-200 text-center",
                      form.plan === p
                        ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]"
                        : "border-transparent bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <span className="text-lg block mb-0.5">{planIcons[p]}</span>
                    <span className="text-[10px] font-medium capitalize block">{p === 'professional' ? 'Pro' : p}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">✅ Ativo</SelectItem>
                    <SelectItem value="trial">🧪 Trial</SelectItem>
                    <SelectItem value="expired">❌ Expirado</SelectItem>
                    <SelectItem value="suspended">⏸️ Suspenso</SelectItem>
                    <SelectItem value="cancelled">🚫 Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Máx. Usuários</Label>
                <Input type="number" min={1} value={form.max_users} onChange={e => set('max_users', parseInt(e.target.value) || 5)} className="h-9" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Preço/mês (R$)</Label>
              <Input type="number" min={0} step={0.01} value={form.monthly_price} onChange={e => set('monthly_price', parseFloat(e.target.value) || 0)} className="h-9" />
            </div>

            {/* User usage bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Uso de licenças</span>
                <span className="font-medium">{tenant.active_users}/{form.max_users >= 999 ? '∞' : form.max_users}</span>
              </div>
              <Progress
                value={usagePercent}
                className={cn("h-1.5", usagePercent >= 90 ? '[&>div]:bg-destructive' : usagePercent >= 70 ? '[&>div]:bg-amber-500' : '')}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Módulos Habilitados ({form.enabled_modules.length}/{allModules.length})</Label>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-2"
                    onClick={() => set('enabled_modules', allModules.map(m => m.key))}>
                    Todos
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-2"
                    onClick={() => set('enabled_modules', coreModules)}>
                    Apenas Core
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1 max-h-52 overflow-y-auto border rounded-xl p-3 bg-muted/20">
                {allModules.map(m => {
                  const checked = form.enabled_modules.includes(m.key);
                  return (
                    <motion.label
                      key={m.key}
                      layout
                      className={cn(
                        "flex items-center gap-2 text-xs cursor-pointer p-2 rounded-lg transition-all duration-150",
                        checked ? "bg-primary/8 ring-1 ring-primary/15" : "hover:bg-muted/60",
                        m.core && "cursor-default"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleModule(m.key)}
                        disabled={m.core}
                        className="h-3.5 w-3.5"
                      />
                      <span className={cn("flex-1", !checked && !m.core && "text-muted-foreground")}>{m.label}</span>
                      {m.core && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 border-muted-foreground/20 text-muted-foreground">
                          core
                        </Badge>
                      )}
                    </motion.label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Observações internas</Label>
              <Textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Ex: Cliente desde jan/2025, contrato anual..." className="resize-none" />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5 text-muted-foreground"
                onClick={() => window.open('https://wa.me/5512996543522?text=Olá! Preciso de suporte sobre o plano da empresa ' + tenant.name, '_blank')}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Suporte
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button type="submit" disabled={update.isPending} className="gap-1.5">
                  {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

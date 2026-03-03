import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useUpdateSubscription } from '@/hooks/useMasterAdmin';
import { Loader2, AlertTriangle, CalendarDays, Users, Package } from 'lucide-react';
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
  { key: 'assets', label: 'Ativos', core: false },
  { key: 'stock', label: 'Estoque', core: false },
  { key: 'portal', label: 'Portal Solicitante', core: true },
  { key: 'notifications', label: 'Notificações', core: true },
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
  const periodDaysLeft = periodEnd ? differenceInDays(periodEnd, new Date()) : null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Gerenciar Plano — {tenant.name}
          </DialogTitle>
        </DialogHeader>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-lg bg-muted/50 border">
            <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{tenant.active_users}/{sub?.max_users || '?'}</p>
            <p className="text-[10px] text-muted-foreground">Usuários</p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/50 border">
            <Package className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{sub?.enabled_modules?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Módulos</p>
          </div>
          <div className={cn("p-2.5 rounded-lg border", trialExpired || (periodDaysLeft !== null && periodDaysLeft <= 0) ? "bg-red-500/5 border-red-500/20" : "bg-muted/50")}>
            <CalendarDays className={cn("h-4 w-4 mx-auto mb-1", trialExpired ? "text-red-500" : "text-muted-foreground")} />
            {sub?.status === 'trial' && trialDaysLeft !== null ? (
              <>
                <p className={cn("text-lg font-bold", trialDaysLeft <= 0 ? "text-red-500" : trialDaysLeft <= 7 ? "text-amber-500" : "")}>
                  {trialDaysLeft <= 0 ? 'Expirado' : `${trialDaysLeft}d`}
                </p>
                <p className="text-[10px] text-muted-foreground">Trial restante</p>
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
          </div>
        </div>

        {/* Warning for expired */}
        {(trialExpired || sub?.status === 'expired' || sub?.status === 'suspended') && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400">
              {sub?.status === 'suspended' ? 'Assinatura suspensa. A empresa não pode criar novos usuários.' : 'Plano expirado. Atualize o status para restaurar o acesso.'}
            </p>
          </div>
        )}

        <Separator />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Plano</Label>
              <Select value={form.plan} onValueChange={v => set('plan', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Máx. Usuários</Label>
              <Input type="number" min={1} value={form.max_users} onChange={e => set('max_users', parseInt(e.target.value) || 5)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Preço/mês (R$)</Label>
              <Input type="number" min={0} step={0.01} value={form.monthly_price} onChange={e => set('monthly_price', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Módulos Habilitados ({form.enabled_modules.length}/{allModules.length})</Label>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto border rounded-lg p-3">
              {allModules.map(m => (
                <label key={m.key} className={cn(
                  "flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded transition-colors",
                  form.enabled_modules.includes(m.key) ? "bg-primary/5" : "hover:bg-muted/50"
                )}>
                  <Checkbox
                    checked={form.enabled_modules.includes(m.key)}
                    onCheckedChange={() => toggleModule(m.key)}
                    disabled={m.core}
                  />
                  <span className={m.core ? "text-muted-foreground" : ""}>{m.label}</span>
                  {m.core && <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 border-muted-foreground/20 text-muted-foreground">core</Badge>}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Observações internas</Label>
            <Textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Ex: Cliente desde jan/2025, contrato anual..." />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateSubscription } from '@/hooks/useMasterAdmin';
import { Loader2 } from 'lucide-react';

interface Props {
  tenant: any;
  open: boolean;
  onClose: () => void;
}

const allModules = [
  { key: 'os', label: 'Ordens de Serviço' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'assets', label: 'Ativos' },
  { key: 'stock', label: 'Estoque' },
  { key: 'portal', label: 'Portal Solicitante' },
  { key: 'notifications', label: 'Notificações' },
  { key: 'kpis', label: 'KPIs & OKRs' },
  { key: 'manutencao', label: 'Manutenção' },
  { key: 'reports', label: 'Relatórios' },
  { key: 'docs', label: 'Documentos' },
  { key: 'knowledge', label: 'Base de Conhecimento' },
  { key: 'checklist', label: 'Checklists' },
  { key: 'canvas', label: 'Canvas' },
  { key: 'notes', label: 'Anotações' },
  { key: 'reminders', label: 'Lembretes' },
  { key: 'vault', label: 'Cofre Digital' },
  { key: 'audit', label: 'Auditoria' },
  { key: 'disposal', label: 'Descartes' },
  { key: 'api', label: 'API' },
  { key: 'theme', label: 'Tema Personalizado' },
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

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Plano — {tenant.name}</DialogTitle>
        </DialogHeader>

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
            <Label className="text-xs">Módulos Habilitados</Label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {allModules.map(m => (
                <label key={m.key} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 p-1 rounded">
                  <Checkbox
                    checked={form.enabled_modules.includes(m.key)}
                    onCheckedChange={() => toggleModule(m.key)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Observações internas..." />
          </div>

          <div className="flex justify-between items-center pt-2">
            <p className="text-xs text-muted-foreground">
              Uso atual: {tenant.active_users} usuários ativos
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

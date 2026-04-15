import type { OkrKeyResult } from '@/hooks/useOkrs';
import type { Kpi } from '@/hooks/useKpis';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACTIVITY_STATUSES } from './constants';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingKr: Partial<OkrKeyResult>;
  setEditingKr: React.Dispatch<React.SetStateAction<Partial<OkrKeyResult>>>;
  editingKrKpiIds: string[];
  setEditingKrKpiIds: React.Dispatch<React.SetStateAction<string[]>>;
  kpis: Kpi[];
  onSave: () => void;
  onDelete?: () => void;
}

export function OkrKeyResultDialog({
  open, onOpenChange, editingKr, setEditingKr,
  editingKrKpiIds, setEditingKrKpiIds, kpis, onSave, onDelete,
}: Props) {
  const activeKpis = kpis.filter(k => k.is_active);
  const linkedKpis = editingKrKpiIds.map(id => kpis.find(k => k.id === id)).filter(Boolean) as Kpi[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{editingKr.id ? 'Editar Resultado-Chave' : 'Nova Atividade'}</DialogTitle>
          <DialogDescription className="text-xs">
            {editingKr.id ? 'Alterações são salvas automaticamente.' : 'Defina a atividade e vincule a um indicador.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3.5">
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold">Descrição da Atividade</Label>
            <Textarea value={editingKr.title || ''} onChange={e => setEditingKr(p => ({ ...p, title: e.target.value }))} rows={2} className="text-sm resize-none" />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><BarChart3 className="h-3 w-3 text-primary" />Vincular Indicador</Label>
            <div className="space-y-1 max-h-28 overflow-y-auto rounded-md border border-border/40 p-2">
              {activeKpis.map(k => (
                <label key={k.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent/20 rounded px-1.5 py-1 transition-colors">
                  <Checkbox
                    checked={editingKrKpiIds.includes(k.id)}
                    onCheckedChange={checked => {
                      if (checked) {
                        const newIds = [...editingKrKpiIds, k.id];
                        setEditingKrKpiIds(newIds);
                        setEditingKr(p => ({ ...p, kpi_id: newIds[0], target_value: k.target_value, unit: k.unit }));
                      } else {
                        const newIds = editingKrKpiIds.filter(id => id !== k.id);
                        setEditingKrKpiIds(newIds);
                        const firstKpi = newIds.length > 0 ? kpis.find(kk => kk.id === newIds[0]) : null;
                        setEditingKr(p => ({ ...p, kpi_id: newIds[0] || null, target_value: firstKpi?.target_value ?? p.target_value, unit: firstKpi?.unit ?? p.unit }));
                      }
                    }}
                  />
                  <span className="flex-1 truncate">{k.name}</span>
                  <span className="text-muted-foreground text-[10px] shrink-0">({k.unit}) Meta: {k.target_value}</span>
                </label>
              ))}
              {activeKpis.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-1">Nenhum indicador cadastrado.</p>}
            </div>
          </div>

          {linkedKpis.length > 0 ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-[11px] text-muted-foreground space-y-0.5">
              <p className="font-medium text-foreground text-xs mb-0.5">Dados herdados:</p>
              {linkedKpis.map(k => (
                <p key={k.id}>Meta: <span className="font-bold text-foreground">{k.target_value} {k.unit}</span> · {k.direction === 'higher_is_better' ? '↑ Maior melhor' : k.direction === 'lower_is_better' ? '↓ Menor melhor' : '⊙ Meta ideal'}</p>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              <div className="grid gap-1.5"><Label className="text-xs">Meta</Label><Input type="number" value={editingKr.target_value ?? 100} onChange={e => setEditingKr(p => ({ ...p, target_value: parseFloat(e.target.value) || 0 }))} className="h-8 text-xs" /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Unidade</Label><Input value={editingKr.unit || '%'} onChange={e => setEditingKr(p => ({ ...p, unit: e.target.value }))} className="h-8 text-xs" /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Valor Inicial</Label><Input type="number" value={editingKr.start_value ?? 0} onChange={e => setEditingKr(p => ({ ...p, start_value: parseFloat(e.target.value) || 0 }))} className="h-8 text-xs" /></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <div className="grid gap-1.5"><Label className="text-xs">Responsável</Label><Input value={editingKr.responsible_name || ''} onChange={e => setEditingKr(p => ({ ...p, responsible_name: e.target.value }))} className="h-8 text-xs" /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Equipe de apoio</Label><Input value={editingKr.support_team || ''} onChange={e => setEditingKr(p => ({ ...p, support_team: e.target.value }))} placeholder="Infra, Suporte" className="h-8 text-xs" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="grid gap-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={editingKr.activity_status || 'a_iniciar'} onValueChange={v => setEditingKr(p => ({ ...p, activity_status: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ACTIVITY_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}><div className="flex items-center gap-2"><v.icon className={cn('h-3 w-3', v.color)} />{v.label}</div></SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label className="text-xs">Área</Label><Input value={editingKr.area || ''} onChange={e => setEditingKr(p => ({ ...p, area: e.target.value }))} className="h-8 text-xs" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="grid gap-1.5"><Label className="text-xs">Início</Label><Input type="date" value={editingKr.start_date || ''} onChange={e => setEditingKr(p => ({ ...p, start_date: e.target.value }))} className="h-8 text-xs" /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Prazo</Label><Input type="date" value={editingKr.end_date || ''} onChange={e => setEditingKr(p => ({ ...p, end_date: e.target.value }))} className="h-8 text-xs" /></div>
          </div>
        </div>
        <DialogFooter>
          {editingKr.id && onDelete && (
            <Button variant="destructive" size="sm" className="mr-auto h-7 text-xs" onClick={onDelete}>
              <Trash2 className="h-3 w-3 mr-1" />Excluir
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-7" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" className="h-7" onClick={onSave}>{editingKr.id ? 'Salvar' : 'Criar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

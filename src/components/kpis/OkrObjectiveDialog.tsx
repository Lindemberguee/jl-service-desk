import type { OkrObjective } from '@/hooks/useOkrs';
import type { Kpi } from '@/hooks/useKpis';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, BarChart3 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingObj: Partial<OkrObjective>;
  setEditingObj: React.Dispatch<React.SetStateAction<Partial<OkrObjective>>>;
  kpis: Kpi[];
  objActivities: string[];
  setObjActivities: React.Dispatch<React.SetStateAction<string[]>>;
  objKpiIds: string[];
  setObjKpiIds: React.Dispatch<React.SetStateAction<string[]>>;
  objStartDate: string;
  setObjStartDate: React.Dispatch<React.SetStateAction<string>>;
  objEndDate: string;
  setObjEndDate: React.Dispatch<React.SetStateAction<string>>;
  onSave: () => void;
}

export function OkrObjectiveDialog({
  open, onOpenChange, editingObj, setEditingObj, kpis,
  objActivities, setObjActivities, objKpiIds, setObjKpiIds,
  objStartDate, setObjStartDate, objEndDate, setObjEndDate, onSave,
}: Props) {
  const activeKpis = kpis.filter(k => k.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingObj.id ? 'Editar Objetivo' : 'Novo Objetivo'}</DialogTitle>
          <DialogDescription className="text-xs">
            {editingObj.id ? 'Alterações são salvas automaticamente.' : 'Defina o objetivo, resultado-chave e atividades do plano.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold">Objetivo Macro</Label>
            <Textarea value={editingObj.macro_objective || ''} onChange={e => setEditingObj(p => ({ ...p, macro_objective: e.target.value }))} rows={2} placeholder="Ex: Aumentar o uso e pertencimento tecnológico..." className="text-sm resize-none" />
            <p className="text-[10px] text-muted-foreground">Agrupa vários resultados-chave sob um mesmo objetivo estratégico.</p>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold">Resultado-Chave</Label>
            <Textarea value={editingObj.title || ''} onChange={e => setEditingObj(p => ({ ...p, title: e.target.value }))} rows={2} placeholder="Ex: Gestão da infraestrutura de TI..." className="text-sm resize-none" />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold">Descrição (opcional)</Label>
            <Textarea value={editingObj.description || ''} onChange={e => setEditingObj(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Detalhes adicionais..." className="text-sm resize-none" />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><BarChart3 className="h-3 w-3 text-primary" />Indicadores</Label>
            <p className="text-[10px] text-muted-foreground -mt-0.5">Meta e unidade são herdadas automaticamente do indicador vinculado.</p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto rounded-md border border-border/40 p-2">
              {activeKpis.map(k => (
                <label key={k.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent/20 rounded px-1.5 py-1 transition-colors">
                  <Checkbox
                    checked={editingObj.id ? false : objKpiIds.includes(k.id)}
                    onCheckedChange={checked => {
                      if (editingObj.id) return;
                      setObjKpiIds(prev => checked ? [...prev, k.id] : prev.filter(id => id !== k.id));
                    }}
                    disabled={!!editingObj.id}
                  />
                  <span className="flex-1 truncate">{k.name}</span>
                  <span className="text-muted-foreground text-[10px] shrink-0">({k.unit}) Meta: {k.target_value}</span>
                </label>
              ))}
              {activeKpis.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-2">Nenhum indicador cadastrado.</p>}
            </div>
          </div>

          {!editingObj.id && (
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Atividades</Label>
              <div className="space-y-1.5">
                {objActivities.map((act, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <Input value={act} onChange={e => { const u = [...objActivities]; u[idx] = e.target.value; setObjActivities(u); }} placeholder={`Atividade ${idx + 1}`} className="h-8 text-xs" />
                    {objActivities.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setObjActivities(prev => prev.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-fit text-[10px] gap-1 h-6" onClick={() => setObjActivities(prev => [...prev, ''])}>
                  <Plus className="h-2.5 w-2.5" /> Mais atividade
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label className="text-xs">Área</Label><Input value={editingObj.area || ''} onChange={e => setEditingObj(p => ({ ...p, area: e.target.value }))} className="h-8 text-xs" /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Responsável</Label><Input value={editingObj.responsible_name || ''} onChange={e => setEditingObj(p => ({ ...p, responsible_name: e.target.value }))} className="h-8 text-xs" /></div>
          </div>

          {!editingObj.id && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label className="text-xs">Início</Label><Input type="date" value={objStartDate} onChange={e => setObjStartDate(e.target.value)} className="h-8 text-xs" /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Final</Label><Input type="date" value={objEndDate} onChange={e => setObjEndDate(e.target.value)} className="h-8 text-xs" /></div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" className="h-8" onClick={onSave}>{editingObj.id ? 'Salvar' : 'Criar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

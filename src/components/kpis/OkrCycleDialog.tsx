import type { OkrCycle } from '@/hooks/useOkrs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { CYCLE_TYPES } from './constants';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCycle: Partial<OkrCycle>;
  setEditingCycle: React.Dispatch<React.SetStateAction<Partial<OkrCycle>>>;
  onSave: () => void;
  onDelete?: () => void;
}

export function OkrCycleDialog({ open, onOpenChange, editingCycle, setEditingCycle, onSave, onDelete }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingCycle.id ? 'Editar Ciclo' : 'Novo Ciclo'}</DialogTitle>
          <DialogDescription className="text-xs">Defina o período e nome do ciclo de planejamento.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label className="text-xs">Nome</Label>
            <Input value={editingCycle.name || ''} onChange={e => setEditingCycle(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Plano de Ação 2026" className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="text-xs">Tipo</Label>
              <Select value={editingCycle.type || 'annual'} onValueChange={v => setEditingCycle(p => ({ ...p, type: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{CYCLE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Status</Label>
              <Select value={editingCycle.status || 'active'} onValueChange={v => setEditingCycle(p => ({ ...p, status: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="text-xs">Início</Label>
              <Input type="date" value={editingCycle.starts_at || ''} onChange={e => setEditingCycle(p => ({ ...p, starts_at: e.target.value }))} className="h-9" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Fim</Label>
              <Input type="date" value={editingCycle.ends_at || ''} onChange={e => setEditingCycle(p => ({ ...p, ends_at: e.target.value }))} className="h-9" />
            </div>
          </div>
        </div>
        <DialogFooter>
          {editingCycle.id && onDelete && (
            <Button variant="destructive" size="sm" className="mr-auto h-8 text-xs" onClick={onDelete}>
              <Trash2 className="h-3 w-3 mr-1" />Excluir
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" className="h-8" onClick={onSave}>{editingCycle.id ? 'Salvar' : 'Criar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

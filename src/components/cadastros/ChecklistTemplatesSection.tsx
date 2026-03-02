import { useState, useMemo, useCallback } from 'react';
import { logAudit } from '@/lib/audit';
import { friendlyErrorMessage } from '@/lib/errorMessages';
import { useTenantQuery, useTenantDelete } from '@/hooks/useTenantQuery';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Plus, Trash2, Loader2, Pencil, Search, X, CheckSquare, GripVertical, Tag,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
}

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export function ChecklistTemplatesSection({ readOnly }: { readOnly: boolean }) {
  const { currentTenantId } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const qc = useQueryClient();

  const { data: templates = [], isLoading } = useTenantQuery<any>('checklist_templates', 'checklist_templates');
  const { data: categories = [] } = useTenantQuery<any>('categories', 'categories');
  const deleteMutation = useTenantDelete('checklist_templates', ['checklist_templates']);

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c: any) => [c.id, c.name])),
    [categories]
  );
  const categoryOptions = useMemo(
    () => categories.map((c: any) => ({ value: c.id, label: c.name })),
    [categories]
  );

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItemLabel, setNewItemLabel] = useState('');

  const resetForm = useCallback(() => {
    setName('');
    setCategoryId('');
    setItems([]);
    setNewItemLabel('');
    setEditId(null);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter((t: any) =>
      t.name?.toLowerCase().includes(q) ||
      categoryMap[t.category_id]?.toLowerCase().includes(q)
    );
  }, [templates, search, categoryMap]);

  const addItem = () => {
    const label = newItemLabel.trim();
    if (!label) return;
    setItems(prev => [...prev, { id: generateId(), label }]);
    setNewItemLabel('');
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItemLabel = (id: string, label: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, label } : i));
  };

  const handleSave = async (isEdit: boolean) => {
    if (!name.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }
    if (items.length === 0) {
      toast({ title: 'Adicione pelo menos um item ao checklist', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category_id: categoryId || null,
        items: items.map(i => ({ id: i.id, label: i.label })),
        tenant_id: currentTenantId,
      };

      if (isEdit && editId) {
        const { error } = await (supabase.from as any)('checklist_templates')
          .update({ name: payload.name, category_id: payload.category_id, items: payload.items })
          .eq('id', editId);
        if (error) throw error;
        await logAudit({ entity: 'checklist_template', entityId: editId, action: 'checklist_template.updated', tenantId: currentTenantId, diff: { name: payload.name, items_count: items.length } });
        toast({ title: 'Modelo de checklist atualizado!' });
        setEditOpen(false);
      } else {
        const { data, error } = await (supabase.from as any)('checklist_templates')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        await logAudit({ entity: 'checklist_template', entityId: data?.id, action: 'checklist_template.created', tenantId: currentTenantId, diff: { name: payload.name, items_count: items.length } });
        toast({ title: 'Modelo de checklist criado!' });
        setDialogOpen(false);
      }
      qc.invalidateQueries({ queryKey: ['checklist_templates'] });
      resetForm();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: friendlyErrorMessage(err, 'Erro ao salvar checklist.'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (template: any) => {
    setEditId(template.id);
    setName(template.name || '');
    setCategoryId(template.category_id || '');
    const templateItems = Array.isArray(template.items) ? template.items : [];
    setItems(templateItems.map((i: any) => ({ id: i.id || generateId(), label: i.label || i })));
    setNewItemLabel('');
    setEditOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      await logAudit({ entity: 'checklist_template', entityId: deleteTarget.id, action: 'checklist_template.deleted', tenantId: currentTenantId, diff: { name: deleteTarget.name } });
      toast({ title: 'Modelo excluído!' });
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: friendlyErrorMessage(err, 'Erro ao excluir modelo.'), variant: 'destructive' });
    }
    setDeleteTarget(null);
  };

  const renderItemsEditor = () => (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Itens do Checklist</Label>
      {items.length > 0 && (
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
          {items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-2 group">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
              <Input
                value={item.label}
                onChange={e => updateItemLabel(item.id, e.target.value)}
                className="h-8 text-sm flex-1"
                placeholder="Descreva a etapa..."
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={newItemLabel}
          onChange={e => setNewItemLabel(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
          placeholder="Adicionar item... (Enter para adicionar)"
          className="h-8 text-sm flex-1"
        />
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs shrink-0" onClick={addItem} disabled={!newItemLabel.trim()}>
          <Plus className="h-3 w-3" /> Adicionar
        </Button>
      </div>
      {items.length > 0 && (
        <p className="text-[11px] text-muted-foreground">{items.length} item(ns) no checklist</p>
      )}
    </div>
  );

  const renderFormContent = () => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Nome do Modelo <span className="text-destructive">*</span></Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Checklist de Manutenção Preventiva" className="h-9 text-sm" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Categoria (opcional)</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Vincular a uma categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem categoria</SelectItem>
            {categoryOptions.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {renderItemsEditor()}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
            <CheckSquare className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-none">Modelos de Checklist</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{templates.length} modelo(s)</p>
          </div>
        </div>
        {!readOnly && (
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Novo Modelo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo Modelo de Checklist</DialogTitle>
                <DialogDescription>Crie um modelo com etapas que serão aplicadas automaticamente às OS da categoria vinculada.</DialogDescription>
              </DialogHeader>
              {renderFormContent()}
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
                <Button size="sm" onClick={() => handleSave(false)} disabled={saving}>
                  {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Criar Modelo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      {templates.length > 3 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar modelos..." className="h-8 text-xs pl-8 pr-8" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-md" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-lg py-12 text-center">
          <CheckSquare className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">
            {search ? 'Nenhum modelo encontrado.' : 'Nenhum modelo de checklist cadastrado.'}
          </p>
          {!readOnly && !search && (
            <Button size="sm" variant="outline" className="mt-3 h-7 text-xs gap-1" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3 w-3" /> Criar primeiro modelo
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((template: any) => {
            const templateItems = Array.isArray(template.items) ? template.items : [];
            return (
              <div key={template.id} className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-medium">{template.name}</p>
                      {template.category_id && categoryMap[template.category_id] && (
                        <Badge variant="outline" className="text-[10px] h-5 gap-1">
                          <Tag className="h-2.5 w-2.5" />
                          {categoryMap[template.category_id]}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {templateItems.length} item(ns)
                      </Badge>
                    </div>
                    {templateItems.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {templateItems.slice(0, 4).map((item: any, idx: number) => (
                          <div key={item.id || idx} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <div className="h-3 w-3 rounded border border-border flex items-center justify-center shrink-0">
                              <span className="text-[8px]">{idx + 1}</span>
                            </div>
                            <span className="truncate">{item.label || item}</span>
                          </div>
                        ))}
                        {templateItems.length > 4 && (
                          <p className="text-[10px] text-muted-foreground/60 ml-[18px]">
                            +{templateItems.length - 4} mais...
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(template)}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(template)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Modelo de Checklist</DialogTitle>
            <DialogDescription>Altere o nome, categoria ou itens do modelo.</DialogDescription>
          </DialogHeader>
          {renderFormContent()}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setEditOpen(false); resetForm(); }}>Cancelar</Button>
            <Button size="sm" onClick={() => handleSave(true)} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o modelo <strong>{deleteTarget?.name}</strong>? OS existentes não serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

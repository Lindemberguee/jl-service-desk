import { useState, useMemo, useCallback } from 'react';
import { logAudit } from '@/lib/audit';
import { friendlyErrorMessage } from '@/lib/errorMessages';
import { useTenantQuery, useTenantInsert, useTenantUpdate, useTenantDelete } from '@/hooks/useTenantQuery';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Plus, Trash2, Loader2, Search, Pencil, X, Users, Phone, Hash, Mail,
  PlusCircle, GripVertical,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type CustomField = { key: string; label: string; value: string };

type CollaboratorForm = {
  full_name: string;
  matricula: string;
  phone: string;
  email: string;
  is_active: boolean;
  custom_fields: CustomField[];
};

const emptyForm: CollaboratorForm = {
  full_name: '', matricula: '', phone: '', email: '', is_active: true, custom_fields: [],
};

export default function CollaboratorsPage() {
  const { currentTenantId } = useAuth();
  const { data: collaborators = [], isLoading } = useTenantQuery<any>('collaborators', 'collaborators');
  const insertMutation = useTenantInsert('collaborators', ['collaborators']);
  const updateMutation = useTenantUpdate('collaborators', ['collaborators']);
  const deleteMutation = useTenantDelete('collaborators', ['collaborators']);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm] = useState<CollaboratorForm>({ ...emptyForm });
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const filtered = useMemo(() => {
    return collaborators.filter((c: any) => {
      if (!debouncedSearch) return true;
      const s = debouncedSearch.toLowerCase();
      return [c.full_name, c.matricula, c.phone, c.email]
        .some(v => v?.toLowerCase().includes(s));
    });
  }, [collaborators, debouncedSearch]);

  const resetForm = useCallback(() => setForm({ ...emptyForm }), []);

  const setField = <K extends keyof CollaboratorForm>(key: K, value: CollaboratorForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const addCustomField = () => {
    setForm(prev => ({
      ...prev,
      custom_fields: [...prev.custom_fields, { key: `field_${Date.now()}`, label: '', value: '' }],
    }));
  };

  const updateCustomField = (index: number, field: 'label' | 'value', val: string) => {
    setForm(prev => {
      const fields = [...prev.custom_fields];
      fields[index] = { ...fields[index], [field]: val };
      return { ...prev, custom_fields: fields };
    });
  };

  const removeCustomField = (index: number) => {
    setForm(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.filter((_, i) => i !== index),
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await insertMutation.mutateAsync({
        full_name: form.full_name,
        matricula: form.matricula || null,
        phone: form.phone || null,
        email: form.email || null,
        is_active: form.is_active,
        custom_fields: form.custom_fields.filter(f => f.label.trim()),
      });
      await logAudit({
        entity: 'collaborator', entityId: (result as any)?.id,
        action: 'collaborator.created', tenantId: currentTenantId,
        diff: { full_name: form.full_name, matricula: form.matricula },
      });
      toast({ title: 'Colaborador cadastrado com sucesso!' });
      setCreateOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Erro ao criar colaborador', description: err.message, variant: 'destructive' });
    }
  };

  const openEdit = (item: any) => {
    const customFields = Array.isArray(item.custom_fields) ? item.custom_fields : [];
    setForm({
      full_name: item.full_name || '',
      matricula: item.matricula || '',
      phone: item.phone || '',
      email: item.email || '',
      is_active: item.is_active ?? true,
      custom_fields: customFields,
    });
    setEditId(item.id);
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    try {
      await updateMutation.mutateAsync({
        id: editId,
        full_name: form.full_name,
        matricula: form.matricula || null,
        phone: form.phone || null,
        email: form.email || null,
        is_active: form.is_active,
        custom_fields: form.custom_fields.filter(f => f.label.trim()),
      });
      await logAudit({
        entity: 'collaborator', entityId: editId,
        action: 'collaborator.updated', tenantId: currentTenantId,
        diff: { full_name: form.full_name },
      });
      toast({ title: 'Colaborador atualizado!' });
      setEditOpen(false);
      resetForm();
      setEditId(null);
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      await logAudit({
        entity: 'collaborator', entityId: deleteTarget.id,
        action: 'collaborator.deleted', tenantId: currentTenantId,
        diff: { full_name: deleteTarget.full_name },
      });
      toast({ title: 'Colaborador excluído!' });
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: friendlyErrorMessage(err, 'Erro ao excluir colaborador.'), variant: 'destructive' });
    }
    setDeleteTarget(null);
  };

  const renderFormFields = () => (
    <div className="space-y-4">
      {/* Basic fields */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Nome Completo <span className="text-destructive">*</span></Label>
        <Input value={form.full_name} onChange={e => setField('full_name', e.target.value)} required placeholder="Ex: João da Silva" className="h-9 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Nº Matrícula</Label>
          <Input value={form.matricula} onChange={e => setField('matricula', e.target.value)} placeholder="Ex: MAT-001" className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Telefone</Label>
          <Input value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="(00) 00000-0000" className="h-9 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">E-mail</Label>
          <Input value={form.email} onChange={e => setField('email', e.target.value)} placeholder="email@exemplo.com" className="h-9 text-sm" type="email" />
        </div>
        <div className="flex items-end gap-2 pb-0.5">
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={v => setField('is_active', v)} />
            <Label className="text-xs font-medium">{form.is_active ? 'Ativo' : 'Inativo'}</Label>
          </div>
        </div>
      </div>

      {/* Dynamic custom fields */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campos Personalizados</Label>
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary" onClick={addCustomField}>
            <PlusCircle className="h-3.5 w-3.5" /> Adicionar Campo
          </Button>
        </div>
        <AnimatePresence mode="popLayout">
          {form.custom_fields.map((cf, idx) => (
            <motion.div
              key={cf.key}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2"
            >
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  value={cf.label}
                  onChange={e => updateCustomField(idx, 'label', e.target.value)}
                  placeholder="Nome do campo"
                  className="h-8 text-xs"
                />
                <Input
                  value={cf.value}
                  onChange={e => updateCustomField(idx, 'value', e.target.value)}
                  placeholder="Valor"
                  className="h-8 text-xs"
                />
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeCustomField(idx)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
        {form.custom_fields.length === 0 && (
          <p className="text-[11px] text-muted-foreground/60 text-center py-2">Nenhum campo personalizado adicionado.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Colaboradores</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filtered.length} de {collaborators.length} registro(s)
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Novo Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Colaborador</DialogTitle>
              <DialogDescription>Cadastre uma pessoa para vincular a ativos e ordens de serviço.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              {renderFormFields()}
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={insertMutation.isPending}>
                  {insertMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      {collaborators.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, matrícula, telefone..."
            className="h-9 text-sm pl-9 pr-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-md" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl py-16 text-center shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)]">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? 'Nenhum resultado encontrado.' : 'Nenhum colaborador cadastrado ainda.'}
          </p>
          {!search && (
            <Button size="sm" variant="outline" className="mt-4 h-8 text-xs gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Cadastrar primeiro colaborador
            </Button>
          )}
        </div>
      ) : isMobile ? (
        <div className="space-y-2">
          {filtered.map((item: any) => {
            const customFields: CustomField[] = Array.isArray(item.custom_fields) ? item.custom_fields : [];
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl p-4 shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{item.full_name}</p>
                      <Badge variant={item.is_active ? 'default' : 'secondary'} className="text-[9px] h-4 px-1.5">
                        {item.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    {item.matricula && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" />{item.matricula}</p>}
                    {item.phone && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{item.phone}</p>}
                    {item.email && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{item.email}</p>}
                    {customFields.filter((f: CustomField) => f.label).map((f: CustomField, i: number) => (
                      <p key={i} className="text-[11px] text-muted-foreground"><span className="font-medium">{f.label}:</span> {f.value || '-'}</p>
                    ))}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(item)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card rounded-xl overflow-hidden shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground h-9">Nome</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground h-9">Matrícula</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground h-9">Telefone</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground h-9">E-mail</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground h-9">Status</TableHead>
                <TableHead className="w-20 text-right text-[11px] font-semibold uppercase text-muted-foreground h-9">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item: any) => (
                <TableRow key={item.id} className="group">
                  <TableCell className="text-sm font-medium whitespace-nowrap">{item.full_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{item.matricula || '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{item.phone || '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{item.email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? 'default' : 'secondary'} className="text-[10px] h-5 px-2">
                      {item.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(item)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { resetForm(); setEditId(null); } }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Colaborador</DialogTitle>
            <DialogDescription>Altere os dados e salve.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            {renderFormFields()}
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => { setEditOpen(false); resetForm(); setEditId(null); }}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir colaborador?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.full_name}</strong>? Esta ação não pode ser desfeita.
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

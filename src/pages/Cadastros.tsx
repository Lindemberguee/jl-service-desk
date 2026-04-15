import { useState, useMemo, useCallback } from 'react';
import { logAudit } from '@/lib/audit';
import { friendlyErrorMessage } from '@/lib/errorMessages';
import { useTenantQuery, useTenantInsert, useTenantUpdate, useTenantDelete } from '@/hooks/useTenantQuery';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Plus, Trash2, Building2, Tag, Users as UsersIcon, MapPin, Loader2,
  Lock, Pencil, Search, X, Mail, Phone, Shield, Eye, EyeOff, CheckSquare,
} from 'lucide-react';
import { ChecklistTemplatesSection } from '@/components/cadastros/ChecklistTemplatesSection';
import { CadastroImportExport } from '@/components/cadastros/CadastroImportExport';

type FieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: 'text' | 'select';
  options?: { value: string; label: string }[];
  hideInTable?: boolean;
};

function CrudSection({
  title, icon: Icon, queryKey, table, fields, readOnly, renderCell, searchKeys, tenantId,
}: {
  title: string;
  icon: any;
  queryKey: string;
  table: string;
  fields: FieldDef[];
  readOnly?: boolean;
  renderCell?: (field: FieldDef, item: any) => React.ReactNode;
  searchKeys?: string[];
  tenantId?: string | null;
}) {
  const { data = [], isLoading } = useTenantQuery<any>(queryKey, table);
  const insertMutation = useTenantInsert(table, [queryKey]);
  const updateMutation = useTenantUpdate(table, [queryKey]);
  const deleteMutation = useTenantDelete(table, [queryKey]);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [detailTarget, setDetailTarget] = useState<any>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const tableFields = useMemo(() => fields.filter(f => !f.hideInTable), [fields]);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    const keys = searchKeys || fields.filter(f => f.type !== 'select').map(f => f.key);
    return data.filter((item: any) =>
      keys.some(k => (item[k] || '').toString().toLowerCase().includes(q))
    );
  }, [data, search, searchKeys, fields]);

  const resetForm = useCallback(() => setForm({}), []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await insertMutation.mutateAsync(form);
      await logAudit({ entity: table, entityId: (result as any)?.id, action: `${table}.created`, tenantId: tenantId, diff: form });
      toast({ title: `${title} criado(a) com sucesso!` });
      setCreateOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Erro ao criar', description: err.message, variant: 'destructive' });
    }
  };

  const openEdit = (item: any) => {
    const formData: Record<string, string> = {};
    fields.forEach(f => { formData[f.key] = item[f.key] || ''; });
    setForm(formData);
    setEditId(item.id);
    setDetailTarget(null);
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    try {
      await updateMutation.mutateAsync({ id: editId, ...form });
      await logAudit({ entity: table, entityId: editId, action: `${table}.updated`, tenantId: tenantId, diff: form });
      toast({ title: `${title} atualizado(a)!` });
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
      await logAudit({ entity: table, entityId: deleteTarget.id, action: `${table}.deleted`, tenantId: tenantId, diff: { name: deleteTarget[fields[0]?.key] } });
      toast({ title: `${title} excluído(a)!` });
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: friendlyErrorMessage(err, 'Erro ao excluir registro.'), variant: 'destructive' });
    }
    setDeleteTarget(null);
  };

  const getCellValue = (field: FieldDef, item: any) => {
    if (renderCell) {
      const custom = renderCell(field, item);
      if (custom !== undefined) return custom;
    }
    return item[field.key] || '-';
  };

  const renderFormFields = () => (
    <>
      {fields.map(f => (
        <div key={f.key} className="space-y-1.5">
          <Label className="text-xs font-medium">
            {f.label} {f.required && <span className="text-destructive">*</span>}
          </Label>
          {f.type === 'select' && f.options ? (
            <Select value={form[f.key] || ''} onValueChange={v => setForm(p => ({ ...p, [f.key]: v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {f.options.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={form[f.key] || ''}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              required={f.required}
              placeholder={f.placeholder}
              className="h-9 text-sm"
            />
          )}
        </div>
      ))}
    </>
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-none">{title}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{data.length} registro(s)</p>
          </div>
        </div>
        {!readOnly && (
          <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Novo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo {title}</DialogTitle>
                <DialogDescription>Preencha os dados para criar um novo registro.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                {renderFormFields()}
                <DialogFooter>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setCreateOpen(false); resetForm(); }}>
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" disabled={insertMutation.isPending}>
                    {insertMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Salvar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      {data.length > 3 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Buscar ${title.toLowerCase()}...`}
            className="h-8 text-xs pl-8 pr-8"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-md" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-lg py-12 text-center">
          <Icon className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">
            {search ? 'Nenhum resultado encontrado.' : 'Nenhum registro cadastrado.'}
          </p>
          {!readOnly && !search && (
            <Button size="sm" variant="outline" className="mt-3 h-7 text-xs gap-1" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3 w-3" /> Criar primeiro {title.toLowerCase()}
            </Button>
          )}
        </div>
      ) : isMobile ? (
        <div className="space-y-2">
          {filtered.map((item: any) => (
            <div
              key={item.id}
              className="bg-card border border-border rounded-lg p-3 space-y-1.5 cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => setDetailTarget(item)}
            >
              <div className="min-w-0 flex-1">
                {tableFields.map((f, i) => (
                  <p key={f.key} className={i === 0 ? 'text-sm font-medium truncate' : 'text-[11px] text-muted-foreground'}>
                    {i > 0 && <span className="font-medium">{f.label}: </span>}
                    {getCellValue(f, item)}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {tableFields.map(f => (
                  <TableHead key={f.key} className="text-[11px] font-semibold uppercase text-muted-foreground h-9">
                    {f.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item: any) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => setDetailTarget(item)}
                >
                  {tableFields.map((f, i) => (
                    <TableCell key={f.key} className={i === 0 ? 'text-sm font-medium' : 'text-xs text-muted-foreground'}>
                      {getCellValue(f, item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailTarget} onOpenChange={(v) => { if (!v) setDetailTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Detalhes — {title}</DialogTitle>
            <DialogDescription className="text-xs">Informações completas do registro.</DialogDescription>
          </DialogHeader>
          {detailTarget && (
            <div className="space-y-1">
              {fields.map(f => (
                <div key={f.key} className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-[11px] font-medium text-muted-foreground w-28 shrink-0">{f.label}</span>
                  <span className="text-sm">{getCellValue(f, detailTarget) || '—'}</span>
                </div>
              ))}
            </div>
          )}
          {!readOnly && detailTarget && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                size="sm"
                variant="destructive"
                className="gap-1.5"
                onClick={() => { setDetailTarget(null); setDeleteTarget(detailTarget); }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => openEdit(detailTarget)}
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { resetForm(); setEditId(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar {title}</DialogTitle>
            <DialogDescription>Altere os campos desejados e salve.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            {renderFormFields()}
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => { setEditOpen(false); resetForm(); setEditId(null); }}>
                Cancelar
              </Button>
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
            <AlertDialogTitle>Excluir {title}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.[fields[0]?.key]}</strong>? Esta ação não pode ser desfeita.
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

// ─── Solicitantes Section ─── shows user accounts with solicitante role + customer data
function SolicitantesSection({ readOnly }: { readOnly: boolean }) {
  const { currentTenantId } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', document: '', position: '', sector: '', notes: '',
  });

  const { data: solicitantes = [], isLoading } = useQuery({
    queryKey: ['solicitantes', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const { data, error } = await supabase
        .from('user_memberships')
        .select('id, user_id, role, is_active, profiles!user_memberships_user_id_profiles_fkey(name, email)')
        .eq('tenant_id', currentTenantId)
        .eq('role', 'solicitante');
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!currentTenantId,
  });

  const userIds = useMemo(() => solicitantes.map((s: any) => s.user_id).filter(Boolean), [solicitantes]);
  const { data: customers = [] } = useQuery({
    queryKey: ['solicitante-customers', currentTenantId, userIds],
    queryFn: async () => {
      if (!currentTenantId || userIds.length === 0) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .in('user_id', userIds);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!currentTenantId && userIds.length > 0,
  });

  const customerMap = useMemo(() => {
    const map: Record<string, any> = {};
    customers.forEach((c: any) => { if (c.user_id) map[c.user_id] = c; });
    return map;
  }, [customers]);

  const enriched = useMemo(
    () =>
      solicitantes.map((m: any) => ({ ...m, customer: customerMap[m.user_id] || null })),
    [solicitantes, customerMap]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return enriched;
    const s = search.toLowerCase();
    return enriched.filter((m: any) =>
      m.profiles?.name?.toLowerCase().includes(s) ||
      m.profiles?.email?.toLowerCase().includes(s) ||
      m.customer?.phone?.toLowerCase().includes(s) ||
      m.customer?.sector?.toLowerCase().includes(s) ||
      m.customer?.position?.toLowerCase().includes(s)
    );
  }, [enriched, search]);

  const resetForm = () => setForm({ name: '', email: '', password: '', phone: '', document: '', position: '', sector: '', notes: '' });

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast({ title: 'Nome, e-mail e senha são obrigatórios', variant: 'destructive' });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: 'A senha precisa ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      // Validar limite de usuários do plano antes de criar
      const { data: canAdd } = await supabase.rpc('can_tenant_add_user', { _tenant_id: currentTenantId });
      if (!canAdd) {
        toast({ title: 'Limite de usuários atingido', description: 'O plano atual não permite mais usuários. Contate o administrador para fazer upgrade.', variant: 'destructive' });
        setCreating(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'create_user',
          email: form.email.trim(),
          password: form.password,
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          document: form.document.trim() || null,
          position: form.position.trim() || null,
          sector: form.sector.trim() || null,
          notes: form.notes.trim() || null,
          tenant_id: currentTenantId,
          role: 'solicitante',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await logAudit({ entity: 'customer', entityId: data?.user_id, action: 'customer.created', tenantId: currentTenantId, diff: { name: form.name.trim(), email: form.email.trim(), role: 'solicitante' } });
      toast({ title: 'Solicitante cadastrado com sucesso!' });
      setDialogOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ['solicitantes', currentTenantId] });
      qc.invalidateQueries({ queryKey: ['solicitante-customers', currentTenantId] });
    } catch (err: any) {
      toast({ title: 'Erro ao cadastrar', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (item: any) => {
    setSelectedItem(item);
    setForm({
      name: item.profiles?.name || '',
      email: item.profiles?.email || '',
      password: '',
      phone: item.customer?.phone || '',
      document: item.customer?.document || '',
      position: item.customer?.position || '',
      sector: item.customer?.sector || '',
      notes: item.customer?.notes || '',
    });
    setDetailOpen(false);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({ name: form.name.trim() }).eq('id', selectedItem.user_id);
      if (selectedItem.customer?.id) {
        await supabase.from('customers').update({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          document: form.document.trim() || null,
          position: form.position.trim() || null,
          sector: form.sector.trim() || null,
          notes: form.notes.trim() || null,
        }).eq('id', selectedItem.customer.id);
      } else if (currentTenantId) {
        await supabase.from('customers').insert({
          name: form.name.trim(),
          email: selectedItem.profiles?.email || '',
          phone: form.phone.trim() || null,
          document: form.document.trim() || null,
          position: form.position.trim() || null,
          sector: form.sector.trim() || null,
          notes: form.notes.trim() || null,
          tenant_id: currentTenantId,
          user_id: selectedItem.user_id,
          type: 'internal' as const,
        });
      }
      await logAudit({ entity: 'customer', entityId: selectedItem.user_id, action: 'customer.updated', tenantId: currentTenantId, diff: { name: form.name.trim(), phone: form.phone, position: form.position, sector: form.sector } });
      toast({ title: 'Solicitante atualizado!' });
      setEditOpen(false);
      resetForm();
      setSelectedItem(null);
      qc.invalidateQueries({ queryKey: ['solicitantes', currentTenantId] });
      qc.invalidateQueries({ queryKey: ['solicitante-customers', currentTenantId] });
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!deactivateTarget) return;
    setToggling(true);
    try {
      const newActive = !deactivateTarget.is_active;
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'toggle_user_active',
          user_id: deactivateTarget.user_id,
          is_active: newActive,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await logAudit({ entity: 'customer', entityId: deactivateTarget.user_id, action: newActive ? 'customer.reactivated' : 'customer.deactivated', tenantId: currentTenantId, diff: { name: deactivateTarget.profiles?.name, is_active: newActive } });
      toast({ title: newActive ? 'Solicitante reativado!' : 'Solicitante desativado!' });
      qc.invalidateQueries({ queryKey: ['solicitantes', currentTenantId] });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setToggling(false);
      setDeactivateTarget(null);
    }
  };

  const openDetail = (item: any) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] font-medium text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-sm">{value || '—'}</span>
    </div>
  );

  const formFields = (isEdit: boolean) => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Nome completo *</Label>
          <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: João da Silva" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">E-mail {isEdit ? '' : '*'}</Label>
          <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="joao@empresa.com" type="email" className="h-9" disabled={isEdit} />
        </div>
      </div>
      {!isEdit && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Senha inicial *</Label>
          <div className="relative">
            <Input value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" type={showPassword ? 'text' : 'password'} className="h-9 pr-9" />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Telefone / Ramal</Label>
          <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">CPF / Matrícula</Label>
          <Input value={form.document} onChange={e => setForm(p => ({ ...p, document: e.target.value }))} placeholder="Documento de identificação" className="h-9" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Cargo</Label>
          <Input value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))} placeholder="Ex: Analista, Professor" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Setor / Departamento</Label>
          <Input value={form.sector} onChange={e => setForm(p => ({ ...p, sector: e.target.value }))} placeholder="Ex: Financeiro, RH" className="h-9" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Observações</Label>
        <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Anotações internas sobre este solicitante" className="h-9" />
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
            <UsersIcon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-none">Solicitantes</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{solicitantes.length} registro(s)</p>
          </div>
        </div>
        {!readOnly && (
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Cadastrar Solicitante
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-base">Cadastrar Solicitante</DialogTitle>
                <DialogDescription className="text-xs">
                  Crie uma conta de acesso ao portal. O solicitante poderá abrir e acompanhar OS.
                </DialogDescription>
              </DialogHeader>
              {formFields(false)}
              <div className="bg-muted/50 border border-border rounded-md p-3 text-[11px] text-muted-foreground">
                <Shield className="h-3.5 w-3.5 inline mr-1.5" />
                O solicitante será criado com acesso ao <strong>Portal do Solicitante</strong>.
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
                <Button size="sm" onClick={handleCreate} disabled={creating}>
                  {creating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Cadastrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {solicitantes.length > 3 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar por nome, e-mail, setor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
          {search && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-md" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-lg py-12 text-center">
          <UsersIcon className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">
            {search ? 'Nenhum resultado encontrado.' : 'Nenhum solicitante cadastrado.'}
          </p>
          {!readOnly && !search && (
            <Button size="sm" variant="outline" className="mt-3 h-7 text-xs gap-1" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3 w-3" /> Criar primeiro solicitante
            </Button>
          )}
        </div>
      ) : isMobile ? (
        <div className="space-y-2">
          {filtered.map((m: any) => (
            <Card key={m.id} className="border-border shadow-none cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => openDetail(m)}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{m.profiles?.name || '—'}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{m.profiles?.email || '—'}</span>
                    </div>
                    {m.customer?.sector && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{m.customer.position ? `${m.customer.position} · ` : ''}{m.customer.sector}</p>
                    )}
                  </div>
                  <Badge variant={m.is_active ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                    {m.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground h-9">Nome</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground h-9">E-mail</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground h-9">Telefone</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground h-9">Cargo / Setor</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground h-9">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m: any) => (
                <TableRow key={m.id} className="cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => openDetail(m)}>
                  <TableCell className="text-sm font-medium">{m.profiles?.name || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.profiles?.email || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.customer?.phone || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.customer?.position || m.customer?.sector
                      ? [m.customer?.position, m.customer?.sector].filter(Boolean).join(' · ')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.is_active ? 'default' : 'secondary'} className="text-[10px]">
                      {m.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={(v) => { setDetailOpen(v); if (!v) setSelectedItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Detalhes do Solicitante</DialogTitle>
            <DialogDescription className="text-xs">Informações completas do cadastro.</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-1">
              <DetailRow label="Nome" value={selectedItem.profiles?.name} />
              <DetailRow label="E-mail" value={selectedItem.profiles?.email} />
              <DetailRow label="Telefone" value={selectedItem.customer?.phone} />
              <DetailRow label="CPF / Matrícula" value={selectedItem.customer?.document} />
              <DetailRow label="Cargo" value={selectedItem.customer?.position} />
              <DetailRow label="Setor" value={selectedItem.customer?.sector} />
              <DetailRow label="Observações" value={selectedItem.customer?.notes} />
              <div className="flex items-center gap-2 pt-2">
                <Badge variant={selectedItem.is_active ? 'default' : 'secondary'}>
                  {selectedItem.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            {!readOnly && selectedItem && (
              <>
                <Button
                  size="sm"
                  variant={selectedItem.is_active ? 'destructive' : 'default'}
                  className="gap-1.5"
                  onClick={() => { setDetailOpen(false); setDeactivateTarget(selectedItem); }}
                >
                  {selectedItem.is_active ? <><EyeOff className="h-3.5 w-3.5" /> Desativar</> : <><Eye className="h-3.5 w-3.5" /> Reativar</>}
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEdit(selectedItem)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { resetForm(); setSelectedItem(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Editar Solicitante</DialogTitle>
            <DialogDescription className="text-xs">Altere os dados do solicitante e salve.</DialogDescription>
          </DialogHeader>
          {formFields(true)}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setEditOpen(false); resetForm(); setSelectedItem(null); }}>Cancelar</Button>
            <Button size="sm" onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Reactivate Confirmation */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={(v) => { if (!v) setDeactivateTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deactivateTarget?.is_active ? 'Desativar solicitante?' : 'Reativar solicitante?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateTarget?.is_active
                ? `O solicitante \"${deactivateTarget?.profiles?.name}\" perderá acesso ao portal. Você poderá reativá-lo depois.`
                : `O solicitante \"${deactivateTarget?.profiles?.name}\" terá o acesso ao portal restaurado.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              className={deactivateTarget?.is_active ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {toggling && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {deactivateTarget?.is_active ? 'Desativar' : 'Reativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Cadastros() {
  const { currentRole, currentTenantId } = useAuth();
  const readOnly = !currentRole || !hasPermission(currentRole, 'cadastros:manage');
  const [activeTab, setActiveTab] = useState('units');

  const { data: units = [] } = useTenantQuery<any>('units', 'units');
  const { data: locations = [] } = useTenantQuery<any>('locations', 'locations');
  const { data: categories = [] } = useTenantQuery<any>('categories', 'categories');
  const { data: solicitantes = [] } = useQuery({
    queryKey: ['solicitantes-count', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const { data, error } = await supabase
        .from('user_memberships')
        .select('id')
        .eq('tenant_id', currentTenantId)
        .eq('role', 'solicitante');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentTenantId,
  });

  const unitOptions = useMemo(
    () => units.map((u: any) => ({ value: u.id, label: u.name })),
    [units]
  );
  const unitMap = useMemo(
    () => Object.fromEntries(units.map((u: any) => [u.id, u.name])),
    [units]
  );

  const locationRenderCell = (field: FieldDef, item: any) => {
    if (field.key === 'unit_id') {
      return (
        <Badge variant="outline" className="text-[11px] font-normal">
          <Building2 className="h-3 w-3 mr-1" />
          {unitMap[item.unit_id] || '-'}
        </Badge>
      );
    }
    return undefined;
  };

  const stats = [
    { label: 'Unidades', count: units.length, icon: Building2, tab: 'units' },
    { label: 'Locais', count: locations.length, icon: MapPin, tab: 'locations' },
    { label: 'Categorias', count: categories.length, icon: Tag, tab: 'categories' },
    { label: 'Solicitantes', count: solicitantes.length, icon: UsersIcon, tab: 'customers' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Cadastros</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {readOnly
            ? 'Visualize unidades, locais, categorias e solicitantes do departamento.'
            : 'Gerencie unidades, locais (salas/espaços), categorias e solicitantes.'}
        </p>
      </div>

      {readOnly && (
        <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-md p-3 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          Modo somente leitura. Para alterações, entre em contato com o administrador.
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <Card
            key={s.tab}
            className={`rounded-xl border-border/50 cursor-pointer transition-all hover:shadow-md ${activeTab === s.tab ? 'ring-2 ring-primary/30 border-primary/40' : ''}`}
            onClick={() => setActiveTab(s.tab)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 border border-border/50 h-10 p-1 rounded-lg">
          <TabsTrigger value="units" className="text-xs h-8 gap-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Building2 className="h-3.5 w-3.5" /> Unidades
          </TabsTrigger>
          <TabsTrigger value="locations" className="text-xs h-8 gap-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <MapPin className="h-3.5 w-3.5" /> Locais
          </TabsTrigger>
          <TabsTrigger value="categories" className="text-xs h-8 gap-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Tag className="h-3.5 w-3.5" /> Categorias
          </TabsTrigger>
          <TabsTrigger value="customers" className="text-xs h-8 gap-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <UsersIcon className="h-3.5 w-3.5" /> Solicitantes
          </TabsTrigger>
          <TabsTrigger value="checklists" className="text-xs h-8 gap-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <CheckSquare className="h-3.5 w-3.5" /> Checklists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="mt-4">
          <CrudSection
            title="Unidade"
            icon={Building2}
            queryKey="units"
            table="units"
            readOnly={readOnly}
            tenantId={currentTenantId}
            searchKeys={['name', 'address', 'city']}
            fields={[
              { key: 'name', label: 'Nome', placeholder: 'Ex: Bloco A, Sede, Filial Centro', required: true },
              { key: 'address', label: 'Endereço', placeholder: 'Rua, número, bairro' },
              { key: 'city', label: 'Cidade', placeholder: 'Ex: São Paulo' },
              { key: 'state', label: 'Estado', placeholder: 'Ex: SP' },
            ]}
          />
        </TabsContent>

        <TabsContent value="locations" className="mt-4">
          <CrudSection
            title="Local (Sala / Espaço)"
            icon={MapPin}
            queryKey="locations"
            table="locations"
            readOnly={readOnly}
            tenantId={currentTenantId}
            renderCell={locationRenderCell}
            searchKeys={['name', 'description']}
            fields={[
              { key: 'name', label: 'Nome', placeholder: 'Ex: Sala 101, Pátio, Recepção', required: true },
              { key: 'description', label: 'Descrição', placeholder: 'Ex: 2º andar, ala norte' },
              { key: 'unit_id', label: 'Unidade vinculada', required: true, type: 'select', options: unitOptions },
            ]}
          />
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <CrudSection
            title="Categoria"
            icon={Tag}
            queryKey="categories"
            table="categories"
            readOnly={readOnly}
            tenantId={currentTenantId}
            searchKeys={['name']}
            fields={[
              { key: 'name', label: 'Nome', placeholder: 'Ex: Elétrica, Hidráulica, TI', required: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="customers" className="mt-4">
          <SolicitantesSection readOnly={readOnly} />
        </TabsContent>

        <TabsContent value="checklists" className="mt-4">
          <ChecklistTemplatesSection readOnly={readOnly} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

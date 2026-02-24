import { useState, useMemo, useCallback } from 'react';
import { useTenantQuery, useTenantInsert, useTenantUpdate, useTenantDelete } from '@/hooks/useTenantQuery';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';
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
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Plus, Trash2, Building2, Tag, Users as UsersIcon, MapPin, Loader2,
  Lock, Pencil, Search, X,
} from 'lucide-react';

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
  title, icon: Icon, queryKey, table, fields, readOnly, renderCell, searchKeys,
}: {
  title: string;
  icon: any;
  queryKey: string;
  table: string;
  fields: FieldDef[];
  readOnly?: boolean;
  renderCell?: (field: FieldDef, item: any) => React.ReactNode;
  searchKeys?: string[];
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
      await insertMutation.mutateAsync(form);
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
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    try {
      await updateMutation.mutateAsync({ id: editId, ...form });
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
      toast({ title: `${title} excluído(a)!` });
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
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
            <div key={item.id} className="bg-card border border-border rounded-lg p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {tableFields.map((f, i) => (
                    <p key={f.key} className={i === 0 ? 'text-sm font-medium truncate' : 'text-[11px] text-muted-foreground'}>
                      {i > 0 && <span className="font-medium">{f.label}: </span>}
                      {getCellValue(f, item)}
                    </p>
                  ))}
                </div>
                {!readOnly && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(item)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
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
                {!readOnly && <TableHead className="w-20 text-right text-[11px] font-semibold uppercase text-muted-foreground h-9">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item: any) => (
                <TableRow key={item.id} className="group">
                  {tableFields.map((f, i) => (
                    <TableCell key={f.key} className={i === 0 ? 'text-sm font-medium' : 'text-xs text-muted-foreground'}>
                      {getCellValue(f, item)}
                    </TableCell>
                  ))}
                  {!readOnly && (
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
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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

export default function Cadastros() {
  const { currentRole } = useAuth();
  const readOnly = !currentRole || !hasPermission(currentRole, 'cadastros:manage');

  const { data: units = [] } = useTenantQuery<any>('units', 'units');
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

      <Tabs defaultValue="units">
        <TabsList className="bg-card border border-border h-9">
          <TabsTrigger value="units" className="text-xs h-7 gap-1.5">
            <Building2 className="h-3 w-3" /> Unidades
          </TabsTrigger>
          <TabsTrigger value="locations" className="text-xs h-7 gap-1.5">
            <MapPin className="h-3 w-3" /> Locais
          </TabsTrigger>
          <TabsTrigger value="categories" className="text-xs h-7 gap-1.5">
            <Tag className="h-3 w-3" /> Categorias
          </TabsTrigger>
          <TabsTrigger value="customers" className="text-xs h-7 gap-1.5">
            <UsersIcon className="h-3 w-3" /> Solicitantes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="mt-4">
          <CrudSection
            title="Unidade"
            icon={Building2}
            queryKey="units"
            table="units"
            readOnly={readOnly}
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
            searchKeys={['name']}
            fields={[
              { key: 'name', label: 'Nome', placeholder: 'Ex: Elétrica, Hidráulica, TI', required: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="customers" className="mt-4">
          <CrudSection
            title="Solicitante"
            icon={UsersIcon}
            queryKey="customers"
            table="customers"
            readOnly={readOnly}
            searchKeys={['name', 'email', 'phone']}
            fields={[
              { key: 'name', label: 'Nome', placeholder: 'Nome completo', required: true },
              { key: 'email', label: 'E-mail', placeholder: 'email@exemplo.com' },
              { key: 'phone', label: 'Telefone / Ramal', placeholder: '(11) 99999-0000 ou ramal 302' },
              { key: 'document', label: 'Documento (CPF/CNPJ)', placeholder: '000.000.000-00' },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

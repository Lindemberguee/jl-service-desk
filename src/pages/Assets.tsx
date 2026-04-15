import { useState, useMemo, useCallback, useRef } from 'react';
import { logAudit } from '@/lib/audit';
import { friendlyErrorMessage } from '@/lib/errorMessages';
import { useTenantQuery, useTenantInsert, useTenantUpdate, useTenantDelete } from '@/hooks/useTenantQuery';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Plus, Trash2, Wrench, Loader2, Search, Pencil, X, Download, Upload,
  Building2, MapPin, FolderOpen, DollarSign, AlertTriangle, ShieldCheck, Boxes,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react';

const PAGE_SIZE = 25;

const statusLabelsMap: Record<string, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  em_manutencao: 'Em Manutenção',
  descartado: 'Descartado',
};
const statusColorMap: Record<string, string> = {
  ativo: 'bg-green-500/10 text-green-600 border-green-500/20',
  inativo: 'bg-muted text-muted-foreground',
  em_manutencao: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  descartado: 'bg-destructive/10 text-destructive border-destructive/20',
};
const statusOptions = Object.entries(statusLabelsMap).map(([k, v]) => ({ value: k, label: v }));

type AssetForm = {
  name: string;
  patrimony_code: string;
  serial_number: string;
  status: string;
  unit_id: string;
  location_id: string;
  category_id: string;
  collaborator_id: string;
  purchase_value: string;
};

const emptyForm: AssetForm = {
  name: '', patrimony_code: '', serial_number: '', status: 'ativo',
  unit_id: '', location_id: '', category_id: '', collaborator_id: '',
  purchase_value: '',
};

export default function Assets() {
  const { currentTenantId } = useAuth();
  const { data: assets = [], isLoading } = useTenantQuery<any>('assets', 'assets');
  const { data: units = [] } = useTenantQuery<any>('units', 'units');
  const { data: allLocations = [] } = useTenantQuery<any>('locations', 'locations');
  const { data: categories = [] } = useTenantQuery<any>('categories', 'categories');
  const { data: collaborators = [] } = useTenantQuery<any>('collaborators', 'collaborators');
  const insertMutation = useTenantInsert('assets', ['assets']);
  const updateMutation = useTenantUpdate('assets', ['assets']);
  const deleteMutation = useTenantDelete('assets', ['assets']);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [detailTarget, setDetailTarget] = useState<any>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState<AssetForm>({ ...emptyForm });
  const [editId, setEditId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const unitMap = useMemo(() => Object.fromEntries(units.map((u: any) => [u.id, u.name])), [units]);
  const locationMap = useMemo(() => Object.fromEntries(allLocations.map((l: any) => [l.id, l])), [allLocations]);
  const categoryMap = useMemo(() => Object.fromEntries(categories.map((c: any) => [c.id, c.name])), [categories]);
  const collaboratorMap = useMemo(() => Object.fromEntries(collaborators.map((c: any) => [c.id, { name: c.full_name, department: c.department }])), [collaborators]);

  const formLocations = useMemo(
    () => form.unit_id ? allLocations.filter((l: any) => l.unit_id === form.unit_id) : allLocations,
    [allLocations, form.unit_id]
  );

  const filtered = useMemo(() => {
    return assets.filter((a: any) => {
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      if (filterUnit !== 'all' && a.unit_id !== filterUnit) return false;
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        const match = [a.name, a.patrimony_code, a.serial_number].some(v => v?.toLowerCase().includes(s));
        if (!match) return false;
      }
      return true;
    });
  }, [assets, filterStatus, filterUnit, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedAssets = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);
  useMemo(() => { setPage(1); }, [debouncedSearch, filterStatus, filterUnit]);

  const resetForm = useCallback(() => setForm({ ...emptyForm }), []);

  const setField = (key: keyof AssetForm, value: string) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'unit_id') next.location_id = '';
      return next;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await insertMutation.mutateAsync({
        name: form.name,
        patrimony_code: form.patrimony_code || null,
        serial_number: form.serial_number || null,
        status: form.status,
        unit_id: form.unit_id || null,
        location_id: form.location_id || null,
        category_id: form.category_id || null,
        collaborator_id: form.collaborator_id || null,
        purchase_value: form.purchase_value ? parseFloat(form.purchase_value) : null,
      });
      await logAudit({ entity: 'asset', entityId: (result as any)?.id, action: 'asset.created', tenantId: currentTenantId, diff: { name: form.name, patrimony_code: form.patrimony_code, status: form.status } });
      toast({ title: 'Ativo criado com sucesso!' });
      setCreateOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Erro ao criar ativo', description: err.message, variant: 'destructive' });
    }
  };

  const openEdit = (item: any) => {
    setForm({
      name: item.name || '', patrimony_code: item.patrimony_code || '', serial_number: item.serial_number || '', status: item.status || 'ativo',
      unit_id: item.unit_id || '', location_id: item.location_id || '', category_id: item.category_id || '', collaborator_id: item.collaborator_id || '',
      purchase_value: item.purchase_value != null ? String(item.purchase_value) : '',
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
        name: form.name,
        patrimony_code: form.patrimony_code || null,
        serial_number: form.serial_number || null,
        status: form.status,
        unit_id: form.unit_id || null,
        location_id: form.location_id || null,
        category_id: form.category_id || null,
        collaborator_id: form.collaborator_id || null,
        purchase_value: form.purchase_value ? parseFloat(form.purchase_value) : null,
      });
      await logAudit({ entity: 'asset', entityId: editId, action: 'asset.updated', tenantId: currentTenantId, diff: { name: form.name, status: form.status } });
      toast({ title: 'Ativo atualizado!' });
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
      await logAudit({ entity: 'asset', entityId: deleteTarget.id, action: 'asset.deleted', tenantId: currentTenantId, diff: { name: deleteTarget.name } });
      toast({ title: 'Ativo excluído!' });
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: friendlyErrorMessage(err, 'Erro ao excluir ativo.'), variant: 'destructive' });
    }
    setDeleteTarget(null);
  };

  const exportCsv = () => {
    const headers = ['Nome', 'Patrimônio', 'Nº Série', 'Status', 'Unidade', 'Local', 'Categoria'];
    const rows = filtered.map((a: any) => [
      a.name, a.patrimony_code || '', a.serial_number || '', statusLabelsMap[a.status] || a.status,
      unitMap[a.unit_id] || '', locationMap[a.location_id]?.name || '', categoryMap[a.category_id] || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: string) => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ativos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `${filtered.length} ativo(s) exportado(s)!` });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) throw new Error('Arquivo CSV vazio ou sem dados.');
      const headerLine = lines[0];
      const headers = headerLine.split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
      const nameIdx = headers.findIndex(h => ['nome', 'name'].includes(h));
      const patIdx = headers.findIndex(h => ['patrimonio', 'patrimônio', 'patrimony_code', 'pat'].includes(h));
      const snIdx = headers.findIndex(h => ['serie', 'série', 'serial_number', 'nº série', 'n serie', 'sn'].includes(h));
      const statusIdx = headers.findIndex(h => ['status'].includes(h));
      if (nameIdx === -1) throw new Error('Coluna "Nome" não encontrada no CSV.');
      const statusReverseMap: Record<string, string> = {};
      Object.entries(statusLabelsMap).forEach(([k, v]) => {
        statusReverseMap[v.toLowerCase()] = k;
        statusReverseMap[k] = k;
      });
      let imported = 0;
      let errors = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
        const assetName = cols[nameIdx];
        if (!assetName) continue;
        try {
          const rawStatus = statusIdx >= 0 ? cols[statusIdx] : '';
          const resolvedStatus = statusReverseMap[rawStatus.toLowerCase()] || 'ativo';
          await insertMutation.mutateAsync({
            name: assetName,
            patrimony_code: patIdx >= 0 ? cols[patIdx] || null : null,
            serial_number: snIdx >= 0 ? cols[snIdx] || null : null,
            status: resolvedStatus,
          });
          imported++;
        } catch {
          errors++;
        }
      }
      toast({ title: `Importação concluída!`, description: `${imported} ativo(s) importado(s)${errors > 0 ? `, ${errors} erro(s)` : ''}.` });
      setImportOpen(false);
    } catch (err: any) {
      toast({ title: 'Erro na importação', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const activeFilters = (filterStatus !== 'all' ? 1 : 0) + (filterUnit !== 'all' ? 1 : 0);
  const activeCount = useMemo(() => assets.filter((a: any) => a.status === 'ativo').length, [assets]);
  const maintenanceCount = useMemo(() => assets.filter((a: any) => a.status === 'em_manutencao').length, [assets]);
  const discardedCount = useMemo(() => assets.filter((a: any) => a.status === 'descartado').length, [assets]);
  const totalValue = useMemo(() => assets.reduce((acc: number, a: any) => acc + (a.purchase_value || 0), 0), [assets]);
  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const renderFormFields = () => (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Nome <span className="text-destructive">*</span></Label>
        <Input value={form.name} onChange={e => setField('name', e.target.value)} required placeholder="Ex: Ar-condicionado Split 12k" className="h-9 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Cód. Patrimônio</Label>
          <Input value={form.patrimony_code} onChange={e => setField('patrimony_code', e.target.value)} placeholder="Ex: PAT-00123" className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Nº Série</Label>
          <Input value={form.serial_number} onChange={e => setField('serial_number', e.target.value)} placeholder="Ex: SN123456" className="h-9 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Status</Label>
          <Select value={form.status} onValueChange={v => setField('status', v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Categoria</Label>
          <Select value={form.category_id} onValueChange={v => setField('category_id', v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Unidade</Label>
          <Select value={form.unit_id} onValueChange={v => setField('unit_id', v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Sala / Espaço</Label>
          <Select value={form.location_id} onValueChange={v => setField('location_id', v)} disabled={formLocations.length === 0}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={formLocations.length === 0 ? (form.unit_id ? 'Nenhum local' : 'Selecione unidade') : 'Selecione'} />
            </SelectTrigger>
            <SelectContent>
              {formLocations.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}{l.description ? ` — ${l.description}` : ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Responsável</Label>
        <Select value={form.collaborator_id} onValueChange={v => setField('collaborator_id', v)}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione um colaborador" /></SelectTrigger>
          <SelectContent>
            {collaborators.filter((c: any) => c.is_active).map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.full_name}{c.department ? ` — ${c.department}` : ''}{c.matricula ? ` (${c.matricula})` : ''}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Valor (R$)</Label>
        <CurrencyInput value={form.purchase_value} onValueChange={(v) => setForm(prev => ({ ...prev, purchase_value: v }))} placeholder="Ex: 1.500,00" />
      </div>
    </>
  );

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/30 p-5 shadow-sm">
        <div className="absolute inset-y-0 right-0 w-48 bg-primary/5 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Boxes className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Patrimônio e equipamentos</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">Ativos / Equipamentos</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Organize bens patrimoniais, responsáveis, localização física e estado operacional em uma visão mais clara e confiável.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 gap-1.5">
                  <Upload className="h-3.5 w-3.5" /> Importar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Importar Ativos (CSV)</DialogTitle>
                  <DialogDescription>Selecione um CSV com colunas Nome, Patrimônio, Série e Status.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="rounded-xl border border-dashed border-border p-6 text-center">
                    <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                    <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} />
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                      {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {importing ? 'Importando...' : 'Selecionar arquivo CSV'}
                    </Button>
                    <p className="mt-2 text-[10px] text-muted-foreground">Formato: Nome, Patrimônio, Série, Status</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="h-3.5 w-3.5" /> Exportar
            </Button>
            <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9 gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Novo Ativo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Novo Ativo</DialogTitle>
                  <DialogDescription>Cadastre um novo equipamento ou ativo.</DialogDescription>
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
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <MetricCard icon={Boxes} label="Total de ativos" value={assets.length} tone="primary" />
        <MetricCard icon={ShieldCheck} label="Operacionais" value={activeCount} tone="success" />
        <MetricCard icon={AlertTriangle} label="Em manutenção" value={maintenanceCount} tone={maintenanceCount > 0 ? 'warning' : 'muted'} />
        <MetricCard icon={Trash2} label="Descartados" value={discardedCount} tone={discardedCount > 0 ? 'danger' : 'muted'} />
        <MetricCard icon={DollarSign} label="Valor total" value={formatCurrency(totalValue)} tone="success" />
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nome, patrimônio ou série..." value={search} onChange={e => setSearch(e.target.value)} className="h-10 pl-9 pr-9" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-10 w-[170px] text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {units.length > 0 && (
                <Select value={filterUnit} onValueChange={setFilterUnit}>
                  <SelectTrigger className="h-10 w-[180px] text-sm"><SelectValue placeholder="Unidade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas unidades</SelectItem>
                    {units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {activeFilters > 0 && (
                <Button variant="ghost" size="sm" className="h-10 gap-1.5" onClick={() => { setFilterStatus('all'); setFilterUnit('all'); }}>
                  <X className="h-3.5 w-3.5" /> Limpar
                </Button>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{filtered.length} registro(s) exibido(s)</span>
            {activeFilters > 0 && <span>{activeFilters} filtro(s) ativo(s)</span>}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="py-16 text-center">
            <Boxes className="mx-auto mb-3 h-10 w-10 text-muted-foreground/25" />
            <p className="text-sm font-medium text-foreground">
              {search || activeFilters > 0 ? 'Nenhum ativo encontrado com esses filtros.' : 'Nenhum ativo cadastrado.'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{search || activeFilters > 0 ? 'Ajuste os filtros ou refine a busca.' : 'Cadastre o primeiro ativo para iniciar o controle patrimonial.'}</p>
            {!search && activeFilters === 0 && (
              <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Cadastrar primeiro ativo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-2">
          {paginatedAssets.map((a: any) => (
            <Card key={a.id} className="overflow-hidden border-border/60 shadow-sm transition-colors hover:border-border" onClick={() => setDetailTarget(a)}>
              <CardContent className="p-4 space-y-3 cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      {a.patrimony_code && <span>Pat: {a.patrimony_code}</span>}
                      {a.serial_number && <span>S/N: {a.serial_number}</span>}
                    </div>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[10px] ${statusColorMap[a.status]}`}>{statusLabelsMap[a.status]}</Badge>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  {a.unit_id && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{unitMap[a.unit_id]}</span>}
                  {a.location_id && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{locationMap[a.location_id]?.name}</span>}
                  {a.category_id && <span className="flex items-center gap-1"><FolderOpen className="h-3 w-3" />{categoryMap[a.category_id]}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden border-border/60 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="h-11 text-[11px] font-semibold uppercase text-muted-foreground">Nome</TableHead>
                <TableHead className="h-11 w-[110px] text-[11px] font-semibold uppercase text-muted-foreground">Patrimônio</TableHead>
                <TableHead className="h-11 w-[110px] text-[11px] font-semibold uppercase text-muted-foreground">Nº Série</TableHead>
                <TableHead className="h-11 w-[110px] text-[11px] font-semibold uppercase text-muted-foreground">Status</TableHead>
                <TableHead className="h-11 w-[130px] text-[11px] font-semibold uppercase text-muted-foreground">Unidade</TableHead>
                <TableHead className="h-11 w-[130px] text-[11px] font-semibold uppercase text-muted-foreground">Local</TableHead>
                <TableHead className="h-11 w-[120px] text-[11px] font-semibold uppercase text-muted-foreground">Categoria</TableHead>
                <TableHead className="h-11 w-[170px] text-[11px] font-semibold uppercase text-muted-foreground">Responsável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAssets.map((a: any) => (
                <TableRow key={a.id} className="cursor-pointer hover:bg-accent/30" onClick={() => setDetailTarget(a)}>
                  <TableCell className="max-w-[240px] text-sm font-medium truncate whitespace-nowrap">{a.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{a.patrimony_code || '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{a.serial_number || '-'}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-[11px] ${statusColorMap[a.status]}`}>{statusLabelsMap[a.status]}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{unitMap[a.unit_id] || '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{locationMap[a.location_id]?.name || '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{categoryMap[a.category_id] || '-'}</TableCell>
                  <TableCell className="max-w-[180px] text-xs text-muted-foreground whitespace-nowrap">
                    {collaboratorMap[a.collaborator_id]
                      ? <div className="truncate" title={`${collaboratorMap[a.collaborator_id].name}${collaboratorMap[a.collaborator_id].department ? ` — ${collaboratorMap[a.collaborator_id].department}` : ''}`}>
                          {collaboratorMap[a.collaborator_id].name}
                          {collaboratorMap[a.collaborator_id].department && <span className="text-muted-foreground/60"> — {collaboratorMap[a.collaborator_id].department}</span>}
                        </div>
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!detailTarget} onOpenChange={v => { if (!v) setDetailTarget(null); }}>
        <DialogContent className="max-w-md">
          {detailTarget && (() => {
            const a = detailTarget;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><Boxes className="h-5 w-5 text-primary" /> {a.name}</DialogTitle>
                  <DialogDescription>Detalhes do ativo</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={statusColorMap[a.status]}>{statusLabelsMap[a.status]}</Badge>
                    {a.category_id && categoryMap[a.category_id] && <Badge variant="outline" className="gap-1 text-xs"><FolderOpen className="h-3 w-3" /> {categoryMap[a.category_id]}</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Patrimônio:</span> <strong>{a.patrimony_code || '-'}</strong></div>
                    <div><span className="text-muted-foreground">Nº Série:</span> <strong>{a.serial_number || '-'}</strong></div>
                    <div><span className="text-muted-foreground">Unidade:</span> <strong>{unitMap[a.unit_id] || '-'}</strong></div>
                    <div><span className="text-muted-foreground">Local:</span> <strong>{locationMap[a.location_id]?.name || '-'}</strong></div>
                    {a.purchase_value != null && <div className="col-span-2"><span className="text-muted-foreground">Valor:</span> <strong>{formatCurrency(a.purchase_value)}</strong></div>}
                    {collaboratorMap[a.collaborator_id] && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Responsável:</span> <strong>{collaboratorMap[a.collaborator_id].name}</strong>
                        {collaboratorMap[a.collaborator_id].department && <span className="text-muted-foreground"> — {collaboratorMap[a.collaborator_id].department}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setDetailTarget(null); openEdit(a); }}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => { setDetailTarget(null); setDeleteTarget(a); }}>
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { resetForm(); setEditId(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Ativo</DialogTitle>
            <DialogDescription>Altere os dados do ativo e salve.</DialogDescription>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Ativo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>{deleteTarget?.patrimony_code ? ` (${deleteTarget.patrimony_code})` : ''}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />} Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone: 'primary' | 'success' | 'warning' | 'danger' | 'muted' }) {
  const toneMap = {
    primary: 'bg-primary/10 text-primary border-primary/15',
    success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/15',
    danger: 'bg-destructive/10 text-destructive border-destructive/15',
    muted: 'bg-muted text-muted-foreground border-border/40',
  } as const;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`rounded-xl border p-2.5 ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState, useMemo, useRef } from 'react';
import { useTenantQuery, useTenantInsert, useTenantUpdate, useTenantDelete } from '@/hooks/useTenantQuery';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Minus, Package, Loader2, ArrowDown, ArrowUp, Search,
  AlertTriangle, Eye, History, Link2, Filter, RotateCcw,
  Pencil, Trash2, Save, Download, Upload, FileDown,
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useDebounce } from '@/hooks/useDebounce';

export default function Stock() {
  const { currentTenantId, user } = useAuth();
  const { data: items = [], isLoading } = useTenantQuery<any>('stock_items', 'stock_items');
  const { data: movements = [] } = useTenantQuery<any>('stock_movements', 'stock_movements', {
    select: '*, stock_items(name), work_orders(code, title)',
  });
  const { data: workOrders = [] } = useTenantQuery<any>('work_orders_for_stock', 'work_orders', {
    select: 'id, code, title, status',
  });
  const insertItem = useTenantInsert('stock_items', ['stock_items']);
  const updateItem = useTenantUpdate('stock_items', ['stock_items']);
  const deleteItem = useTenantDelete('stock_items', ['stock_items', 'stock_movements']);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [open, setOpen] = useState(false);
  const [movOpen, setMovOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editMinLevel, setEditMinLevel] = useState('');
  const [editCurrentLevel, setEditCurrentLevel] = useState('');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('un');
  const [minLevel, setMinLevel] = useState('0');
  const [initialQty, setInitialQty] = useState('0');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const debouncedSearch = useDebounce(search, 300);

  // Quick move dialog
  const [qmOpen, setQmOpen] = useState(false);
  const [qmItem, setQmItem] = useState<any>(null);
  const [qmQty, setQmQty] = useState('1');
  const [qmType, setQmType] = useState<'in' | 'out'>('in');
  const [qmRef, setQmRef] = useState('');
  const [qmLoading, setQmLoading] = useState(false);

  // Import
  const [importing, setImporting] = useState(false);

  // Movement form
  const [movItemId, setMovItemId] = useState('');
  const [movType, setMovType] = useState<'in' | 'out' | 'adjust'>('in');
  const [movQty, setMovQty] = useState('1');
  const [movRef, setMovRef] = useState('');
  const [movWoId, setMovWoId] = useState('');

  const lowStockCount = items.filter((i: any) => (i.current_level || 0) <= (i.min_level || 0) && i.min_level > 0).length;

  const filteredItems = useMemo(() => {
    return items.filter((item: any) => {
      const s = debouncedSearch.toLowerCase();
      const matchSearch = !debouncedSearch || item.name?.toLowerCase().includes(s) || item.sku?.toLowerCase().includes(s);
      const isLow = (item.current_level || 0) <= (item.min_level || 0) && item.min_level > 0;
      const matchStatus = statusFilter === 'all' || (statusFilter === 'low' && isLow) || (statusFilter === 'normal' && !isLow);
      return matchSearch && matchStatus;
    });
  }, [items, debouncedSearch, statusFilter]);

  const itemMovements = useMemo(() => {
    if (!detailItem) return [];
    return movements.filter((m: any) => m.stock_item_id === detailItem.id);
  }, [detailItem, movements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const qty = parseInt(initialQty) || 0;
      await insertItem.mutateAsync({ name, sku, unit, min_level: parseInt(minLevel) || 0, current_level: qty });
      toast({ title: 'Item criado!' });
      setOpen(false);
      setName(''); setSku(''); setUnit('un'); setMinLevel('0'); setInitialQty('0');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const movementMutation = useMutation({
    mutationFn: async () => {
      if (!currentTenantId || !movItemId) throw new Error('Dados incompletos');
      const qty = parseInt(movQty);
      if (!qty || qty <= 0) throw new Error('Quantidade inválida');
      const { error: movErr } = await (supabase.from as any)('stock_movements').insert({
        tenant_id: currentTenantId, stock_item_id: movItemId, type: movType,
        qty, reference: movRef || null, work_order_id: movWoId || null, created_by: user?.id,
      });
      if (movErr) throw movErr;
      const item = items.find((i: any) => i.id === movItemId);
      const currentLevel = item?.current_level || 0;
      let newLevel = currentLevel;
      if (movType === 'in') newLevel = currentLevel + qty;
      else if (movType === 'out') newLevel = Math.max(0, currentLevel - qty);
      else newLevel = qty;
      const { error: upErr } = await (supabase.from as any)('stock_items').update({ current_level: newLevel }).eq('id', movItemId);
      if (upErr) throw upErr;
    },
    onSuccess: () => {
      toast({ title: 'Movimentação registrada!' });
      setMovOpen(false);
      setMovItemId(''); setMovType('in'); setMovQty('1'); setMovRef(''); setMovWoId('');
      qc.invalidateQueries({ queryKey: ['stock_items'] });
      qc.invalidateQueries({ queryKey: ['stock_movements'] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  const getMovementItemName = (m: any) => m.stock_items?.name || items.find((i: any) => i.id === m.stock_item_id)?.name || '-';

  // Quick move via dialog
  const openQuickMove = (item: any, type: 'in' | 'out') => {
    setQmItem(item);
    setQmType(type);
    setQmQty('1');
    setQmRef('');
    setQmOpen(true);
  };

  const handleQuickMove = async () => {
    if (!currentTenantId || !qmItem) return;
    const qty = parseInt(qmQty);
    if (!qty || qty <= 0) {
      toast({ title: 'Quantidade inválida', variant: 'destructive' });
      return;
    }
    const currentLevel = qmItem.current_level || 0;
    if (qmType === 'out' && currentLevel < qty) {
      toast({ title: 'Estoque insuficiente', variant: 'destructive' });
      return;
    }
    setQmLoading(true);
    try {
      await (supabase.from as any)('stock_movements').insert({
        tenant_id: currentTenantId, stock_item_id: qmItem.id, type: qmType,
        qty, reference: qmRef || (qmType === 'in' ? `Entrada (${qty})` : `Saída (${qty})`),
        created_by: user?.id,
      });
      const newLevel = qmType === 'in' ? currentLevel + qty : Math.max(0, currentLevel - qty);
      await (supabase.from as any)('stock_items').update({ current_level: newLevel }).eq('id', qmItem.id);
      qc.invalidateQueries({ queryKey: ['stock_items'] });
      qc.invalidateQueries({ queryKey: ['stock_movements'] });
      toast({ title: qmType === 'in' ? `+${qty} entrada registrada` : `-${qty} saída registrada` });
      setQmOpen(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setQmLoading(false);
    }
  };

  // Export CSV
  const exportCSV = () => {
    const header = 'Nome;SKU;Unidade;Quantidade Atual;Nível Mínimo';
    const rows = items.map((i: any) =>
      `${i.name};${i.sku || ''};${i.unit || 'un'};${i.current_level || 0};${i.min_level || 0}`
    );
    const csv = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estoque_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Estoque exportado!' });
  };

  // Download template
  const downloadTemplate = () => {
    const header = 'Nome;SKU;Unidade;Quantidade Inicial;Nível Mínimo';
    const example = 'Parafuso M6;SKU-001;un;100;20\nÓleo Lubrificante;SKU-002;litro;50;10\nFiltro de Ar;SKU-003;un;30;5';
    const csv = '\uFEFF' + [header, example].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_estoque.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Modelo baixado!' });
  };

  // Import CSV
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTenantId) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) throw new Error('Arquivo vazio ou sem dados');
      const dataLines = lines.slice(1); // skip header
      let created = 0;
      let skipped = 0;
      for (const line of dataLines) {
        const parts = line.split(';').map(p => p.trim());
        const itemName = parts[0];
        if (!itemName) { skipped++; continue; }
        const itemSku = parts[1] || '';
        const itemUnit = parts[2] || 'un';
        const itemQty = parseInt(parts[3]) || 0;
        const itemMin = parseInt(parts[4]) || 0;
        // Check if item with same name or sku already exists
        const existing = items.find((i: any) =>
          i.name.toLowerCase() === itemName.toLowerCase() ||
          (itemSku && i.sku?.toLowerCase() === itemSku.toLowerCase())
        );
        if (existing) { skipped++; continue; }
        const { error } = await (supabase.from as any)('stock_items').insert({
          tenant_id: currentTenantId,
          name: itemName, sku: itemSku || null, unit: itemUnit,
          current_level: itemQty, min_level: itemMin,
        });
        if (error) { skipped++; continue; }
        created++;
      }
      qc.invalidateQueries({ queryKey: ['stock_items'] });
      toast({
        title: 'Importação concluída!',
        description: `${created} item(ns) criado(s)${skipped > 0 ? `, ${skipped} ignorado(s) (duplicados ou inválidos)` : ''}`,
      });
    } catch (err: any) {
      toast({ title: 'Erro na importação', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Estoque</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{filteredItems.length} item(ns)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Import/Export/Template */}
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={downloadTemplate}>
            <FileDown className="h-3.5 w-3.5" /> Baixar Modelo
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Importar
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImport} />
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={exportCSV} disabled={items.length === 0}>
            <Download className="h-3.5 w-3.5" /> Exportar
          </Button>

          <Dialog open={movOpen} onOpenChange={setMovOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                <RotateCcw className="h-3.5 w-3.5" /> Movimentação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Movimentação</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Item *</Label>
                  <Select value={movItemId} onValueChange={setMovItemId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o item" /></SelectTrigger>
                    <SelectContent>
                      {items.map((i: any) => (
                        <SelectItem key={i.id} value={i.id}>{i.name} {i.sku ? `(${i.sku})` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo *</Label>
                    <Select value={movType} onValueChange={(v: any) => setMovType(v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">Entrada</SelectItem>
                        <SelectItem value="out">Saída</SelectItem>
                        <SelectItem value="adjust">Ajuste</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quantidade *</Label>
                    <Input type="number" min="1" value={movQty} onChange={e => setMovQty(e.target.value)} className="h-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Vincular à OS (opcional)</Label>
                  <Select value={movWoId} onValueChange={setMovWoId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {workOrders.filter((wo: any) => !['encerrada'].includes(wo.status)).map((wo: any) => (
                        <SelectItem key={wo.id} value={wo.id}>{wo.code} — {wo.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Referência / Nota</Label>
                  <Input value={movRef} onChange={e => setMovRef(e.target.value)} className="h-9" placeholder="Ex: NF-12345" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => movementMutation.mutate()} disabled={!movItemId || movementMutation.isPending} className="w-full h-8 text-sm">
                  {movementMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Registrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />Novo Item</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Item de Estoque</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5"><Label className="text-xs">Nome *</Label><Input value={name} onChange={e => setName(e.target.value)} required className="h-9" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">SKU</Label><Input value={sku} onChange={e => setSku(e.target.value)} className="h-9" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Unidade</Label><Input value={unit} onChange={e => setUnit(e.target.value)} className="h-9" placeholder="un, pc, m..." /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">Quantidade inicial</Label><Input type="number" min="0" value={initialQty} onChange={e => setInitialQty(e.target.value)} className="h-9" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Nível mínimo</Label><Input type="number" min="0" value={minLevel} onChange={e => setMinLevel(e.target.value)} className="h-9" /></div>
                </div>
                <Button type="submit" className="w-full h-8 text-sm" disabled={insertItem.isPending}>
                  {insertItem.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Salvar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-md p-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive font-medium">
            {lowStockCount} {lowStockCount === 1 ? 'item está' : 'itens estão'} abaixo do nível mínimo!
          </p>
          <Button variant="ghost" size="sm" className="ml-auto h-6 text-[11px] text-destructive hover:text-destructive" onClick={() => setStatusFilter('low')}>
            Ver itens
          </Button>
        </div>
      )}

      <Tabs defaultValue="items">
        <TabsList className="bg-card border border-border h-9">
          <TabsTrigger value="items" className="text-xs h-7">Itens</TabsTrigger>
          <TabsTrigger value="movements" className="text-xs h-7">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-3 space-y-3">
          {/* Filters */}
          <div className="bg-card border border-border rounded-md p-3 flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou SKU..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="low">Estoque Baixo</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-md" />)}</div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-card border border-border rounded-md py-16 text-center text-muted-foreground">
              <Package className="mx-auto h-8 w-8 mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum item encontrado</p>
            </div>
          ) : isMobile ? (
            <div className="space-y-2">
              {filteredItems.map((item: any) => {
                const isLow = (item.current_level || 0) <= (item.min_level || 0) && item.min_level > 0;
                return (
                  <div key={item.id} className="bg-card border border-border rounded-md p-3">
                    <div className="flex items-start justify-between gap-2" onClick={() => setDetailItem(item)}>
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        {item.sku && <p className="text-[11px] text-muted-foreground mt-0.5">SKU: {item.sku}</p>}
                      </div>
                      <Badge variant="outline" className={`text-[10px] h-5 ${isLow ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
                        {isLow ? 'Baixo' : 'Normal'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Atual: <strong className="text-foreground">{item.current_level}</strong> {item.unit || 'un'}</span>
                        <span>Mín: {item.min_level}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7 text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => openQuickMove(item, 'out')}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-7 w-7 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10" onClick={() => openQuickMove(item, 'in')}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Nome</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[90px]">SKU</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[80px]">Unid.</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[100px]">Nível Atual</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[100px]">Nível Mín.</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[80px]">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item: any) => {
                    const isLow = (item.current_level || 0) <= (item.min_level || 0) && item.min_level > 0;
                    return (
                      <TableRow key={item.id} className="cursor-pointer" onClick={() => setDetailItem(item)}>
                        <TableCell className="text-sm font-medium">{item.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.sku || '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.unit || 'un'}</TableCell>
                        <TableCell className="text-sm font-medium">{item.current_level}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.min_level}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[11px] ${isLow ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
                            {isLow ? 'Baixo' : 'Normal'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <Button variant="outline" size="icon" className="h-7 w-7 text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => openQuickMove(item, 'out')} title="Saída">
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-7 w-7 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10" onClick={() => openQuickMove(item, 'in')} title="Entrada">
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailItem(item)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="movements" className="mt-3">
          {movements.length === 0 ? (
            <div className="bg-card border border-border rounded-md py-16 text-center text-muted-foreground">
              <History className="mx-auto h-8 w-8 mb-3 opacity-30" />
              <p className="text-sm">Nenhuma movimentação registrada.</p>
            </div>
          ) : isMobile ? (
            <div className="space-y-2">
              {movements.map((m: any) => (
                <div key={m.id} className="bg-card border border-border rounded-md p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium truncate">{getMovementItemName(m)}</span>
                    {m.type === 'in' && <Badge variant="outline" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-600 gap-1 shrink-0"><ArrowDown className="h-3 w-3" />Entrada</Badge>}
                    {m.type === 'out' && <Badge variant="outline" className="text-[10px] h-5 bg-destructive/10 text-destructive gap-1 shrink-0"><ArrowUp className="h-3 w-3" />Saída</Badge>}
                    {m.type === 'adjust' && <Badge variant="outline" className="text-[10px] h-5 shrink-0">Ajuste</Badge>}
                  </div>
                  <div className="flex justify-between mt-1.5 text-[11px] text-muted-foreground">
                    <span>Qtd: <strong className="text-foreground">{m.qty}</strong></span>
                    {m.work_orders?.code && <span className="flex items-center gap-0.5"><Link2 className="h-3 w-3" />{m.work_orders.code}</span>}
                    <span>{new Date(m.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  {m.reference && <p className="text-[11px] text-muted-foreground mt-1">{m.reference}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Item</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[100px]">Tipo</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[70px]">Qtd</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Referência</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[110px]">OS Vinculada</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[150px]">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm font-medium">{getMovementItemName(m)}</TableCell>
                      <TableCell>
                        {m.type === 'in' && <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 gap-1"><ArrowDown className="h-3 w-3" />Entrada</Badge>}
                        {m.type === 'out' && <Badge variant="outline" className="text-[11px] bg-destructive/10 text-destructive gap-1"><ArrowUp className="h-3 w-3" />Saída</Badge>}
                        {m.type === 'adjust' && <Badge variant="outline" className="text-[11px]">Ajuste</Badge>}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{m.qty}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.reference || '-'}</TableCell>
                      <TableCell>
                        {m.work_orders?.code ? (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Link2 className="h-3 w-3" />{m.work_orders.code}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString('pt-BR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Move Dialog */}
      <Dialog open={qmOpen} onOpenChange={setQmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {qmType === 'in' ? (
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <ArrowDown className="h-4 w-4 text-emerald-600" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <ArrowUp className="h-4 w-4 text-destructive" />
                </div>
              )}
              <div>
                <p className="text-sm">{qmType === 'in' ? 'Entrada' : 'Saída'} de Estoque</p>
                <p className="text-xs font-normal text-muted-foreground">{qmItem?.name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Estoque atual</span>
              <span className="text-lg font-bold">{qmItem?.current_level || 0} <span className="text-xs font-normal text-muted-foreground">{qmItem?.unit || 'un'}</span></span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Quantidade *</Label>
              <Input
                type="number"
                min="1"
                value={qmQty}
                onChange={e => setQmQty(e.target.value)}
                className="h-10 text-lg text-center font-semibold"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleQuickMove(); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Observação (opcional)</Label>
              <Input
                value={qmRef}
                onChange={e => setQmRef(e.target.value)}
                className="h-9"
                placeholder="Ex: NF-12345, Manutenção preventiva..."
              />
            </div>
            {qmType === 'out' && parseInt(qmQty) > (qmItem?.current_level || 0) && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Quantidade maior que o estoque atual
              </p>
            )}
            <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-between border border-border/50">
              <span className="text-xs text-muted-foreground">Novo saldo</span>
              <span className="text-lg font-bold">
                {qmType === 'in'
                  ? (qmItem?.current_level || 0) + (parseInt(qmQty) || 0)
                  : Math.max(0, (qmItem?.current_level || 0) - (parseInt(qmQty) || 0))
                } <span className="text-xs font-normal text-muted-foreground">{qmItem?.unit || 'un'}</span>
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleQuickMove}
              disabled={qmLoading || !parseInt(qmQty) || parseInt(qmQty) <= 0}
              className={`w-full h-9 text-sm gap-2 ${qmType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'}`}
            >
              {qmLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {qmType === 'in' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
              Confirmar {qmType === 'in' ? 'Entrada' : 'Saída'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={(v) => { if (!v) { setDetailItem(null); setEditMode(false); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              {editMode ? 'Editar Item' : detailItem?.name}
            </DialogTitle>
          </DialogHeader>
          {detailItem && !editMode && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-md p-2.5">
                  <p className="text-[11px] text-muted-foreground mb-0.5">Nível Atual</p>
                  <p className="text-lg font-bold">{detailItem.current_level} <span className="text-xs font-normal text-muted-foreground">{detailItem.unit || 'un'}</span></p>
                </div>
                <div className="bg-muted/50 rounded-md p-2.5">
                  <p className="text-[11px] text-muted-foreground mb-0.5">Nível Mínimo</p>
                  <p className="text-lg font-bold">{detailItem.min_level}</p>
                </div>
              </div>
              {detailItem.sku && <p className="text-xs text-muted-foreground">SKU: {detailItem.sku}</p>}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => {
                  setEditName(detailItem.name);
                  setEditSku(detailItem.sku || '');
                  setEditUnit(detailItem.unit || 'un');
                  setEditMinLevel(String(detailItem.min_level || 0));
                  setEditCurrentLevel(String(detailItem.current_level || 0));
                  setEditMode(true);
                }}>
                  <Pencil className="h-3 w-3" /> Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive">
                      <Trash2 className="h-3 w-3" /> Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir item?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O item "{detailItem.name}" será excluído permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
                        try {
                          await deleteItem.mutateAsync(detailItem.id);
                          toast({ title: 'Item excluído!' });
                          setDetailItem(null);
                        } catch (err: any) {
                          toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
                        }
                      }}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div>
                <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                  <History className="h-3.5 w-3.5" /> Histórico de Movimentações
                </p>
                {itemMovements.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Sem movimentações.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                    {itemMovements.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-2 bg-muted/30 rounded-md p-2 text-xs">
                        {m.type === 'in' && <ArrowDown className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                        {m.type === 'out' && <ArrowUp className="h-3.5 w-3.5 text-destructive shrink-0" />}
                        {m.type === 'adjust' && <RotateCcw className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <span className="font-medium">{m.type === 'in' ? '+' : m.type === 'out' ? '-' : '='}{m.qty}</span>
                        <span className="text-muted-foreground flex-1 truncate">{m.reference || ''}</span>
                        {m.work_orders?.code && (
                          <Badge variant="outline" className="text-[9px] gap-0.5 shrink-0">
                            <Link2 className="h-2.5 w-2.5" />{m.work_orders.code}
                          </Badge>
                        )}
                        <span className="text-muted-foreground shrink-0">{new Date(m.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {detailItem && editMode && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await updateItem.mutateAsync({
                  id: detailItem.id, name: editName, sku: editSku || null,
                  unit: editUnit || 'un', min_level: parseInt(editMinLevel) || 0,
                  current_level: parseInt(editCurrentLevel) || 0,
                });
                toast({ title: 'Item atualizado!' });
                setDetailItem({ ...detailItem, name: editName, sku: editSku, unit: editUnit, min_level: parseInt(editMinLevel) || 0, current_level: parseInt(editCurrentLevel) || 0 });
                setEditMode(false);
              } catch (err: any) {
                toast({ title: 'Erro', description: err.message, variant: 'destructive' });
              }
            }} className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">Nome *</Label><Input value={editName} onChange={e => setEditName(e.target.value)} required className="h-9" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">SKU</Label><Input value={editSku} onChange={e => setEditSku(e.target.value)} className="h-9" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Unidade</Label><Input value={editUnit} onChange={e => setEditUnit(e.target.value)} className="h-9" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Quantidade atual</Label><Input type="number" min="0" value={editCurrentLevel} onChange={e => setEditCurrentLevel(e.target.value)} className="h-9" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Nível mínimo</Label><Input type="number" min="0" value={editMinLevel} onChange={e => setEditMinLevel(e.target.value)} className="h-9" /></div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 h-8 text-sm" onClick={() => setEditMode(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1 h-8 text-sm gap-1.5" disabled={updateItem.isPending}>
                  {updateItem.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <Save className="h-3.5 w-3.5" /> Salvar
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

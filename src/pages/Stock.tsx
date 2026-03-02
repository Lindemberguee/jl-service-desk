import { useState, useMemo, useRef, useCallback } from 'react';
import { logAudit } from '@/lib/audit';
import { friendlyErrorMessage } from '@/lib/errorMessages';
import { useTenantQuery, useTenantInsert, useTenantUpdate, useTenantDelete } from '@/hooks/useTenantQuery';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Minus, Package, Loader2, ArrowDown, ArrowUp, Search,
  AlertTriangle, Eye, History, Link2, Filter, RotateCcw,
  Pencil, Trash2, Save, Download, Upload, FileDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X,
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useDebounce } from '@/hooks/useDebounce';

const PAGE_SIZE = 50;

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
  const [editBrand, setEditBrand] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editComponentType, setEditComponentType] = useState('');
  const [editPatrimonyCode, setEditPatrimonyCode] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSerialNumber, setEditSerialNumber] = useState('');
  const [editStatus, setEditStatus] = useState<string>('ativo');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('un');
  const [minLevel, setMinLevel] = useState('0');
  const [initialQty, setInitialQty] = useState('0');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [componentType, setComponentType] = useState('');
  const [patrimonyCode, setPatrimonyCode] = useState('');
  const [description, setDescription] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const debouncedSearch = useDebounce(search, 300);

  // Pagination
  const [page, setPage] = useState(1);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Quick move dialog
  const [qmOpen, setQmOpen] = useState(false);
  const [qmItem, setQmItem] = useState<any>(null);
  const [qmQty, setQmQty] = useState('1');
  const [qmType, setQmType] = useState<'in' | 'out'>('in');
  const [qmRef, setQmRef] = useState('');
  const [qmLoading, setQmLoading] = useState(false);

  // Import progress
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);

  // Bulk delete
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Movement form
  const [movItemId, setMovItemId] = useState('');
  const [movType, setMovType] = useState<'in' | 'out' | 'adjust'>('in');
  const [movQty, setMovQty] = useState('1');
  const [movRef, setMovRef] = useState('');
  const [movWoId, setMovWoId] = useState('');

  const lowStockCount = items.filter((i: any) => (i.current_level || 0) <= (i.min_level || 0) && i.min_level > 0).length;

  const filteredItems = useMemo(() => {
    const result = items.filter((item: any) => {
      const s = debouncedSearch.toLowerCase();
      const matchSearch = !debouncedSearch || item.name?.toLowerCase().includes(s) || item.sku?.toLowerCase().includes(s) || item.brand?.toLowerCase().includes(s) || item.model?.toLowerCase().includes(s) || item.patrimony_code?.toLowerCase().includes(s);
      const isLow = (item.current_level || 0) <= (item.min_level || 0) && item.min_level > 0;
      const itemStatus = item.status || 'ativo';
      const matchStatus = statusFilter === 'all' || (statusFilter === 'low' && isLow) || (statusFilter === 'normal' && !isLow) || (statusFilter === 'ativo' && itemStatus === 'ativo') || (statusFilter === 'inativo' && itemStatus === 'inativo') || (statusFilter === 'descartado' && itemStatus === 'descartado');
      return matchSearch && matchStatus;
    });
    return result;
  }, [items, debouncedSearch, statusFilter]);

  // Reset page when filters change
  useMemo(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  const itemMovements = useMemo(() => {
    if (!detailItem) return [];
    return movements.filter((m: any) => m.stock_item_id === detailItem.id);
  }, [detailItem, movements]);

  // Selection helpers
  const allOnPageSelected = paginatedItems.length > 0 && paginatedItems.every((i: any) => selectedIds.has(i.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        paginatedItems.forEach((i: any) => next.delete(i.id));
      } else {
        paginatedItems.forEach((i: any) => next.add(i.id));
      }
      return next;
    });
  }, [allOnPageSelected, paginatedItems]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = () => setSelectedIds(new Set());

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await (supabase.from as any)('stock_movements').delete().in('stock_item_id', ids);
      const { error } = await (supabase.from as any)('stock_items').delete().in('id', ids);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['stock_items'] });
      qc.invalidateQueries({ queryKey: ['stock_movements'] });
      await logAudit({ entity: 'stock', action: 'stock.bulk_deleted', tenantId: currentTenantId, diff: { count: ids.length, ids } });
      toast({ title: `${ids.length} item(ns) excluído(s)!` });
      setSelectedIds(new Set());
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: friendlyErrorMessage(err, 'Erro ao excluir itens.'), variant: 'destructive' });
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const qty = parseInt(initialQty) || 0;
      const result = await insertItem.mutateAsync({
        name, sku, unit, min_level: parseInt(minLevel) || 0, current_level: qty,
        brand: brand || null, model: model || null, component_type: componentType || null,
        patrimony_code: patrimonyCode || null, description: description || null,
        serial_number: serialNumber || null,
      });
      await logAudit({ entity: 'stock', entityId: (result as any)?.id, action: 'stock.created', tenantId: currentTenantId, diff: { name, sku, unit, initial_qty: qty } });
      toast({ title: 'Item criado!' });
      setOpen(false);
      setName(''); setSku(''); setUnit('un'); setMinLevel('0'); setInitialQty('0');
      setBrand(''); setModel(''); setComponentType(''); setPatrimonyCode(''); setDescription(''); setSerialNumber('');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const movementMutation = useMutation({
    mutationFn: async () => {
      if (!currentTenantId || !movItemId) throw new Error('Dados incompletos');
      const qty = parseInt(movQty);
      if (!qty || qty <= 0) throw new Error('Quantidade inválida');
      await (supabase.from as any)('stock_movements').insert({
        tenant_id: currentTenantId, stock_item_id: movItemId, type: movType,
        qty, reference: movRef || null, work_order_id: movWoId || null, created_by: user?.id,
      });
      const item = items.find((i: any) => i.id === movItemId);
      const currentLevel = item?.current_level || 0;
      let newLevel = currentLevel;
      if (movType === 'in') newLevel = currentLevel + qty;
      else if (movType === 'out') newLevel = Math.max(0, currentLevel - qty);
      else newLevel = qty;
      await (supabase.from as any)('stock_items').update({ current_level: newLevel }).eq('id', movItemId);
      const itemName = item?.name || movItemId;
      await logAudit({ entity: 'stock', entityId: movItemId, action: 'stock.movement', tenantId: currentTenantId, diff: { type: movType, qty, item_name: itemName, reference: movRef || null, work_order_id: movWoId || null } });
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

  // Quick move
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
    if (!qty || qty <= 0) { toast({ title: 'Quantidade inválida', variant: 'destructive' }); return; }
    const currentLevel = qmItem.current_level || 0;
    if (qmType === 'out' && currentLevel < qty) { toast({ title: 'Estoque insuficiente', variant: 'destructive' }); return; }
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
      await logAudit({ entity: 'stock', entityId: qmItem.id, action: 'stock.movement', tenantId: currentTenantId, diff: { type: qmType, qty, item_name: qmItem.name, reference: qmRef || null } });
      toast({ title: qmType === 'in' ? `+${qty} entrada registrada` : `-${qty} saída registrada` });
      setQmOpen(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally { setQmLoading(false); }
  };

  // Export CSV
  const exportCSV = () => {
    const header = 'Nome;SKU;Unidade;Quantidade Atual;Nível Mínimo';
    const rows = filteredItems.map((i: any) =>
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
    toast({ title: `Exportação concluída!`, description: `${filteredItems.length} item(ns) exportado(s).` });
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

  // Import CSV with progress
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTenantId) return;
    setImporting(true);
    setImportProgress(0);
    setImportTotal(0);
    try {
      // Read file with proper encoding for accented characters
      const buffer = await file.arrayBuffer();
      let text = new TextDecoder('utf-8').decode(buffer);
      // If UTF-8 produces replacement chars, re-decode as Windows-1252 (Excel default)
      if (text.includes('\uFFFD')) {
        text = new TextDecoder('windows-1252').decode(buffer);
      }
      // Remove BOM if present
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) throw new Error('Arquivo vazio ou sem dados');
      const dataLines = lines.slice(1);
      const total = dataLines.length;
      setImportTotal(total);
      let created = 0;
      let skipped = 0;

      // Batch insert: process in chunks of 50
      const BATCH = 50;
      const existingNames = new Set(items.map((i: any) => i.name.toLowerCase()));
      const existingSkus = new Set(items.filter((i: any) => i.sku).map((i: any) => i.sku!.toLowerCase()));
      const toInsert: any[] = [];

      for (let idx = 0; idx < dataLines.length; idx++) {
        const line = dataLines[idx];
        // Support both ; and , as delimiter
        const delimiter = line.includes(';') ? ';' : ',';
        const parts = line.split(delimiter).map(p => p.trim().replace(/^"|"$/g, ''));
        const itemName = parts[0];
        if (!itemName) { skipped++; setImportProgress(idx + 1); continue; }
        const itemSku = parts[1] || '';
        const itemUnit = parts[2] || 'un';
        const itemQty = parseInt(parts[3]) || 0;
        const itemMin = parseInt(parts[4]) || 0;

        if (existingNames.has(itemName.toLowerCase()) || (itemSku && existingSkus.has(itemSku.toLowerCase()))) {
          skipped++;
          setImportProgress(idx + 1);
          continue;
        }
        // Track to avoid duplicates within same file
        existingNames.add(itemName.toLowerCase());
        if (itemSku) existingSkus.add(itemSku.toLowerCase());

        toInsert.push({
          tenant_id: currentTenantId,
          name: itemName, sku: itemSku || null, unit: itemUnit,
          current_level: itemQty, min_level: itemMin,
        });
      }

      // Insert in batches
      for (let i = 0; i < toInsert.length; i += BATCH) {
        const batch = toInsert.slice(i, i + BATCH);
        const { error } = await (supabase.from as any)('stock_items').insert(batch);
        if (error) {
          // Fallback: insert one by one
          for (const item of batch) {
            const { error: singleErr } = await (supabase.from as any)('stock_items').insert(item);
            if (singleErr) skipped++; else created++;
          }
        } else {
          created += batch.length;
        }
        setImportProgress(Math.min(dataLines.length, (skipped + created)));
      }

      qc.invalidateQueries({ queryKey: ['stock_items'] });
      toast({
        title: 'Importação concluída!',
        description: `${created} criado(s)${skipped > 0 ? `, ${skipped} ignorado(s)` : ''}`,
      });
    } catch (err: any) {
      toast({ title: 'Erro na importação', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
      setImportProgress(0);
      setImportTotal(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Pagination component
  const PaginationBar = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between px-1 py-2">
        <span className="text-xs text-muted-foreground">
          {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filteredItems.length)} de {filteredItems.length}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(1)}>
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs px-2 font-medium">{page} / {totalPages}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 min-w-0">
      {/* Import Progress Overlay */}
      {importing && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-[340px] space-y-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <div>
              <p className="text-sm font-semibold">Importando estoque...</p>
              <p className="text-xs text-muted-foreground mt-1">
                {importProgress} / {importTotal} itens processados
              </p>
            </div>
            <Progress value={importTotal > 0 ? (importProgress / importTotal) * 100 : 0} className="h-2" />
            <p className="text-lg font-bold text-primary">
              {importTotal > 0 ? Math.round((importProgress / importTotal) * 100) : 0}%
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Estoque</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{filteredItems.length} item(ns)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={downloadTemplate}>
            <FileDown className="h-3.5 w-3.5" /> Modelo
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload className="h-3.5 w-3.5" /> Importar
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
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novo Item de Estoque</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5"><Label className="text-xs">Nome *</Label><Input value={name} onChange={e => setName(e.target.value)} required className="h-9" placeholder="Ex: Memória RAM DDR4 8GB" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">SKU</Label><Input value={sku} onChange={e => setSku(e.target.value)} className="h-9" placeholder="Ex: SKU-001" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Patrimônio</Label><Input value={patrimonyCode} onChange={e => setPatrimonyCode(e.target.value)} className="h-9" placeholder="Ex: PAT-2024-001" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">Marca</Label><Input value={brand} onChange={e => setBrand(e.target.value)} className="h-9" placeholder="Ex: Kingston, Intel" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Modelo</Label><Input value={model} onChange={e => setModel(e.target.value)} className="h-9" placeholder="Ex: KVR32N22S8/8" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo / Categoria</Label>
                    <Select value={componentType} onValueChange={setComponentType}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpu">Processador (CPU)</SelectItem>
                        <SelectItem value="ram">Memória RAM</SelectItem>
                        <SelectItem value="hd">HD / Disco Rígido</SelectItem>
                        <SelectItem value="ssd">SSD</SelectItem>
                        <SelectItem value="monitor">Monitor</SelectItem>
                        <SelectItem value="mouse">Mouse</SelectItem>
                        <SelectItem value="teclado">Teclado</SelectItem>
                        <SelectItem value="fonte">Fonte de Alimentação</SelectItem>
                        <SelectItem value="placa_mae">Placa-Mãe</SelectItem>
                        <SelectItem value="placa_video">Placa de Vídeo</SelectItem>
                        <SelectItem value="notebook">Notebook</SelectItem>
                        <SelectItem value="impressora">Impressora</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Nº de Série</Label><Input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} className="h-9" placeholder="S/N do item" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">Unidade</Label><Input value={unit} onChange={e => setUnit(e.target.value)} className="h-9" placeholder="un, pc, m..." /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Qtd. Inicial</Label><Input type="number" min="0" value={initialQty} onChange={e => setInitialQty(e.target.value)} className="h-9" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Nível Mín.</Label><Input type="number" min="0" value={minLevel} onChange={e => setMinLevel(e.target.value)} className="h-9" /></div>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Descrição</Label><Input value={description} onChange={e => setDescription(e.target.value)} className="h-9" placeholder="Detalhes adicionais do item..." /></div>
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

      {/* Selection bar */}
      {someSelected && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-md px-3 py-2">
          <span className="text-xs font-medium text-primary">{selectedIds.size} selecionado(s)</span>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={clearSelection}>
            <X className="h-3 w-3" /> Limpar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="h-7 text-xs gap-1" disabled={bulkDeleting}>
                {bulkDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Excluir selecionados
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir {selectedIds.size} item(ns)?</AlertDialogTitle>
                <AlertDialogDescription>
                  Todos os itens selecionados e suas movimentações serão excluídos permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleBulkDelete}>
                  Excluir {selectedIds.size} item(ns)
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
              <SelectTrigger className="h-8 w-[170px] text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="descartado">Descartado</SelectItem>
                <SelectItem value="low">Estoque Baixo</SelectItem>
                <SelectItem value="normal">Nível Normal</SelectItem>
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
              {paginatedItems.map((item: any) => {
                const isLow = (item.current_level || 0) <= (item.min_level || 0) && item.min_level > 0;
                const isSelected = selectedIds.has(item.id);
                return (
                  <div key={item.id} className={`bg-card border rounded-md p-3 ${isSelected ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                    <div className="flex items-start gap-2">
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(item.id)} className="mt-0.5" />
                      <div className="flex-1 min-w-0" onClick={() => setDetailItem(item)}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            {item.sku && <p className="text-[11px] text-muted-foreground mt-0.5">SKU: {item.sku}</p>}
                          </div>
                          <Badge variant="outline" className={`text-[10px] h-5 shrink-0 ${item.status === 'descartado' ? 'bg-muted text-muted-foreground' : item.status === 'inativo' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : isLow ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
                            {item.status === 'descartado' ? 'Descartado' : item.status === 'inativo' ? 'Inativo' : isLow ? 'Baixo' : 'Ativo'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>Atual: <strong className="text-foreground">{item.current_level}</strong> {item.unit || 'un'}</span>
                            <span>Mín: {item.min_level}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
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
              <PaginationBar />
            </div>
          ) : (
            <div className="bg-card border border-border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40px]">
                      <Checkbox checked={allOnPageSelected} onCheckedChange={toggleSelectAll} />
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Nome</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[90px]">SKU</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[100px]">Patrimônio</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[120px]">Marca / Modelo</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[80px]">Unid.</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[100px]">Nível Atual</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[100px]">Nível Mín.</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[80px]">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item: any) => {
                    const isLow = (item.current_level || 0) <= (item.min_level || 0) && item.min_level > 0;
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <TableRow key={item.id} className={`cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(item.id)} />
                        </TableCell>
                        <TableCell className="text-sm font-medium" onClick={() => setDetailItem(item)}>{item.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.sku || '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{item.patrimony_code || '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.brand || item.model ? `${item.brand || ''} ${item.model || ''}`.trim() : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.unit || 'un'}</TableCell>
                        <TableCell className="text-sm font-medium">{item.current_level}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.min_level}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[11px] ${item.status === 'descartado' ? 'bg-muted text-muted-foreground' : item.status === 'inativo' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : isLow ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
                            {item.status === 'descartado' ? 'Descartado' : item.status === 'inativo' ? 'Inativo' : isLow ? 'Baixo' : 'Ativo'}
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
              <PaginationBar />
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
                type="number" min="1" value={qmQty} onChange={e => setQmQty(e.target.value)}
                className="h-10 text-lg text-center font-semibold" autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleQuickMove(); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Observação (opcional)</Label>
              <Input value={qmRef} onChange={e => setQmRef(e.target.value)} className="h-9" placeholder="Ex: NF-12345, Manutenção preventiva..." />
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
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className={`text-[10px] ml-1 ${detailItem.status === 'descartado' ? 'bg-muted text-muted-foreground' : detailItem.status === 'inativo' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>{detailItem.status === 'descartado' ? 'Descartado' : detailItem.status === 'inativo' ? 'Inativo' : 'Ativo'}</Badge></div>
                {detailItem.sku && <div><span className="text-muted-foreground">SKU:</span> {detailItem.sku}</div>}
                {detailItem.patrimony_code && <div><span className="text-muted-foreground">Patrimônio:</span> <span className="font-mono">{detailItem.patrimony_code}</span></div>}
                {detailItem.brand && <div><span className="text-muted-foreground">Marca:</span> {detailItem.brand}</div>}
                {detailItem.model && <div><span className="text-muted-foreground">Modelo:</span> {detailItem.model}</div>}
                {detailItem.serial_number && <div><span className="text-muted-foreground">Nº Série:</span> <span className="font-mono">{detailItem.serial_number}</span></div>}
                {detailItem.component_type && <div><span className="text-muted-foreground">Tipo:</span> {detailItem.component_type}</div>}
              </div>
              {detailItem.description && <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">{detailItem.description}</p>}
              <p className="text-[10px] text-muted-foreground/60 font-mono">ID: {detailItem.id}</p>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => {
                  setEditName(detailItem.name);
                  setEditSku(detailItem.sku || '');
                  setEditUnit(detailItem.unit || 'un');
                  setEditMinLevel(String(detailItem.min_level || 0));
                  setEditCurrentLevel(String(detailItem.current_level || 0));
                  setEditBrand(detailItem.brand || '');
                  setEditModel(detailItem.model || '');
                  setEditComponentType(detailItem.component_type || '');
                  setEditPatrimonyCode(detailItem.patrimony_code || '');
                  setEditDescription(detailItem.description || '');
                  setEditSerialNumber(detailItem.serial_number || '');
                  setEditStatus(detailItem.status || 'ativo');
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
                          await logAudit({ entity: 'stock', entityId: detailItem.id, action: 'stock.deleted', tenantId: currentTenantId, diff: { name: detailItem.name, sku: detailItem.sku } });
                          toast({ title: 'Item excluído!' });
                          setDetailItem(null);
                        } catch (err: any) {
                          toast({ title: 'Erro ao excluir', description: friendlyErrorMessage(err, 'Erro ao excluir item.'), variant: 'destructive' });
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
                  brand: editBrand || null, model: editModel || null,
                  component_type: editComponentType || null, patrimony_code: editPatrimonyCode || null,
                  description: editDescription || null, serial_number: editSerialNumber || null,
                  status: editStatus,
                });
                await logAudit({ entity: 'stock', entityId: detailItem.id, action: 'stock.updated', tenantId: currentTenantId, diff: { name: editName, sku: editSku, min_level: editMinLevel, status: editStatus } });
                toast({ title: 'Item atualizado!' });
                setDetailItem({ ...detailItem, name: editName, sku: editSku, unit: editUnit, min_level: parseInt(editMinLevel) || 0, current_level: parseInt(editCurrentLevel) || 0, brand: editBrand, model: editModel, component_type: editComponentType, patrimony_code: editPatrimonyCode, description: editDescription, serial_number: editSerialNumber, status: editStatus });
                setEditMode(false);
              } catch (err: any) {
                toast({ title: 'Erro', description: err.message, variant: 'destructive' });
              }
            }} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-1.5"><Label className="text-xs">Nome *</Label><Input value={editName} onChange={e => setEditName(e.target.value)} required className="h-9" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">SKU</Label><Input value={editSku} onChange={e => setEditSku(e.target.value)} className="h-9" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Patrimônio</Label><Input value={editPatrimonyCode} onChange={e => setEditPatrimonyCode(e.target.value)} className="h-9" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Marca</Label><Input value={editBrand} onChange={e => setEditBrand(e.target.value)} className="h-9" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Modelo</Label><Input value={editModel} onChange={e => setEditModel(e.target.value)} className="h-9" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Nº Série</Label><Input value={editSerialNumber} onChange={e => setEditSerialNumber(e.target.value)} className="h-9" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Unidade</Label><Input value={editUnit} onChange={e => setEditUnit(e.target.value)} className="h-9" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Quantidade atual</Label><Input type="number" min="0" value={editCurrentLevel} onChange={e => setEditCurrentLevel(e.target.value)} className="h-9" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Nível mínimo</Label><Input type="number" min="0" value={editMinLevel} onChange={e => setEditMinLevel(e.target.value)} className="h-9" /></div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="descartado">Descartado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Descrição</Label><Input value={editDescription} onChange={e => setEditDescription(e.target.value)} className="h-9" /></div>
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

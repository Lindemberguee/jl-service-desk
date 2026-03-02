import { useState, useMemo } from 'react';
import { logAudit } from '@/lib/audit';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantQuery } from '@/hooks/useTenantQuery';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { ScrollArea } from '@/components/ui/scroll-area';

import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Package, Plus, Search, ChevronLeft, ChevronRight,
  ArrowUpCircle, ArrowDownCircle, TrendingUp, Calendar,
  Download, Loader2, Check,
  ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

const MONTHS_TO_SHOW = 6;
const PAGE_SIZE = 50;

interface StockItem {
  id: string;
  name: string;
  sku: string | null;
  current_level: number | null;
  min_level: number | null;
  unit: string | null;
  tenant_id: string;
}

interface StockMovement {
  id: string;
  stock_item_id: string;
  type: 'in' | 'out' | 'adjust';
  qty: number;
  created_at: string;
  reference: string | null;
  tenant_id: string;
}

function getMonthRange(baseDate: Date, count: number) {
  const months: Date[] = [];
  for (let i = 0; i < count; i++) months.push(addMonths(baseDate, i));
  return months;
}

function monthKey(d: Date) { return format(d, 'yyyy-MM'); }
function monthLabel(d: Date) { return format(d, 'MMMM', { locale: ptBR }); }

export default function MaterialControl() {
  const { currentTenantId } = useAuth();
  const queryClient = useQueryClient();


  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [baseDate, setBaseDate] = useState(() => startOfMonth(new Date()));
  const [page, setPage] = useState(1);
  const [txFilter, setTxFilter] = useState<'all' | 'any' | 'in' | 'out'>('all');

  // Movement dialog
  const [addMovOpen, setAddMovOpen] = useState(false);
  const [movItemId, setMovItemId] = useState('');
  const [movType, setMovType] = useState<'in' | 'out'>('in');
  const [movQty, setMovQty] = useState('');
  const [movRef, setMovRef] = useState('');
  const [movMonth, setMovMonth] = useState(() => monthKey(new Date()));
  const [saving, setSaving] = useState(false);
  const [itemComboOpen, setItemComboOpen] = useState(false);



  const months = useMemo(() => getMonthRange(baseDate, MONTHS_TO_SHOW), [baseDate]);
  const rangeStart = months[0];
  const rangeEnd = endOfMonth(months[months.length - 1]);

  const { data: items = [] } = useTenantQuery<StockItem>('stock_items_mc', 'stock_items', {
    select: 'id, name, sku, current_level, min_level, unit, tenant_id',
    orderBy: 'name',
  });

  const { data: movements = [] } = useQuery({
    queryKey: ['stock_movements_mc', currentTenantId, rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const { data, error } = await supabase
        .from('stock_movements')
        .select('id, stock_item_id, type, qty, created_at, reference, tenant_id')
        .eq('tenant_id', currentTenantId)
        .gte('created_at', rangeStart.toISOString())
        .lte('created_at', rangeEnd.toISOString());
      if (error) throw error;
      return (data || []) as StockMovement[];
    },
    enabled: !!currentTenantId,
  });

  // Build set of item IDs that have movements in range, by type
  const itemsWithMovements = useMemo(() => {
    const anySet = new Set<string>();
    const inSet = new Set<string>();
    const outSet = new Set<string>();
    for (const m of movements) {
      anySet.add(m.stock_item_id);
      if (m.type === 'in') inSet.add(m.stock_item_id);
      if (m.type === 'out') outSet.add(m.stock_item_id);
    }
    return { any: anySet, in: inSet, out: outSet };
  }, [movements]);

  // Filter + debounce + transaction filter
  const filteredItems = useMemo(() => {
    return items.filter(i => {
      // Search
      if (debouncedSearch.trim()) {
        const s = debouncedSearch.toLowerCase();
        if (!i.name.toLowerCase().includes(s) && !i.sku?.toLowerCase().includes(s)) return false;
      }
      // Transaction filter
      if (txFilter === 'any' && !itemsWithMovements.any.has(i.id)) return false;
      if (txFilter === 'in' && !itemsWithMovements.in.has(i.id)) return false;
      if (txFilter === 'out' && !itemsWithMovements.out.has(i.id)) return false;
      return true;
    });
  }, [items, debouncedSearch, txFilter, itemsWithMovements]);

  // Reset page on filter change
  useMemo(() => { setPage(1); }, [debouncedSearch, txFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  // Pivot
  const pivot = useMemo(() => {
    const map: Record<string, Record<string, { in: number; out: number; total: number }>> = {};
    for (const item of items) {
      map[item.id] = {};
      for (const m of months) map[item.id][monthKey(m)] = { in: 0, out: 0, total: 0 };
    }
    for (const mov of movements) {
      const mk = monthKey(parseISO(mov.created_at));
      if (map[mov.stock_item_id]?.[mk]) {
        if (mov.type === 'in') map[mov.stock_item_id][mk].in += mov.qty;
        else if (mov.type === 'out') map[mov.stock_item_id][mk].out += Math.abs(mov.qty);
        else {
          if (mov.qty >= 0) map[mov.stock_item_id][mk].in += mov.qty;
          else map[mov.stock_item_id][mk].out += Math.abs(mov.qty);
        }
        map[mov.stock_item_id][mk].total = map[mov.stock_item_id][mk].in - map[mov.stock_item_id][mk].out;
      }
    }
    return map;
  }, [items, movements, months]);


  // Add movement
  const handleAddMovement = async () => {
    if (!movItemId || !movQty || !currentTenantId) return;
    setSaving(true);
    try {
      const qty = parseInt(movQty);
      if (isNaN(qty) || qty <= 0) { toast.error('Quantidade inválida'); return; }
      const [y, m] = movMonth.split('-').map(Number);
      const movDate = new Date(y, m - 1, 15, 12, 0, 0);
      const { error } = await supabase.from('stock_movements').insert({
        stock_item_id: movItemId,
        tenant_id: currentTenantId,
        type: movType,
        qty: movType === 'out' ? -qty : qty,
        reference: movRef || null,
        created_at: movDate.toISOString(),
      });
      if (error) throw error;
      const item = items.find(i => i.id === movItemId);
      if (item) {
        const newLevel = (item.current_level || 0) + (movType === 'in' ? qty : -qty);
        await supabase.from('stock_items').update({ current_level: newLevel }).eq('id', movItemId);
      }
      await logAudit({ entity: 'stock', entityId: movItemId, action: 'stock.movement', tenantId: currentTenantId, diff: { type: movType, qty, month: movMonth, reference: movRef || null, source: 'material_control' } });
      toast.success('Movimentação registrada');
      queryClient.invalidateQueries({ queryKey: ['stock_movements_mc'] });
      queryClient.invalidateQueries({ queryKey: ['stock_items_mc'] });
      setAddMovOpen(false);
      setMovItemId(''); setMovQty(''); setMovRef(''); setItemComboOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar');
    } finally { setSaving(false); }
  };

  // Export CSV
  const handleExportCSV = () => {
    const header = ['Item', 'SKU', ...months.flatMap(m => {
      const label = monthLabel(m).charAt(0).toUpperCase() + monthLabel(m).slice(1);
      return [`${label} - Entrada`, `${label} - Saída`, `${label} - Total`];
    }), 'Saldo Atual'];
    const rows = filteredItems.map(item => {
      const cols: (string | number)[] = [item.name, item.sku || ''];
      for (const m of months) {
        const d = pivot[item.id]?.[monthKey(m)] || { in: 0, out: 0, total: 0 };
        cols.push(d.in, d.out, d.total);
      }
      cols.push(item.current_level || 0);
      return cols;
    });
    const csv = '\uFEFF' + [header.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `controle-materiais-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${filteredItems.length} item(ns) exportado(s)`);
  };


  // Stats
  const totalIn = movements.filter(m => m.type === 'in').reduce((s, m) => s + m.qty, 0);
  const totalOut = movements.filter(m => m.type === 'out').reduce((s, m) => s + Math.abs(m.qty), 0);

  return (
    <div className="space-y-6 min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Controle de Materiais</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão mensal de entradas, saídas e saldo — {items.length} itens
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> Exportar
          </Button>
          <Dialog open={addMovOpen} onOpenChange={setAddMovOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Movimentação</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Movimentação</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Item *</Label>
                  <Popover open={itemComboOpen} onOpenChange={setItemComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={itemComboOpen}
                        className="w-full justify-between font-normal h-10"
                      >
                        {movItemId
                          ? items.find(i => i.id === movItemId)?.name || 'Item selecionado'
                          : 'Buscar e selecionar item...'}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Digite para buscar..." />
                        <CommandList>
                          <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                          <CommandGroup>
                            {items.map(i => (
                              <CommandItem
                                key={i.id}
                                value={`${i.name} ${i.sku || ''}`}
                                onSelect={() => {
                                  setMovItemId(i.id);
                                  setItemComboOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", movItemId === i.id ? "opacity-100" : "opacity-0")} />
                                <div className="flex flex-col">
                                  <span>{i.name}</span>
                                  {i.sku && <span className="text-xs text-muted-foreground">{i.sku}</span>}
                                </div>
                                <Badge variant="secondary" className="ml-auto text-xs font-mono">
                                  {i.current_level || 0}
                                </Badge>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <Select value={movType} onValueChange={v => setMovType(v as 'in' | 'out')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">Entrada</SelectItem>
                        <SelectItem value="out">Saída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Quantidade</Label>
                    <Input type="number" min={1} value={movQty} onChange={e => setMovQty(e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Mês de Referência</Label>
                  <Select value={movMonth} onValueChange={setMovMonth}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {months.map(m => (
                        <SelectItem key={monthKey(m)} value={monthKey(m)}>
                          {monthLabel(m).charAt(0).toUpperCase() + monthLabel(m).slice(1)} {format(m, 'yyyy')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Referência / Observação</Label>
                  <Input value={movRef} onChange={e => setMovRef(e.target.value)} placeholder="Ex: OS-2025-000123" />
                </div>
                {movItemId && movQty && parseInt(movQty) > 0 && (() => {
                  const selectedItem = items.find(i => i.id === movItemId);
                  if (!selectedItem) return null;
                  const currentLevel = selectedItem.current_level || 0;
                  const qty = parseInt(movQty);
                  const projected = movType === 'in' ? currentLevel + qty : currentLevel - qty;
                  return (
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Saldo atual</span>
                        <span className="font-mono font-medium">{currentLevel}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{movType === 'in' ? 'Entrada' : 'Saída'}</span>
                        <span className={cn("font-mono font-medium", movType === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                          {movType === 'in' ? '+' : '-'}{qty}
                        </span>
                      </div>
                      <div className="border-t border-border/50 pt-1 flex justify-between text-xs">
                        <span className="font-medium">Saldo projetado</span>
                        <span className={cn("font-mono font-bold", projected < 0 ? 'text-destructive' : '')}>
                          {projected}
                        </span>
                      </div>
                      {projected < 0 && (
                        <p className="text-[11px] text-destructive">⚠ Saldo ficará negativo</p>
                      )}
                    </div>
                  );
                })()}
                <Button className="w-full" onClick={handleAddMovement} disabled={saving || !movItemId || !movQty}>
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</> : 'Registrar Movimentação'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div><p className="text-xs text-muted-foreground">Itens</p><p className="text-xl font-bold">{items.length}</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div><p className="text-xs text-muted-foreground">Entradas</p><p className="text-xl font-bold">{totalIn}</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <ArrowDownCircle className="h-5 w-5 text-destructive" />
            </div>
            <div><p className="text-xs text-muted-foreground">Saídas</p><p className="text-xl font-bold">{totalOut}</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-500" />
            </div>
            <div><p className="text-xs text-muted-foreground">Saldo Líquido</p><p className="text-xl font-bold">{totalIn - totalOut}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar item..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg" />
        </div>
        <Select value={txFilter} onValueChange={v => setTxFilter(v as any)}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os itens</SelectItem>
            <SelectItem value="any">Com movimentação</SelectItem>
            <SelectItem value="in">Somente entradas</SelectItem>
            <SelectItem value="out">Somente saídas</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBaseDate(prev => subMonths(prev, MONTHS_TO_SHOW))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1.5 px-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {format(months[0], 'MMM yyyy', { locale: ptBR })} — {format(months[months.length - 1], 'MMM yyyy', { locale: ptBR })}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBaseDate(prev => addMonths(prev, MONTHS_TO_SHOW))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

      </div>

      {/* Pagination top */}
      <PaginationBar page={page} totalPages={totalPages} total={filteredItems.length} setPage={setPage} />

      {/* Table */}
      <Card className="rounded-xl border-border/50 overflow-hidden max-w-full">
        <div className="overflow-x-auto max-w-full">
          <table className="text-sm w-full min-w-[900px]">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-2 font-semibold sticky left-0 bg-muted/30 z-10 min-w-[160px]">Item</th>
                {months.map(m => (
                  <th key={monthKey(m)} colSpan={3} className="text-center px-1 py-2 font-semibold border-l border-border/30 text-xs">
                    <span className="capitalize">{monthLabel(m)}</span>
                    <span className="text-muted-foreground font-normal ml-0.5">{format(m, 'yy')}</span>
                  </th>
                ))}
                <th className="text-center px-2 py-2 font-semibold border-l border-border/30 w-[60px] text-xs">Saldo</th>
              </tr>
              <tr className="border-b bg-muted/20 text-xs text-muted-foreground">
                <th className="sticky left-0 bg-muted/20 z-10 p-1.5" />
                {months.map(m => <MonthSubHeader key={monthKey(m)} />)}
                <th className="p-1.5 text-center border-l border-border/30">Atual</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={months.length * 3 + 2} className="text-center py-12 text-muted-foreground">
                    Nenhum item encontrado
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => {
                  const isLow = (item.current_level || 0) <= (item.min_level || 0) && (item.min_level || 0) > 0;
                  return (
                    <tr key={item.id} className={cn(
                      "border-b border-border/20 hover:bg-muted/20 transition-colors",
                      idx % 2 === 0 && "bg-muted/5",
                    )}>
                      <td className="p-3 sticky left-0 bg-card z-10">
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[200px]">{item.name}</span>
                          {item.sku && <span className="text-xs text-muted-foreground">{item.sku}</span>}
                        </div>
                      </td>
                      {months.map(m => {
                        const d = pivot[item.id]?.[monthKey(m)] || { in: 0, out: 0, total: 0 };
                        return <MonthCells key={monthKey(m)} data={d} />;
                      })}
                      <td className="p-2 text-center border-l border-border/30">
                        <Badge variant={isLow ? 'destructive' : 'secondary'} className="font-mono text-xs">
                          {item.current_level || 0}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination bottom */}
      <PaginationBar page={page} totalPages={totalPages} total={filteredItems.length} setPage={setPage} />
    </div>
  );
}

function PaginationBar({ page, totalPages, total, setPage }: { page: number; totalPages: number; total: number; setPage: (p: number | ((p: number) => number)) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-1 py-1">
      <span className="text-xs text-muted-foreground">
        {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(1)}><ChevronsLeft className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
        <span className="text-xs px-2 font-medium">{page} / {totalPages}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(totalPages)}><ChevronsRight className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

function MonthSubHeader() {
  return (
    <>
      <th className="px-1 py-1.5 text-center border-l border-border/30 w-[42px]">Ent.</th>
      <th className="px-1 py-1.5 text-center w-[42px]">Saída</th>
      <th className="px-1 py-1.5 text-center w-[42px]">Total</th>
    </>
  );
}

function MonthCells({ data }: { data: { in: number; out: number; total: number } }) {
  return (
    <>
      <td className="px-1 py-2 text-center border-l border-border/30 tabular-nums text-xs">
        {data.in > 0 ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">{data.in}</span> : <span className="text-muted-foreground/40">0</span>}
      </td>
      <td className="px-1 py-2 text-center tabular-nums text-xs">
        {data.out > 0 ? <span className="text-destructive font-medium">-{data.out}</span> : <span className="text-muted-foreground/40">0</span>}
      </td>
      <td className="px-1 py-2 text-center tabular-nums text-xs font-semibold">
        {data.total !== 0 ? (
          <span className={data.total > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}>{data.total}</span>
        ) : <span className="text-muted-foreground/40">0</span>}
      </td>
    </>
  );
}

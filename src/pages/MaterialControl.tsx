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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Package, Plus, Search, ChevronLeft, ChevronRight,
  ArrowUpCircle, ArrowDownCircle, TrendingUp, Calendar,
  Download, Loader2, Check,
  ChevronsLeft, ChevronsRight, LayoutGrid, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { registerStockMovement } from '@/lib/stockMovementService';

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

function MetricCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone: 'primary' | 'success' | 'danger' | 'warning' }) {
  const toneMap = {
    primary: 'bg-primary/10 text-primary border-primary/15',
    success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
    danger: 'bg-destructive/10 text-destructive border-destructive/15',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/15',
  } as const;
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`rounded-xl border p-2.5 ${toneMap[tone]}`}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MaterialControl() {
  const { currentTenantId, user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [baseDate, setBaseDate] = useState(() => startOfMonth(new Date()));
  const [page, setPage] = useState(1);
  const [txFilter, setTxFilter] = useState<'all' | 'any' | 'in' | 'out'>('all');

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

  const filteredItems = useMemo(() => {
    return items.filter(i => {
      if (debouncedSearch.trim()) {
        const s = debouncedSearch.toLowerCase();
        if (!i.name.toLowerCase().includes(s) && !i.sku?.toLowerCase().includes(s)) return false;
      }
      if (txFilter === 'any' && !itemsWithMovements.any.has(i.id)) return false;
      if (txFilter === 'in' && !itemsWithMovements.in.has(i.id)) return false;
      if (txFilter === 'out' && !itemsWithMovements.out.has(i.id)) return false;
      return true;
    });
  }, [items, debouncedSearch, txFilter, itemsWithMovements]);

  useMemo(() => { setPage(1); }, [debouncedSearch, txFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const paginatedItems = useMemo(() => filteredItems.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE), [filteredItems, page]);

  const pivot = useMemo(() => {
    const map: Record<string, Record<string, { in: number; out: number; total: number }>> = {};
    for (const item of items) {
      map[item.id] = {};
      for (const m of months) map[item.id][monthKey(m)] = { in: 0, out: 0, total: 0 };
    }
    for (const mov of movements) {
      const mk = monthKey(parseISO(mov.created_at));
      if (map[mov.stock_item_id]?.[mk]) {
        if (mov.type === 'in') map[mov.stock_item_id][mk].in += Math.abs(mov.qty);
        else if (mov.type === 'out') map[mov.stock_item_id][mk].out += Math.abs(mov.qty);
        else {
          if (mov.qty >= 0) map[mov.stock_item_id][mk].in += Math.abs(mov.qty);
          else map[mov.stock_item_id][mk].out += Math.abs(mov.qty);
        }
        map[mov.stock_item_id][mk].total = map[mov.stock_item_id][mk].in - map[mov.stock_item_id][mk].out;
      }
    }
    return map;
  }, [items, movements, months]);

  const handleAddMovement = async () => {
    if (!movItemId || !movQty || !currentTenantId) return;
    setSaving(true);
    try {
      const qty = parseInt(movQty);
      if (isNaN(qty) || qty <= 0) {
        toast.error('Quantidade inválida');
        return;
      }
      const [y, m] = movMonth.split('-').map(Number);
      const movDate = new Date(y, m - 1, 15, 12, 0, 0);

      const result = await registerStockMovement({
        tenantId: currentTenantId,
        stockItemId: movItemId,
        type: movType,
        qty,
        userId: user?.id,
        reference: movRef || null,
        createdAt: movDate.toISOString(),
      });

      await logAudit({
        entity: 'stock',
        entityId: movItemId,
        action: 'stock.movement',
        tenantId: currentTenantId,
        diff: {
          type: movType,
          qty,
          month: movMonth,
          reference: movRef || null,
          source: 'material_control',
          previous_level: result.previousLevel,
          new_level: result.newLevel,
        },
      });

      toast.success('Movimentação registrada');
      queryClient.invalidateQueries({ queryKey: ['stock_movements_mc'] });
      queryClient.invalidateQueries({ queryKey: ['stock_items_mc'] });
      queryClient.invalidateQueries({ queryKey: ['stock_items'] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
      setAddMovOpen(false);
      setMovItemId(''); setMovQty(''); setMovRef(''); setItemComboOpen(false);
    } catch (err: any) {
      if (err?.message === 'INSUFFICIENT_STOCK') toast.error('Estoque insuficiente');
      else toast.error(err.message || 'Erro ao registrar');
    } finally {
      setSaving(false);
    }
  };

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

  const totalIn = movements.filter(m => m.type === 'in').reduce((s, m) => s + Math.abs(m.qty), 0);
  const totalOut = movements.filter(m => m.type === 'out').reduce((s, m) => s + Math.abs(m.qty), 0);
  const activeFilters = (search ? 1 : 0) + (txFilter !== 'all' ? 1 : 0);

  return (
    <div className="space-y-5 min-w-0 overflow-hidden">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/30 p-5 shadow-sm">
        <div className="absolute inset-y-0 right-0 w-48 bg-primary/5 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <LayoutGrid className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Visão analítica de consumo</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">Controle de Materiais</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Acompanhe entradas, saídas e saldo líquido por mês em uma leitura operacional mais clara e comparável.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleExportCSV}><Download className="h-4 w-4" /> Exportar</Button>
            <Dialog open={addMovOpen} onOpenChange={setAddMovOpen}>
              <DialogTrigger asChild><Button size="sm" className="h-9 gap-1.5"><Plus className="h-4 w-4" /> Nova Movimentação</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Registrar Movimentação</DialogTitle><DialogDescription>Registre o evento no mês de referência sem sair da visão analítica.</DialogDescription></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label>Item *</Label>
                    <Popover open={itemComboOpen} onOpenChange={setItemComboOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={itemComboOpen} className="w-full justify-between font-normal h-10">
                          {movItemId ? items.find(i => i.id === movItemId)?.name || 'Item selecionado' : 'Buscar e selecionar item...'}
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
                                <CommandItem key={i.id} value={`${i.name} ${i.sku || ''}`} onSelect={() => { setMovItemId(i.id); setItemComboOpen(false); }}>
                                  <Check className={cn('mr-2 h-4 w-4', movItemId === i.id ? 'opacity-100' : 'opacity-0')} />
                                  <div className="flex flex-col"><span>{i.name}</span>{i.sku && <span className="text-xs text-muted-foreground">{i.sku}</span>}</div>
                                  <Badge variant="secondary" className="ml-auto text-xs font-mono">{i.current_level || 0}</Badge>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Tipo</Label><Select value={movType} onValueChange={v => setMovType(v as 'in' | 'out')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="in">Entrada</SelectItem><SelectItem value="out">Saída</SelectItem></SelectContent></Select></div>
                    <div className="space-y-1.5"><Label>Quantidade</Label><Input type="number" min={1} value={movQty} onChange={e => setMovQty(e.target.value)} placeholder="0" /></div>
                  </div>
                  <div className="space-y-1.5"><Label>Mês de Referência</Label><Select value={movMonth} onValueChange={setMovMonth}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{months.map(m => <SelectItem key={monthKey(m)} value={monthKey(m)}>{monthLabel(m).charAt(0).toUpperCase() + monthLabel(m).slice(1)} {format(m, 'yyyy')}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><Label>Referência / Observação</Label><Input value={movRef} onChange={e => setMovRef(e.target.value)} placeholder="Ex: OS-2025-000123" /></div>
                  {movItemId && movQty && parseInt(movQty) > 0 && (() => {
                    const selectedItem = items.find(i => i.id === movItemId);
                    if (!selectedItem) return null;
                    const currentLevel = selectedItem.current_level || 0;
                    const qty = parseInt(movQty);
                    const projected = movType === 'in' ? currentLevel + qty : currentLevel - qty;
                    return (
                      <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1">
                        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Saldo atual</span><span className="font-mono font-medium">{currentLevel}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-muted-foreground">{movType === 'in' ? 'Entrada' : 'Saída'}</span><span className={cn('font-mono font-medium', movType === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>{movType === 'in' ? '+' : '-'}{qty}</span></div>
                        <div className="border-t border-border/50 pt-1 flex justify-between text-xs"><span className="font-medium">Saldo projetado</span><span className={cn('font-mono font-bold', projected < 0 ? 'text-destructive' : '')}>{projected}</span></div>
                        {projected < 0 && <p className="text-[11px] text-destructive">⚠ Saldo ficará negativo</p>}
                      </div>
                    );
                  })()}
                  <Button className="w-full" onClick={handleAddMovement} disabled={saving || !movItemId || !movQty}>{saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</> : 'Registrar Movimentação'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={Package} label="Itens" value={items.length} tone="primary" />
        <MetricCard icon={ArrowUpCircle} label="Entradas" value={totalIn} tone="success" />
        <MetricCard icon={ArrowDownCircle} label="Saídas" value={totalOut} tone="danger" />
        <MetricCard icon={TrendingUp} label="Saldo líquido" value={totalIn - totalOut} tone="warning" />
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar item..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg h-10" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={txFilter} onValueChange={v => setTxFilter(v as any)}>
                <SelectTrigger className="w-[180px] h-10 text-sm"><SelectValue placeholder="Filtrar por tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os itens</SelectItem>
                  <SelectItem value="any">Com movimentação</SelectItem>
                  <SelectItem value="in">Somente entradas</SelectItem>
                  <SelectItem value="out">Somente saídas</SelectItem>
                </SelectContent>
              </Select>
              {activeFilters > 0 && <Button variant="ghost" size="sm" className="h-10 gap-1.5" onClick={() => { setSearch(''); setTxFilter('all'); }}><Check className="h-3.5 w-3.5" /> Limpar</Button>}
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBaseDate(prev => subMonths(prev, MONTHS_TO_SHOW))}><ChevronLeft className="h-4 w-4" /></Button>
                <div className="flex items-center gap-1.5 px-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{format(months[0], 'MMM yyyy', { locale: ptBR })} — {format(months[months.length - 1], 'MMM yyyy', { locale: ptBR })}</span></div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBaseDate(prev => addMonths(prev, MONTHS_TO_SHOW))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{filteredItems.length} item(ns) exibido(s)</span>
            <div className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> {activeFilters > 0 ? `${activeFilters} filtro(s) ativo(s)` : 'Leitura consolidada mensal'}</div>
          </div>
        </CardContent>
      </Card>

      <PaginationBar page={page} totalPages={totalPages} total={filteredItems.length} setPage={setPage} />

      <Card className="rounded-xl border-border/60 overflow-hidden max-w-full shadow-sm">
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
                <tr><td colSpan={months.length * 3 + 2} className="text-center py-14 text-muted-foreground"><div className="flex flex-col items-center gap-2"><LayoutGrid className="h-9 w-9 opacity-25" /><p className="text-sm font-medium text-foreground">Nenhum item encontrado</p><p className="text-xs text-muted-foreground">Ajuste os filtros para visualizar a matriz mensal.</p></div></td></tr>
              ) : (
                paginatedItems.map((item, idx) => {
                  const isLow = (item.current_level || 0) <= (item.min_level || 0) && (item.min_level || 0) > 0;
                  return (
                    <tr key={item.id} className={cn('border-b border-border/20 hover:bg-muted/20 transition-colors', idx % 2 === 0 && 'bg-muted/5')}>
                      <td className="p-3 sticky left-0 bg-card z-10"><div className="flex flex-col"><span className="font-medium truncate max-w-[200px]">{item.name}</span>{item.sku && <span className="text-xs text-muted-foreground">{item.sku}</span>}</div></td>
                      {months.map(m => { const d = pivot[item.id]?.[monthKey(m)] || { in: 0, out: 0, total: 0 }; return <MonthCells key={monthKey(m)} data={d} />; })}
                      <td className="p-2 text-center border-l border-border/30"><Badge variant={isLow ? 'destructive' : 'secondary'} className="font-mono text-xs">{item.current_level || 0}</Badge></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <PaginationBar page={page} totalPages={totalPages} total={filteredItems.length} setPage={setPage} />
    </div>
  );
}

function PaginationBar({ page, totalPages, total, setPage }: { page: number; totalPages: number; total: number; setPage: (p: number | ((p: number) => number)) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-1 py-1">
      <span className="text-xs text-muted-foreground">{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}</span>
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
      <td className="px-1 py-2 text-center border-l border-border/30 tabular-nums text-xs">{data.in > 0 ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">{data.in}</span> : <span className="text-muted-foreground/40">0</span>}</td>
      <td className="px-1 py-2 text-center tabular-nums text-xs">{data.out > 0 ? <span className="text-destructive font-medium">-{data.out}</span> : <span className="text-muted-foreground/40">0</span>}</td>
      <td className="px-1 py-2 text-center tabular-nums text-xs font-semibold">{data.total !== 0 ? <span className={data.total > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}>{data.total}</span> : <span className="text-muted-foreground/40">0</span>}</td>
    </>
  );
}

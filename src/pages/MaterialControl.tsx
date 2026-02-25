import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantQuery } from '@/hooks/useTenantQuery';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Package, Plus, Search, ChevronLeft, ChevronRight,
  ArrowUpCircle, ArrowDownCircle, TrendingUp, Calendar,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

const MONTHS_TO_SHOW = 6;

function getMonthRange(baseDate: Date, count: number) {
  const months: Date[] = [];
  for (let i = 0; i < count; i++) {
    months.push(addMonths(baseDate, i));
  }
  return months;
}

function monthKey(d: Date) {
  return format(d, 'yyyy-MM');
}

function monthLabel(d: Date) {
  return format(d, 'MMMM', { locale: ptBR });
}

export default function MaterialControl() {
  const { currentTenantId } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [baseDate, setBaseDate] = useState(() => startOfMonth(new Date()));
  const [addMovOpen, setAddMovOpen] = useState(false);
  const [movItemId, setMovItemId] = useState('');
  const [movType, setMovType] = useState<'in' | 'out'>('in');
  const [movQty, setMovQty] = useState('');
  const [movRef, setMovRef] = useState('');
  const [movMonth, setMovMonth] = useState(() => monthKey(new Date()));
  const [saving, setSaving] = useState(false);

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

  // Build pivot: itemId -> monthKey -> { in, out, total }
  const pivot = useMemo(() => {
    const map: Record<string, Record<string, { in: number; out: number; total: number }>> = {};
    for (const item of items) {
      map[item.id] = {};
      for (const m of months) {
        map[item.id][monthKey(m)] = { in: 0, out: 0, total: 0 };
      }
    }
    for (const mov of movements) {
      const mk = monthKey(parseISO(mov.created_at));
      if (map[mov.stock_item_id]?.[mk]) {
        if (mov.type === 'in') {
          map[mov.stock_item_id][mk].in += mov.qty;
        } else if (mov.type === 'out') {
          map[mov.stock_item_id][mk].out += Math.abs(mov.qty);
        } else {
          // adjust treated as in if positive, out if negative
          if (mov.qty >= 0) map[mov.stock_item_id][mk].in += mov.qty;
          else map[mov.stock_item_id][mk].out += Math.abs(mov.qty);
        }
        map[mov.stock_item_id][mk].total = map[mov.stock_item_id][mk].in - map[mov.stock_item_id][mk].out;
      }
    }
    return map;
  }, [items, movements, months]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const s = search.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(s) || i.sku?.toLowerCase().includes(s));
  }, [items, search]);

  const handleAddMovement = async () => {
    if (!movItemId || !movQty || !currentTenantId) return;
    setSaving(true);
    try {
      const qty = parseInt(movQty);
      if (isNaN(qty) || qty <= 0) { toast.error('Quantidade inválida'); return; }
      
      // Create movement at the middle of the selected month
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

      // Update stock level
      const item = items.find(i => i.id === movItemId);
      if (item) {
        const newLevel = (item.current_level || 0) + (movType === 'in' ? qty : -qty);
        await supabase.from('stock_items').update({ current_level: newLevel }).eq('id', movItemId);
      }

      toast.success('Movimentação registrada');
      queryClient.invalidateQueries({ queryKey: ['stock_movements_mc'] });
      queryClient.invalidateQueries({ queryKey: ['stock_items_mc'] });
      setAddMovOpen(false);
      setMovItemId('');
      setMovQty('');
      setMovRef('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar');
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
    a.href = url;
    a.download = `controle-materiais-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
            Visão mensal de entradas, saídas e saldo de cada item
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Dialog open={addMovOpen} onOpenChange={setAddMovOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Nova Movimentação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Movimentação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Item</Label>
                  <Select value={movItemId} onValueChange={setMovItemId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o item" /></SelectTrigger>
                    <SelectContent>
                      {items.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <Button className="w-full" onClick={handleAddMovement} disabled={saving || !movItemId || !movQty}>
                  {saving ? 'Salvando...' : 'Registrar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Itens Cadastrados</p>
              <p className="text-xl font-bold">{items.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <ArrowUpCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entradas no Período</p>
              <p className="text-xl font-bold">{totalIn}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <ArrowDownCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saídas no Período</p>
              <p className="text-xl font-bold">{totalOut}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo Líquido</p>
              <p className="text-xl font-bold">{totalIn - totalOut}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar item..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 rounded-lg"
          />
        </div>
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

      {/* Table */}
      <Card className="rounded-xl border-border/50 overflow-hidden max-w-full">
        <div className="overflow-x-auto max-w-full">
          <table className="text-sm min-w-max">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-semibold sticky left-0 bg-muted/30 z-10 min-w-[200px]">
                  Item
                </th>
                {months.map(m => (
                  <th key={monthKey(m)} colSpan={3} className="text-center p-2 font-semibold border-l border-border/30">
                    <span className="capitalize">{monthLabel(m)}</span>
                    <span className="text-muted-foreground font-normal ml-1">{format(m, 'yy')}</span>
                  </th>
                ))}
                <th className="text-center p-2 font-semibold border-l border-border/30 min-w-[80px]">Saldo</th>
              </tr>
              <tr className="border-b bg-muted/20 text-xs text-muted-foreground">
                <th className="sticky left-0 bg-muted/20 z-10 p-1.5" />
                {months.map(m => (
                  <MonthSubHeader key={monthKey(m)} />
                ))}
                <th className="p-1.5 text-center border-l border-border/30">Atual</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={months.length * 3 + 2} className="text-center py-12 text-muted-foreground">
                    Nenhum item encontrado
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isLow = (item.current_level || 0) <= (item.min_level || 0) && (item.min_level || 0) > 0;
                  return (
                    <tr key={item.id} className={cn("border-b border-border/20 hover:bg-muted/20 transition-colors", idx % 2 === 0 && "bg-muted/5")}>
                      <td className="p-3 sticky left-0 bg-card z-10">
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[200px]">{item.name}</span>
                          {item.sku && <span className="text-xs text-muted-foreground">{item.sku}</span>}
                        </div>
                      </td>
                      {months.map(m => {
                        const d = pivot[item.id]?.[monthKey(m)] || { in: 0, out: 0, total: 0 };
                        return (
                          <MonthCells key={monthKey(m)} data={d} />
                        );
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
    </div>
  );
}

function MonthSubHeader() {
  return (
    <>
      <th className="p-1.5 text-center border-l border-border/30 min-w-[55px]">Ent.</th>
      <th className="p-1.5 text-center min-w-[55px]">Saída</th>
      <th className="p-1.5 text-center min-w-[55px]">Total</th>
    </>
  );
}

function MonthCells({ data }: { data: { in: number; out: number; total: number } }) {
  return (
    <>
      <td className="p-2 text-center border-l border-border/30 tabular-nums">
        {data.in > 0 ? (
          <span className="text-green-600 dark:text-green-400 font-medium">{data.in}</span>
        ) : (
          <span className="text-muted-foreground/40">0</span>
        )}
      </td>
      <td className="p-2 text-center tabular-nums">
        {data.out > 0 ? (
          <span className="text-red-500 font-medium">-{data.out}</span>
        ) : (
          <span className="text-muted-foreground/40">0</span>
        )}
      </td>
      <td className="p-2 text-center tabular-nums font-semibold">
        {data.total !== 0 ? (
          <span className={data.total > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
            {data.total}
          </span>
        ) : (
          <span className="text-muted-foreground/40">0</span>
        )}
      </td>
    </>
  );
}

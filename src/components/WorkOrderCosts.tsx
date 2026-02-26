import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useTenantQuery } from '@/hooks/useTenantQuery';
import { Plus, Trash2, Wrench, Package, Loader2 } from 'lucide-react';

interface Props {
  workOrder: any;
  canManage: boolean;
}

export function WorkOrderCosts({ workOrder, canManage }: Props) {
  const { currentTenantId, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const woId = workOrder.id;

  const [showLaborDialog, setShowLaborDialog] = useState(false);
  const [showPartDialog, setShowPartDialog] = useState(false);

  // Labor form state
  const [laborDesc, setLaborDesc] = useState('');
  const [laborHours, setLaborHours] = useState('');
  const [laborRate, setLaborRate] = useState('');
  const [laborObs, setLaborObs] = useState('');

  // Part form state
  const [partDesc, setPartDesc] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [partPrice, setPartPrice] = useState('');
  const [partObs, setPartObs] = useState('');
  const [partStockItemId, setPartStockItemId] = useState<string>('none');

  // Queries
  const { data: laborItems = [], isLoading: loadingLabor } = useQuery({
    queryKey: ['wo_labor', woId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)('work_order_labor_items')
        .select('*')
        .eq('work_order_id', woId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: partItems = [], isLoading: loadingParts } = useQuery({
    queryKey: ['wo_parts', woId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)('work_order_part_items')
        .select('*')
        .eq('work_order_id', woId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: stockItems = [] } = useTenantQuery<any>('stock_items', 'stock_items');

  const invalidateCosts = () => {
    qc.invalidateQueries({ queryKey: ['wo_labor', woId] });
    qc.invalidateQueries({ queryKey: ['wo_parts', woId] });
    qc.invalidateQueries({ queryKey: ['work_order', woId] });
    qc.invalidateQueries({ queryKey: ['work_orders'] });
  };

  // Add labor
  const addLaborMut = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from as any)('work_order_labor_items').insert({
        tenant_id: currentTenantId,
        work_order_id: woId,
        description: laborDesc,
        hours: parseFloat(laborHours) || 0,
        rate_per_hour: parseFloat(laborRate) || 0,
        observation: laborObs || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCosts();
      setShowLaborDialog(false);
      setLaborDesc(''); setLaborHours(''); setLaborRate(''); setLaborObs('');
      toast({ title: 'Serviço de terceiro lançado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  // Add part
  const addPartMut = useMutation({
    mutationFn: async () => {
      const stockId = partStockItemId !== 'none' ? partStockItemId : null;
      const qty = parseFloat(partQty) || 1;
      
      // Insert the part item
      const { error } = await (supabase.from as any)('work_order_part_items').insert({
        tenant_id: currentTenantId,
        work_order_id: woId,
        stock_item_id: stockId,
        description: partDesc,
        qty,
        unit_price: parseFloat(partPrice) || 0,
        observation: partObs || null,
        created_by: user?.id,
      });
      if (error) throw error;

      // Create stock movement OUT if linked to stock
      if (stockId && currentTenantId) {
        await supabase.from('stock_movements').insert({
          tenant_id: currentTenantId,
          stock_item_id: stockId,
          work_order_id: woId,
          type: 'out' as any,
          qty: Math.round(qty),
          reference: `OS ${workOrder.code}`,
          created_by: user?.id,
        });
        // Update stock level
        const item = stockItems.find((s: any) => s.id === stockId);
        if (item) {
          await (supabase.from as any)('stock_items')
            .update({ current_level: Math.max(0, (item.current_level || 0) - Math.round(qty)) })
            .eq('id', stockId);
        }
      }
    },
    onSuccess: () => {
      invalidateCosts();
      qc.invalidateQueries({ queryKey: ['stock_items'] });
      setShowPartDialog(false);
      setPartDesc(''); setPartQty('1'); setPartPrice(''); setPartObs(''); setPartStockItemId('none');
      toast({ title: 'Peça lançada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  // Delete
  const deleteLaborMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)('work_order_labor_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateCosts(); toast({ title: 'Item removido' }); },
  });

  const deletePartMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)('work_order_part_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateCosts(); toast({ title: 'Item removido' }); },
  });

  const totalLabor = laborItems.reduce((s: number, i: any) => s + (i.hours * i.rate_per_hour), 0);
  const totalParts = partItems.reduce((s: number, i: any) => s + (i.qty * i.unit_price), 0);
  const grandTotal = totalLabor + totalParts;

  // Auto-fill from stock
  const handleStockSelect = (stockId: string) => {
    setPartStockItemId(stockId);
    if (stockId !== 'none') {
      const item = stockItems.find((s: any) => s.id === stockId);
      if (item) {
        setPartDesc(item.name);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border shadow-none">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Serviços de Terceiros</p>
            <p className="text-lg font-semibold">R$ {totalLabor.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Peças</p>
            <p className="text-lg font-semibold">R$ {totalParts.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-lg font-semibold text-primary">R$ {grandTotal.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Labor section */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Serviços de Terceiros ({laborItems.length})
          </CardTitle>
          {canManage && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowLaborDialog(true)}>
              <Plus className="h-3 w-3" /> Lançar
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {laborItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-xs">Nenhum lançamento de serviço de terceiro.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Atividade</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[80px] text-right">Horas</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[90px] text-right">Valor/h</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[90px] text-right">Total</TableHead>
                  {canManage && <TableHead className="w-8" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {laborItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">
                      {item.description}
                      {item.observation && <p className="text-[11px] text-muted-foreground">{item.observation}</p>}
                    </TableCell>
                    <TableCell className="text-sm text-right">{Number(item.hours).toFixed(1)}</TableCell>
                    <TableCell className="text-sm text-right">R$ {Number(item.rate_per_hour).toFixed(2)}</TableCell>
                    <TableCell className="text-sm font-medium text-right">R$ {(item.hours * item.rate_per_hour).toFixed(2)}</TableCell>
                    {canManage && (
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteLaborMut.mutate(item.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Parts section */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Package className="h-4 w-4" /> Peças / Materiais ({partItems.length})
          </CardTitle>
          {canManage && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowPartDialog(true)}>
              <Plus className="h-3 w-3" /> Lançar
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {partItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-xs">Nenhum lançamento de peça.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Descrição</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[60px] text-right">Qtd</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[90px] text-right">Valor Un.</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[90px] text-right">Total</TableHead>
                  {canManage && <TableHead className="w-8" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {partItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">
                      {item.description}
                      {item.stock_item_id && (
                        <Badge variant="outline" className="text-[10px] ml-1.5 bg-muted">Estoque</Badge>
                      )}
                      {item.observation && <p className="text-[11px] text-muted-foreground">{item.observation}</p>}
                    </TableCell>
                    <TableCell className="text-sm text-right">{Number(item.qty)}</TableCell>
                    <TableCell className="text-sm text-right">R$ {Number(item.unit_price).toFixed(2)}</TableCell>
                    <TableCell className="text-sm font-medium text-right">R$ {(item.qty * item.unit_price).toFixed(2)}</TableCell>
                    {canManage && (
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deletePartMut.mutate(item.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Labor Dialog */}
      <Dialog open={showLaborDialog} onOpenChange={setShowLaborDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Lançar Serviço de Terceiro</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Atividade *</Label>
              <Input value={laborDesc} onChange={e => setLaborDesc(e.target.value)} placeholder="Ex: Troca de filtro" className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Horas *</Label>
                <Input type="number" step="0.5" min="0" value={laborHours} onChange={e => setLaborHours(e.target.value)} placeholder="2.0" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Valor/hora (R$) *</Label>
                <CurrencyInput value={laborRate} onValueChange={setLaborRate} className="h-9 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Observação</Label>
              <Input value={laborObs} onChange={e => setLaborObs(e.target.value)} placeholder="Opcional" className="h-9 text-sm" />
            </div>
            {laborHours && laborRate && (
              <p className="text-sm text-right font-medium">
                Subtotal: R$ {((parseFloat(laborHours) || 0) * (parseFloat(laborRate) || 0)).toFixed(2)}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowLaborDialog(false)}>Cancelar</Button>
            <Button size="sm" disabled={!laborDesc || !laborHours || !laborRate || addLaborMut.isPending} onClick={() => addLaborMut.mutate()}>
              {addLaborMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Part Dialog */}
      <Dialog open={showPartDialog} onOpenChange={setShowPartDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Lançar Peça / Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Selecionar do estoque</Label>
              <Select value={partStockItemId} onValueChange={handleStockSelect}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Avulso (sem estoque)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Avulso (sem estoque)</SelectItem>
                  {stockItems.map((si: any) => (
                    <SelectItem key={si.id} value={si.id}>
                      {si.name} {si.sku ? `(${si.sku})` : ''} — Estoque: {si.current_level || 0}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Descrição *</Label>
              <Input value={partDesc} onChange={e => setPartDesc(e.target.value)} placeholder="Nome da peça" className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Quantidade *</Label>
                <Input type="number" step="1" min="1" value={partQty} onChange={e => setPartQty(e.target.value)} placeholder="1" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Valor unitário (R$) *</Label>
                <CurrencyInput value={partPrice} onValueChange={setPartPrice} className="h-9 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Observação</Label>
              <Input value={partObs} onChange={e => setPartObs(e.target.value)} placeholder="Opcional" className="h-9 text-sm" />
            </div>
            {partQty && partPrice && (
              <p className="text-sm text-right font-medium">
                Subtotal: R$ {((parseFloat(partQty) || 0) * (parseFloat(partPrice) || 0)).toFixed(2)}
              </p>
            )}
            {partStockItemId !== 'none' && (
              <p className="text-[11px] text-muted-foreground">
                ⚠ Ao salvar, será criada uma saída no estoque vinculada a esta OS.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowPartDialog(false)}>Cancelar</Button>
            <Button size="sm" disabled={!partDesc || !partQty || !partPrice || addPartMut.isPending} onClick={() => addPartMut.mutate()}>
              {addPartMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
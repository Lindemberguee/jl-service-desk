import { useState } from 'react';
import { useTenantQuery, useTenantInsert } from '@/hooks/useTenantQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Package, Loader2, ArrowDown, ArrowUp } from 'lucide-react';

export default function Stock() {
  const { data: items = [], isLoading } = useTenantQuery<any>('stock_items', 'stock_items');
  const { data: movements = [] } = useTenantQuery<any>('stock_movements', 'stock_movements');
  const insertItem = useTenantInsert('stock_items', ['stock_items']);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [minLevel, setMinLevel] = useState('0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await insertItem.mutateAsync({ name, sku, min_level: parseInt(minLevel) || 0 });
      toast({ title: 'Item criado!' });
      setOpen(false);
      setName(''); setSku(''); setMinLevel('0');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Item de Estoque</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Nome *</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
              <div className="space-y-2"><Label>SKU</Label><Input value={sku} onChange={e => setSku(e.target.value)} /></div>
              <div className="space-y-2"><Label>Nível mínimo</Label><Input type="number" value={minLevel} onChange={e => setMinLevel(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={insertItem.isPending}>
                {insertItem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Itens</TabsTrigger>
          <TabsTrigger value="movements">Movimentações</TabsTrigger>
        </TabsList>
        <TabsContent value="items">
          <Card>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="mx-auto h-10 w-10 mb-2 opacity-50" />
                  <p>Nenhum item de estoque.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Nível Atual</TableHead>
                      <TableHead>Nível Mín.</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.sku || '-'}</TableCell>
                        <TableCell>{item.current_level}</TableCell>
                        <TableCell>{item.min_level}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            (item.current_level || 0) <= (item.min_level || 0)
                              ? 'bg-destructive/10 text-destructive border-destructive/20'
                              : 'bg-green-500/10 text-green-500 border-green-500/20'
                          }>
                            {(item.current_level || 0) <= (item.min_level || 0) ? 'Baixo' : 'Normal'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="movements">
          <Card>
            <CardContent className="pt-4">
              {movements.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground text-sm">Nenhuma movimentação registrada.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Referência</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          {m.type === 'in' && <Badge variant="outline" className="bg-green-500/10 text-green-500"><ArrowDown className="h-3 w-3 mr-1" />Entrada</Badge>}
                          {m.type === 'out' && <Badge variant="outline" className="bg-destructive/10 text-destructive"><ArrowUp className="h-3 w-3 mr-1" />Saída</Badge>}
                          {m.type === 'adjust' && <Badge variant="outline">Ajuste</Badge>}
                        </TableCell>
                        <TableCell>{m.qty}</TableCell>
                        <TableCell>{m.reference || '-'}</TableCell>
                        <TableCell>{new Date(m.created_at).toLocaleString('pt-BR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState } from 'react';
import { useTenantQuery, useTenantInsert } from '@/hooks/useTenantQuery';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, Package, Loader2, ArrowDown, ArrowUp, Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

export default function Stock() {
  const { data: items = [], isLoading } = useTenantQuery<any>('stock_items', 'stock_items');
  const { data: movements = [] } = useTenantQuery<any>('stock_movements', 'stock_movements');
  const insertItem = useTenantInsert('stock_items', ['stock_items']);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [minLevel, setMinLevel] = useState('0');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const filteredItems = items.filter((item: any) => {
    if (!debouncedSearch) return true;
    const s = debouncedSearch.toLowerCase();
    return item.name?.toLowerCase().includes(s) || item.sku?.toLowerCase().includes(s);
  });

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
        <div>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Estoque</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{filteredItems.length} item(ns)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 gap-1.5"><Plus className="h-3.5 w-3.5" />Novo Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Item de Estoque</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">Nome *</Label><Input value={name} onChange={e => setName(e.target.value)} required className="h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">SKU</Label><Input value={sku} onChange={e => setSku(e.target.value)} className="h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Nível mínimo</Label><Input type="number" value={minLevel} onChange={e => setMinLevel(e.target.value)} className="h-9" /></div>
              <Button type="submit" className="w-full h-8 text-sm" disabled={insertItem.isPending}>
                {insertItem.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="items">
        <TabsList className="bg-card border border-border h-9">
          <TabsTrigger value="items" className="text-xs h-7">Itens</TabsTrigger>
          <TabsTrigger value="movements" className="text-xs h-7">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-3 space-y-3">
          <div className="bg-card border border-border rounded-md p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar item..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-md" />)}</div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-card border border-border rounded-md py-16 text-center text-muted-foreground">
              <Package className="mx-auto h-8 w-8 mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum item de estoque</p>
            </div>
          ) : isMobile ? (
            <div className="space-y-2">
              {filteredItems.map((item: any) => {
                const isLow = (item.current_level || 0) <= (item.min_level || 0);
                return (
                  <div key={item.id} className="bg-card border border-border rounded-md p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        {item.sku && <p className="text-[11px] text-muted-foreground mt-0.5">SKU: {item.sku}</p>}
                      </div>
                      <Badge variant="outline" className={`text-[10px] h-5 ${isLow ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-green-500/10 text-green-600 border-green-500/20'}`}>
                        {isLow ? 'Baixo' : 'Normal'}
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Atual: <strong className="text-foreground">{item.current_level}</strong></span>
                      <span>Mín: {item.min_level}</span>
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
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[100px]">SKU</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[100px]">Nível Atual</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[100px]">Nível Mín.</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[90px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item: any) => {
                    const isLow = (item.current_level || 0) <= (item.min_level || 0);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm font-medium">{item.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.sku || '-'}</TableCell>
                        <TableCell className="text-sm font-medium">{item.current_level}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.min_level}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[11px] ${isLow ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-green-500/10 text-green-600 border-green-500/20'}`}>
                            {isLow ? 'Baixo' : 'Normal'}
                          </Badge>
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
              <p className="text-sm">Nenhuma movimentação registrada.</p>
            </div>
          ) : isMobile ? (
            <div className="space-y-2">
              {movements.map((m: any) => (
                <div key={m.id} className="bg-card border border-border rounded-md p-3">
                  <div className="flex items-center justify-between gap-2">
                    {m.type === 'in' && <Badge variant="outline" className="text-[10px] h-5 bg-green-500/10 text-green-600 gap-1"><ArrowDown className="h-3 w-3" />Entrada</Badge>}
                    {m.type === 'out' && <Badge variant="outline" className="text-[10px] h-5 bg-destructive/10 text-destructive gap-1"><ArrowUp className="h-3 w-3" />Saída</Badge>}
                    {m.type === 'adjust' && <Badge variant="outline" className="text-[10px] h-5">Ajuste</Badge>}
                    <span className="text-sm font-medium">Qtd: {m.qty}</span>
                  </div>
                  <div className="flex justify-between mt-1.5 text-[11px] text-muted-foreground">
                    <span>{m.reference || '-'}</span>
                    <span>{new Date(m.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[120px]">Tipo</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[80px]">Qtd</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Referência</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[160px]">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        {m.type === 'in' && <Badge variant="outline" className="text-[11px] bg-green-500/10 text-green-600 gap-1"><ArrowDown className="h-3 w-3" />Entrada</Badge>}
                        {m.type === 'out' && <Badge variant="outline" className="text-[11px] bg-destructive/10 text-destructive gap-1"><ArrowUp className="h-3 w-3" />Saída</Badge>}
                        {m.type === 'adjust' && <Badge variant="outline" className="text-[11px]">Ajuste</Badge>}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{m.qty}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.reference || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString('pt-BR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

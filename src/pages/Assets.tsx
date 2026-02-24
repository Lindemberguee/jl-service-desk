import { useState } from 'react';
import { useTenantQuery, useTenantInsert, useTenantDelete } from '@/hooks/useTenantQuery';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, Trash2, Wrench, Loader2, Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

const statusLabelsMap: Record<string, string> = {
  ativo: 'Ativo', inativo: 'Inativo', em_manutencao: 'Em Manutenção', descartado: 'Descartado',
};
const statusColorMap: Record<string, string> = {
  ativo: 'bg-green-500/10 text-green-600 border-green-500/20',
  inativo: 'bg-muted text-muted-foreground',
  em_manutencao: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  descartado: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function Assets() {
  const { data: assets = [], isLoading } = useTenantQuery<any>('assets', 'assets');
  const insertMutation = useTenantInsert('assets', ['assets']);
  const deleteMutation = useTenantDelete('assets', ['assets']);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [patrimonyCode, setPatrimonyCode] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [status, setStatus] = useState('ativo');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const filtered = assets.filter((a: any) => {
    if (!debouncedSearch) return true;
    const s = debouncedSearch.toLowerCase();
    return a.name?.toLowerCase().includes(s) || a.patrimony_code?.toLowerCase().includes(s) || a.serial_number?.toLowerCase().includes(s);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await insertMutation.mutateAsync({ name, patrimony_code: patrimonyCode, serial_number: serialNumber, status });
      toast({ title: 'Ativo criado!' });
      setOpen(false);
      setName(''); setPatrimonyCode(''); setSerialNumber(''); setStatus('ativo');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Ativos / Equipamentos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} registro(s)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 gap-1.5"><Plus className="h-3.5 w-3.5" />Novo Ativo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Ativo</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">Nome *</Label><Input value={name} onChange={e => setName(e.target.value)} required className="h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Patrimônio</Label><Input value={patrimonyCode} onChange={e => setPatrimonyCode(e.target.value)} className="h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Nº Série</Label><Input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} className="h-9" /></div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabelsMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full h-8 text-sm" disabled={insertMutation.isPending}>
                {insertMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-md p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar ativo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-md" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-md py-16 text-center text-muted-foreground">
          <Wrench className="mx-auto h-8 w-8 mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhum ativo encontrado</p>
        </div>
      ) : isMobile ? (
        <div className="space-y-2">
          {filtered.map((a: any) => (
            <div key={a.id} className="bg-card border border-border rounded-md p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.name}</p>
                  <div className="flex gap-3 mt-1 text-[11px] text-muted-foreground">
                    {a.patrimony_code && <span>Pat: {a.patrimony_code}</span>}
                    {a.serial_number && <span>S/N: {a.serial_number}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className={`text-[10px] h-5 ${statusColorMap[a.status]}`}>
                    {statusLabelsMap[a.status]}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(a.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Nome</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[120px]">Patrimônio</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[120px]">Nº Série</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[120px]">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="text-sm font-medium">{a.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.patrimony_code || '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.serial_number || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[11px] ${statusColorMap[a.status]}`}>{statusLabelsMap[a.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(a.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

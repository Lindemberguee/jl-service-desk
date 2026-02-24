import { useState } from 'react';
import { useTenantQuery, useTenantInsert, useTenantDelete } from '@/hooks/useTenantQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Wrench, Loader2 } from 'lucide-react';

const statusMap: Record<string, string> = {
  ativo: 'bg-green-500/10 text-green-500',
  inativo: 'bg-muted text-muted-foreground',
  em_manutencao: 'bg-amber-500/10 text-amber-500',
  descartado: 'bg-destructive/10 text-destructive',
};

export default function Assets() {
  const { data: assets = [], isLoading } = useTenantQuery<any>('assets', 'assets');
  const insertMutation = useTenantInsert('assets', ['assets']);
  const deleteMutation = useTenantDelete('assets', ['assets']);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [patrimonyCode, setPatrimonyCode] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [status, setStatus] = useState('ativo');

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
        <h1 className="text-2xl font-bold tracking-tight">Ativos / Equipamentos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Ativo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Ativo</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Nome *</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Patrimônio</Label><Input value={patrimonyCode} onChange={e => setPatrimonyCode(e.target.value)} /></div>
              <div className="space-y-2"><Label>Nº Série</Label><Input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="em_manutencao">Em Manutenção</SelectItem>
                    <SelectItem value="descartado">Descartado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={insertMutation.isPending}>
                {insertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wrench className="mx-auto h-10 w-10 mb-2 opacity-50" />
              <p>Nenhum ativo cadastrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Patrimônio</TableHead>
                  <TableHead>Nº Série</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.patrimony_code || '-'}</TableCell>
                    <TableCell>{a.serial_number || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusMap[a.status]}>{a.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(a.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

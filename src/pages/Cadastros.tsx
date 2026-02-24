import { useState } from 'react';
import { useTenantQuery, useTenantInsert, useTenantDelete } from '@/hooks/useTenantQuery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Building2, MapPin, Tag, Users as UsersIcon, Loader2 } from 'lucide-react';

function CrudSection({ title, icon: Icon, queryKey, table, fields }: {
  title: string;
  icon: any;
  queryKey: string;
  table: string;
  fields: { key: string; label: string; required?: boolean }[];
}) {
  const { data = [], isLoading } = useTenantQuery<any>(queryKey, table);
  const insertMutation = useTenantInsert(table, [queryKey]);
  const deleteMutation = useTenantDelete(table, [queryKey]);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await insertMutation.mutateAsync(form);
      toast({ title: `${title} criado(a)!` });
      setOpen(false);
      setForm({});
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo {title}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {fields.map(f => (
                <div key={f.key} className="space-y-2">
                  <Label>{f.label}</Label>
                  <Input
                    value={form[f.key] || ''}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    required={f.required}
                  />
                </div>
              ))}
              <Button type="submit" className="w-full" disabled={insertMutation.isPending}>
                {insertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : data.length === 0 ? (
          <p className="text-center py-6 text-muted-foreground text-sm">Nenhum registro encontrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {fields.map(f => <TableHead key={f.key}>{f.label}</TableHead>)}
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item: any) => (
                <TableRow key={item.id}>
                  {fields.map(f => <TableCell key={f.key}>{item[f.key] || '-'}</TableCell>)}
                  <TableCell>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => deleteMutation.mutate(item.id)}
                    >
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
  );
}

export default function Cadastros() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Cadastros</h1>
      <Tabs defaultValue="units">
        <TabsList>
          <TabsTrigger value="units">Unidades</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="customers">Solicitantes</TabsTrigger>
        </TabsList>
        <TabsContent value="units" className="space-y-4">
          <CrudSection
            title="Unidade"
            icon={Building2}
            queryKey="units"
            table="units"
            fields={[
              { key: 'name', label: 'Nome', required: true },
              { key: 'address', label: 'Endereço' },
              { key: 'city', label: 'Cidade' },
              { key: 'state', label: 'Estado' },
            ]}
          />
        </TabsContent>
        <TabsContent value="categories">
          <CrudSection
            title="Categoria"
            icon={Tag}
            queryKey="categories"
            table="categories"
            fields={[{ key: 'name', label: 'Nome', required: true }]}
          />
        </TabsContent>
        <TabsContent value="customers">
          <CrudSection
            title="Solicitante"
            icon={UsersIcon}
            queryKey="customers"
            table="customers"
            fields={[
              { key: 'name', label: 'Nome', required: true },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Telefone' },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

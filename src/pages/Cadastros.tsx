import { useState } from 'react';
import { useTenantQuery, useTenantInsert, useTenantDelete } from '@/hooks/useTenantQuery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, Trash2, Building2, Tag, Users as UsersIcon, Loader2 } from 'lucide-react';

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
  const isMobile = useIsMobile();
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
          <span className="text-xs font-normal text-muted-foreground">({data.length})</span>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"><Plus className="h-3 w-3" />Novo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo {title}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              {fields.map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs">{f.label}</Label>
                  <Input
                    value={form[f.key] || ''}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    required={f.required}
                    className="h-9"
                  />
                </div>
              ))}
              <Button type="submit" className="w-full h-8 text-sm" disabled={insertMutation.isPending}>
                {insertMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full rounded-md" />)}</div>
      ) : data.length === 0 ? (
        <div className="bg-card border border-border rounded-md py-12 text-center text-muted-foreground">
          <p className="text-sm">Nenhum registro encontrado.</p>
        </div>
      ) : isMobile ? (
        <div className="space-y-2">
          {data.map((item: any) => (
            <div key={item.id} className="bg-card border border-border rounded-md p-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                {fields.map((f, i) => (
                  <p key={f.key} className={i === 0 ? 'text-sm font-medium truncate' : 'text-[11px] text-muted-foreground'}>
                    {i > 0 && `${f.label}: `}{item[f.key] || '-'}
                  </p>
                ))}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => deleteMutation.mutate(item.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {fields.map(f => <TableHead key={f.key} className="text-[11px] font-semibold uppercase text-muted-foreground">{f.label}</TableHead>)}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item: any) => (
                <TableRow key={item.id}>
                  {fields.map((f, i) => (
                    <TableCell key={f.key} className={i === 0 ? 'text-sm font-medium' : 'text-xs text-muted-foreground'}>
                      {item[f.key] || '-'}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(item.id)}>
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

export default function Cadastros() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Cadastros</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Gerencie unidades, categorias e solicitantes.</p>
      </div>

      <Tabs defaultValue="units">
        <TabsList className="bg-card border border-border h-9">
          <TabsTrigger value="units" className="text-xs h-7">Unidades</TabsTrigger>
          <TabsTrigger value="categories" className="text-xs h-7">Categorias</TabsTrigger>
          <TabsTrigger value="customers" className="text-xs h-7">Solicitantes</TabsTrigger>
        </TabsList>
        <TabsContent value="units" className="mt-3">
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
        <TabsContent value="categories" className="mt-3">
          <CrudSection
            title="Categoria"
            icon={Tag}
            queryKey="categories"
            table="categories"
            fields={[{ key: 'name', label: 'Nome', required: true }]}
          />
        </TabsContent>
        <TabsContent value="customers" className="mt-3">
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

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { priorityLabels } from '@/lib/permissions';
import { Plus, Settings2, Tag, Clock, Star, Shield } from 'lucide-react';
import { lazy, Suspense } from 'react';

const RolePermissionsMatrix = lazy(() => import('@/components/admin/RolePermissionsMatrix'));

export default function AdminSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Fetch all tenants for scope selector
  const { data: tenants = [] } = useQuery({
    queryKey: ['admin_tenants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenants').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const [scopeTenant, setScopeTenant] = useState<string>('all');

  // Categories
  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ['admin_categories', scopeTenant],
    queryFn: async () => {
      let q = supabase.from('categories').select('*, tenants!inner(name)').order('name');
      if (scopeTenant !== 'all') q = q.eq('tenant_id', scopeTenant);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  // SLA Policies
  const { data: slaPolicies = [], isLoading: slaLoading } = useQuery({
    queryKey: ['admin_sla_policies', scopeTenant],
    queryFn: async () => {
      let q = supabase.from('sla_policies').select('*, tenants!inner(name)').order('name');
      if (scopeTenant !== 'all') q = q.eq('tenant_id', scopeTenant);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  // New category dialog
  const [catOpen, setCatOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', tenant_id: '' });

  const addCategory = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('categories').insert({
        name: catForm.name,
        tenant_id: catForm.tenant_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_categories'] });
      toast({ title: 'Categoria criada!' });
      setCatOpen(false);
      setCatForm({ name: '', tenant_id: '' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  // New SLA dialog
  const [slaOpen, setSlaOpen] = useState(false);
  const [slaForm, setSlaForm] = useState({
    name: '', tenant_id: '',
    response_hours: '4', resolve_hours: '24',
  });

  const addSla = useMutation({
    mutationFn: async () => {
      const rules = {
        default: {
          response_minutes: Number(slaForm.response_hours) * 60,
          resolve_minutes: Number(slaForm.resolve_hours) * 60,
        },
      };
      const { error } = await supabase.from('sla_policies').insert({
        name: slaForm.name,
        tenant_id: slaForm.tenant_id,
        rules,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_sla_policies'] });
      toast({ title: 'Política SLA criada!' });
      setSlaOpen(false);
      setSlaForm({ name: '', tenant_id: '', response_hours: '4', resolve_hours: '24' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações Globais</h1>
          <p className="text-sm text-muted-foreground">Categorias, SLA e configurações por departamento</p>
        </div>
        <Select value={scopeTenant} onValueChange={setScopeTenant}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Departamentos</SelectItem>
            {tenants.map((t: any) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories"><Tag className="h-3 w-3 mr-1" />Categorias</TabsTrigger>
          <TabsTrigger value="sla"><Clock className="h-3 w-3 mr-1" />Políticas SLA</TabsTrigger>
          <TabsTrigger value="permissoes"><Shield className="h-3 w-3 mr-1" />Permissões</TabsTrigger>
          <TabsTrigger value="departamento"><Settings2 className="h-3 w-3 mr-1" />Departamento</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Categorias de OS</CardTitle>
              <Button size="sm" onClick={() => setCatOpen(true)}><Plus className="h-4 w-4 mr-1" />Nova</Button>
            </CardHeader>
            <CardContent>
              {catLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Departamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell><Badge variant="outline">{c.tenants?.name}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {categories.length === 0 && (
                      <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">Nenhuma categoria.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Políticas de SLA</CardTitle>
              <Button size="sm" onClick={() => setSlaOpen(true)}><Plus className="h-4 w-4 mr-1" />Nova</Button>
            </CardHeader>
            <CardContent>
              {slaLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Regras</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slaPolicies.map((s: any) => {
                      const rules = s.rules as any;
                      const defaultRule = rules?.default;
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell><Badge variant="outline">{s.tenants?.name}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {defaultRule ? `Resp: ${defaultRule.response_minutes / 60}h | Res: ${defaultRule.resolve_minutes / 60}h` : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {slaPolicies.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhuma política SLA.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissoes">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <RolePermissionsMatrix />
          </Suspense>
        </TabsContent>

        <TabsContent value="departamento">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Configurações por Departamento</CardTitle>
              <CardDescription className="text-xs">Controle de visibilidade e funcionalidades por departamento</CardDescription>
            </CardHeader>
            <CardContent>
              {tenants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum departamento encontrado.</p>
              ) : (
                <div className="space-y-4">
                  {(scopeTenant === 'all' ? tenants : tenants.filter((t: any) => t.id === scopeTenant)).map((t: any) => (
                    <TenantSettingsCard key={t.id} tenant={t} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Category Dialog */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Categoria</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Rede, Elétrica, Hidráulica" />
            </div>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={catForm.tenant_id} onValueChange={v => setCatForm(f => ({ ...f, tenant_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {tenants.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={!catForm.name || !catForm.tenant_id || addCategory.isPending} onClick={() => addCategory.mutate()}>
              {addCategory.isPending ? 'Criando...' : 'Criar Categoria'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New SLA Dialog */}
      <Dialog open={slaOpen} onOpenChange={setSlaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Política SLA</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={slaForm.name} onChange={e => setSlaForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: SLA Padrão TI" />
            </div>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={slaForm.tenant_id} onValueChange={v => setSlaForm(f => ({ ...f, tenant_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {tenants.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tempo de Resposta (horas)</Label>
                <Input type="number" value={slaForm.response_hours} onChange={e => setSlaForm(f => ({ ...f, response_hours: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tempo de Resolução (horas)</Label>
                <Input type="number" value={slaForm.resolve_hours} onChange={e => setSlaForm(f => ({ ...f, resolve_hours: e.target.value }))} />
              </div>
            </div>
            <Button className="w-full" disabled={!slaForm.name || !slaForm.tenant_id || addSla.isPending} onClick={() => addSla.mutate()}>
              {addSla.isPending ? 'Criando...' : 'Criar Política SLA'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TenantSettingsCard({ tenant }: { tenant: any }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const toggleRatings = useMutation({
    mutationFn: async (value: boolean) => {
      const { error } = await supabase.from('tenants').update({ show_ratings_to_techs: value } as any).eq('id', tenant.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_tenants'] });
      toast({ title: 'Configuração atualizada!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline">{tenant.name}</Badge>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Label className="text-sm flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-yellow-500" />
            Exibir avaliações para técnicos
          </Label>
          <p className="text-xs text-muted-foreground">
            Quando ativado, técnicos podem ver notas de avaliação na timeline da OS.
          </p>
        </div>
        <Switch
          checked={!!tenant.show_ratings_to_techs}
          onCheckedChange={(v) => toggleRatings.mutate(v)}
          disabled={toggleRatings.isPending}
        />
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { logAudit } from '@/lib/audit';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Settings2, Tag, Clock, Star, Shield, ScrollText, Palette, Key,
  Building2, Layers, ChevronRight, Pencil, Trash2, Search, X, Loader2,
  AlertTriangle, HelpCircle, Timer, CheckCircle2, PauseCircle, BarChart3,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import AuditSettingsTab from '@/components/admin/audit/AuditSettingsTab';
import BrandingSettingsTab from '@/components/admin/BrandingSettingsTab';
import ApiKeyTab from '@/components/admin/ApiKeyTab';

const RolePermissionsMatrix = lazy(() => import('@/components/admin/RolePermissionsMatrix'));
const UserPermissionsManager = lazy(() => import('@/components/admin/UserPermissionsManager'));

export default function AdminSettings() {
  const { toast } = useToast();
  const { currentRole, rolePermissions } = useAuth();
  const qc = useQueryClient();
  const canManageApi = currentRole ? hasPermission(currentRole, 'api:manage', undefined, rolePermissions) : false;

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

  // Summary stats
  const totalCategories = categories.length;
  const totalSla = slaPolicies.length;
  const totalDepartments = tenants.length;

  // Category CRUD
  const [catOpen, setCatOpen] = useState(false);
  const [catEditOpen, setCatEditOpen] = useState(false);
  const [catEditId, setCatEditId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ name: '', tenant_id: '' });
  const [catDeleteTarget, setCatDeleteTarget] = useState<any>(null);
  const [catSearch, setCatSearch] = useState('');

  const filteredCategories = useMemo(() => {
    if (!catSearch.trim()) return categories;
    const q = catSearch.toLowerCase();
    return categories.filter((c: any) => c.name?.toLowerCase().includes(q) || c.tenants?.name?.toLowerCase().includes(q));
  }, [categories, catSearch]);

  const addCategory = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('categories').insert({ name: catForm.name, tenant_id: catForm.tenant_id });
      if (error) throw error;
    },
    onSuccess: async () => {
      await logAudit({ entity: 'category', action: 'category.created', tenantId: catForm.tenant_id, diff: { name: catForm.name } });
      qc.invalidateQueries({ queryKey: ['admin_categories'] });
      toast({ title: 'Categoria criada!' });
      setCatOpen(false);
      setCatForm({ name: '', tenant_id: '' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const editCategory = useMutation({
    mutationFn: async () => {
      if (!catEditId) return;
      const { error } = await supabase.from('categories').update({ name: catForm.name }).eq('id', catEditId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await logAudit({ entity: 'category', entityId: catEditId || undefined, action: 'category.updated', diff: { name: catForm.name } });
      qc.invalidateQueries({ queryKey: ['admin_categories'] });
      toast({ title: 'Categoria atualizada!' });
      setCatEditOpen(false);
      setCatForm({ name: '', tenant_id: '' });
      setCatEditId(null);
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['admin_categories'] });
      toast({ title: 'Categoria excluída!' });
      setCatDeleteTarget(null);
    },
    onError: (err: any) => { toast({ title: 'Erro', description: err.message, variant: 'destructive' }); setCatDeleteTarget(null); },
  });

  // SLA CRUD
  const [slaOpen, setSlaOpen] = useState(false);
  const [slaEditOpen, setSlaEditOpen] = useState(false);
  const [slaEditId, setSlaEditId] = useState<string | null>(null);
  const [slaForm, setSlaForm] = useState({ name: '', tenant_id: '', response_hours: '4', resolve_hours: '24' });
  const [slaDeleteTarget, setSlaDeleteTarget] = useState<any>(null);
  const [slaSearch, setSlaSearch] = useState('');
  const [slaDetail, setSlaDetail] = useState<any>(null);

  const filteredSla = useMemo(() => {
    if (!slaSearch.trim()) return slaPolicies;
    const q = slaSearch.toLowerCase();
    return slaPolicies.filter((s: any) => s.name?.toLowerCase().includes(q) || s.tenants?.name?.toLowerCase().includes(q));
  }, [slaPolicies, slaSearch]);

  const addSla = useMutation({
    mutationFn: async () => {
      const rules = { default: { response_minutes: Number(slaForm.response_hours) * 60, resolve_minutes: Number(slaForm.resolve_hours) * 60 } };
      const { error } = await supabase.from('sla_policies').insert({ name: slaForm.name, tenant_id: slaForm.tenant_id, rules });
      if (error) throw error;
    },
    onSuccess: async () => {
      await logAudit({ entity: 'sla_policy', action: 'sla_policy.created', tenantId: slaForm.tenant_id, diff: { name: slaForm.name } });
      qc.invalidateQueries({ queryKey: ['admin_sla_policies'] });
      toast({ title: 'Política SLA criada!' });
      setSlaOpen(false);
      setSlaForm({ name: '', tenant_id: '', response_hours: '4', resolve_hours: '24' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const editSla = useMutation({
    mutationFn: async () => {
      if (!slaEditId) return;
      const rules = { default: { response_minutes: Number(slaForm.response_hours) * 60, resolve_minutes: Number(slaForm.resolve_hours) * 60 } };
      const { error } = await supabase.from('sla_policies').update({ name: slaForm.name, rules }).eq('id', slaEditId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await logAudit({ entity: 'sla_policy', entityId: slaEditId || undefined, action: 'sla_policy.updated', diff: { name: slaForm.name } });
      qc.invalidateQueries({ queryKey: ['admin_sla_policies'] });
      toast({ title: 'Política SLA atualizada!' });
      setSlaEditOpen(false);
      setSlaForm({ name: '', tenant_id: '', response_hours: '4', resolve_hours: '24' });
      setSlaEditId(null);
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const deleteSla = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sla_policies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['admin_sla_policies'] });
      toast({ title: 'Política SLA excluída!' });
      setSlaDeleteTarget(null);
    },
    onError: (err: any) => { toast({ title: 'Erro', description: err.message, variant: 'destructive' }); setSlaDeleteTarget(null); },
  });

  const summaryCards = [
    { label: 'Categorias', value: totalCategories, icon: Tag, color: 'text-blue-500' },
    { label: 'Políticas SLA', value: totalSla, icon: Clock, color: 'text-amber-500' },
    { label: 'Departamentos', value: totalDepartments, icon: Building2, color: 'text-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">Gerencie categorias, SLA, permissões e identidade visual</p>
        </div>
        <Select value={scopeTenant} onValueChange={setScopeTenant}>
          <SelectTrigger className="w-[200px] h-9 text-xs">
            <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Filtrar departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Departamentos</SelectItem>
            {tenants.map((t: any) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {summaryCards.map((card) => (
          <Card key={card.label} className="shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-none">{card.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="categories">
        <TabsList className="bg-muted/50 p-1 rounded-lg h-auto flex-wrap">
          <TabsTrigger value="categories" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs gap-1.5 px-3 py-1.5">
            <Tag className="h-3 w-3" />Categorias
          </TabsTrigger>
          <TabsTrigger value="sla" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs gap-1.5 px-3 py-1.5">
            <Clock className="h-3 w-3" />SLA
          </TabsTrigger>
          <TabsTrigger value="permissoes" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs gap-1.5 px-3 py-1.5">
            <Shield className="h-3 w-3" />Permissões (Cargo)
          </TabsTrigger>
          <TabsTrigger value="permissoes_usuario" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs gap-1.5 px-3 py-1.5">
            <Shield className="h-3 w-3" />Permissões (Usuário)
          </TabsTrigger>
          <TabsTrigger value="departamento" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs gap-1.5 px-3 py-1.5">
            <Settings2 className="h-3 w-3" />Departamento
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs gap-1.5 px-3 py-1.5">
            <ScrollText className="h-3 w-3" />Auditoria
          </TabsTrigger>
          <TabsTrigger value="branding" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs gap-1.5 px-3 py-1.5">
            <Palette className="h-3 w-3" />Visual
          </TabsTrigger>
          {canManageApi && (
            <TabsTrigger value="api" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs gap-1.5 px-3 py-1.5">
              <Key className="h-3 w-3" />API
            </TabsTrigger>
          )}
        </TabsList>

        {/* ─── Categories ─── */}
        <TabsContent value="categories" className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              {categories.length > 3 && (
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={catSearch}
                    onChange={e => setCatSearch(e.target.value)}
                    placeholder="Buscar categorias..."
                    className="h-8 text-xs pl-8 pr-8"
                  />
                  {catSearch && (
                    <button onClick={() => setCatSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setCatOpen(true)}>
              <Plus className="h-3.5 w-3.5" />Nova Categoria
            </Button>
          </div>

          <Card className="shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] border-border/50">
            <CardContent className="p-0">
              {catLoading ? (
                <div className="p-6"><Skeleton className="h-20 w-full" /></div>
              ) : filteredCategories.length === 0 ? (
                <div className="py-12 text-center">
                  <Tag className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">{catSearch ? 'Nenhum resultado.' : 'Nenhuma categoria cadastrada.'}</p>
                  {!catSearch && (
                    <Button size="sm" variant="outline" className="mt-3 h-7 text-xs gap-1" onClick={() => setCatOpen(true)}>
                      <Plus className="h-3 w-3" />Criar primeira categoria
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground h-9">Nome</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground h-9">Departamento</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground h-9 w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories.map((c: any) => (
                      <TableRow key={c.id} className="group">
                        <TableCell className="text-sm font-medium">{c.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{c.tenants?.name}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                              setCatForm({ name: c.name, tenant_id: c.tenant_id });
                              setCatEditId(c.id);
                              setCatEditOpen(true);
                            }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setCatDeleteTarget(c)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── SLA ─── */}
        <TabsContent value="sla" className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              {slaPolicies.length > 3 && (
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={slaSearch}
                    onChange={e => setSlaSearch(e.target.value)}
                    placeholder="Buscar políticas..."
                    className="h-8 text-xs pl-8 pr-8"
                  />
                  {slaSearch && (
                    <button onClick={() => setSlaSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setSlaOpen(true)}>
              <Plus className="h-3.5 w-3.5" />Nova Política
            </Button>
          </div>

          <Card className="shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] border-border/50">
            <CardContent className="p-0">
              {slaLoading ? (
                <div className="p-6"><Skeleton className="h-20 w-full" /></div>
              ) : filteredSla.length === 0 ? (
                <div className="py-12 text-center">
                  <Clock className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">{slaSearch ? 'Nenhum resultado.' : 'Nenhuma política SLA cadastrada.'}</p>
                  {!slaSearch && (
                    <Button size="sm" variant="outline" className="mt-3 h-7 text-xs gap-1" onClick={() => setSlaOpen(true)}>
                      <Plus className="h-3 w-3" />Criar primeira política
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground h-9">Nome</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground h-9">Departamento</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground h-9">Resposta</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground h-9">Resolução</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground h-9 w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSla.map((s: any) => {
                      const rules = s.rules as any;
                      const d = rules?.default;
                      return (
                        <TableRow key={s.id} className="group cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => setSlaDetail(s)}>
                          <TableCell className="text-sm font-medium">{s.name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{s.tenants?.name}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {d ? `${d.response_minutes / 60}h` : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {d ? `${d.resolve_minutes / 60}h` : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                const dr = (s.rules as any)?.default;
                                setSlaForm({
                                  name: s.name,
                                  tenant_id: s.tenant_id,
                                  response_hours: String((dr?.response_minutes || 240) / 60),
                                  resolve_hours: String((dr?.resolve_minutes || 1440) / 60),
                                });
                                setSlaEditId(s.id);
                                setSlaEditOpen(true);
                              }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setSlaDeleteTarget(s)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Permissões ─── */}
        <TabsContent value="permissoes" className="mt-4">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <RolePermissionsMatrix />
          </Suspense>
        </TabsContent>

        {/* ─── Permissões por Usuário ─── */}
        <TabsContent value="permissoes_usuario" className="mt-4">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <UserPermissionsManager />
          </Suspense>
        </TabsContent>

        {/* ─── Departamento ─── */}
        <TabsContent value="departamento" className="mt-4">
          {tenants.length === 0 ? (
            <div className="py-12 text-center">
              <Building2 className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum departamento encontrado.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(scopeTenant === 'all' ? tenants : tenants.filter((t: any) => t.id === scopeTenant)).map((t: any) => (
                <TenantSettingsCard key={t.id} tenant={t} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Auditoria ─── */}
        <TabsContent value="auditoria" className="mt-4">
          <AuditSettingsTab />
        </TabsContent>

        {/* ─── Branding ─── */}
        <TabsContent value="branding" className="mt-4">
          <BrandingSettingsTab tenants={tenants} />
        </TabsContent>

        {/* ─── API ─── */}
        {canManageApi && (
          <TabsContent value="api" className="mt-4">
            <ApiKeyTab tenants={tenants} />
          </TabsContent>
        )}
      </Tabs>

      {/* ─── Dialogs ─── */}

      {/* New Category */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Tag className="h-4 w-4 text-primary" />Nova Categoria</DialogTitle>
            <DialogDescription>Crie uma nova categoria para classificar ordens de serviço.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Rede, Elétrica, Hidráulica" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Departamento</Label>
              <Select value={catForm.tenant_id} onValueChange={v => setCatForm(f => ({ ...f, tenant_id: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {tenants.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setCatOpen(false)}>Cancelar</Button>
              <Button size="sm" disabled={!catForm.name || !catForm.tenant_id || addCategory.isPending} onClick={() => addCategory.mutate()}>
                {addCategory.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Criar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category */}
      <Dialog open={catEditOpen} onOpenChange={(v) => { setCatEditOpen(v); if (!v) { setCatEditId(null); setCatForm({ name: '', tenant_id: '' }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} className="h-9" />
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setCatEditOpen(false)}>Cancelar</Button>
              <Button size="sm" disabled={!catForm.name || editCategory.isPending} onClick={() => editCategory.mutate()}>
                {editCategory.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category */}
      <AlertDialog open={!!catDeleteTarget} onOpenChange={v => { if (!v) setCatDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{catDeleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => catDeleteTarget && deleteCategory.mutate(catDeleteTarget.id)}>
              {deleteCategory.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New SLA */}
      <Dialog open={slaOpen} onOpenChange={setSlaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Nova Política SLA</DialogTitle>
            <DialogDescription>Defina tempos de resposta e resolução para ordens de serviço.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input value={slaForm.name} onChange={e => setSlaForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: SLA Padrão TI" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Departamento</Label>
              <Select value={slaForm.tenant_id} onValueChange={v => setSlaForm(f => ({ ...f, tenant_id: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {tenants.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tempo de Resposta (h)</Label>
                <Input type="number" value={slaForm.response_hours} onChange={e => setSlaForm(f => ({ ...f, response_hours: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tempo de Resolução (h)</Label>
                <Input type="number" value={slaForm.resolve_hours} onChange={e => setSlaForm(f => ({ ...f, resolve_hours: e.target.value }))} className="h-9" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setSlaOpen(false)}>Cancelar</Button>
              <Button size="sm" disabled={!slaForm.name || !slaForm.tenant_id || addSla.isPending} onClick={() => addSla.mutate()}>
                {addSla.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Criar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit SLA */}
      <Dialog open={slaEditOpen} onOpenChange={(v) => { setSlaEditOpen(v); if (!v) { setSlaEditId(null); setSlaForm({ name: '', tenant_id: '', response_hours: '4', resolve_hours: '24' }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Política SLA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input value={slaForm.name} onChange={e => setSlaForm(f => ({ ...f, name: e.target.value }))} className="h-9" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tempo de Resposta (h)</Label>
                <Input type="number" value={slaForm.response_hours} onChange={e => setSlaForm(f => ({ ...f, response_hours: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tempo de Resolução (h)</Label>
                <Input type="number" value={slaForm.resolve_hours} onChange={e => setSlaForm(f => ({ ...f, resolve_hours: e.target.value }))} className="h-9" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setSlaEditOpen(false)}>Cancelar</Button>
              <Button size="sm" disabled={!slaForm.name || editSla.isPending} onClick={() => editSla.mutate()}>
                {editSla.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* SLA Detail */}
      <Dialog open={!!slaDetail} onOpenChange={v => { if (!v) setSlaDetail(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Detalhes da Política</DialogTitle>
          </DialogHeader>
          {slaDetail && (() => {
            const dr = (slaDetail.rules as any)?.default;
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">Nome</span>
                  <span className="text-sm font-medium">{slaDetail.name}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">Departamento</span>
                  <Badge variant="outline" className="text-[10px]">{slaDetail.tenants?.name}</Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">Tempo de Resposta</span>
                  <span className="text-sm font-semibold">{dr ? `${dr.response_minutes / 60}h` : '—'}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-muted-foreground">Tempo de Resolução</span>
                  <span className="text-sm font-semibold">{dr ? `${dr.resolve_minutes / 60}h` : '—'}</span>
                </div>
              </div>
            );
          })()}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => { setSlaDeleteTarget(slaDetail); setSlaDetail(null); }}>
              <Trash2 className="h-3.5 w-3.5" />Excluir
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
              const dr = (slaDetail.rules as any)?.default;
              setSlaForm({
                name: slaDetail.name,
                tenant_id: slaDetail.tenant_id,
                response_hours: String((dr?.response_minutes || 240) / 60),
                resolve_hours: String((dr?.resolve_minutes || 1440) / 60),
              });
              setSlaEditId(slaDetail.id);
              setSlaDetail(null);
              setSlaEditOpen(true);
            }}>
              <Pencil className="h-3.5 w-3.5" />Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete SLA */}
      <AlertDialog open={!!slaDeleteTarget} onOpenChange={v => { if (!v) setSlaDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir política SLA?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{slaDeleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => slaDeleteTarget && deleteSla.mutate(slaDeleteTarget.id)}>
              {deleteSla.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    onSuccess: async (_: any, value: boolean) => {
      await logAudit({ entity: 'tenant', entityId: tenant.id, action: 'tenant.settings_changed', diff: { show_ratings_to_techs: value } });
      qc.invalidateQueries({ queryKey: ['admin_tenants'] });
      toast({ title: 'Configuração atualizada!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  return (
    <Card className="shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)] border-border/50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold">{tenant.name}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-yellow-500" />
              Exibir avaliações para técnicos
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Técnicos podem ver notas de avaliação na timeline da OS.
            </p>
          </div>
          <Switch
            checked={!!tenant.show_ratings_to_techs}
            onCheckedChange={(v) => toggleRatings.mutate(v)}
            disabled={toggleRatings.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}

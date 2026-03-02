import { useState } from 'react';
import { logAudit } from '@/lib/audit';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { friendlyErrorMessage } from '@/lib/errorMessages';
import {
  Plus, Building2, Pencil, Palette, Users, ClipboardList, Search,
  BarChart3, AlertTriangle, CheckCircle2, Clock, TrendingUp, Eye,
  Shield, Zap, Package, Settings2, Activity, Trash2,
} from 'lucide-react';

interface DeptStats {
  members: number;
  totalOS: number;
  openOS: number;
  inProgressOS: number;
  resolvedOS: number;
  criticalOS: number;
  overdueOS: number;
  stockItems: number;
  assets: number;
}

export default function AdminDepartments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [detailDept, setDetailDept] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', slug: '', primary_color: '#3B82F6', accent_color: '#8B5CF6' });
  const [search, setSearch] = useState('');

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['admin_tenants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenants').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: allMemberships = [] } = useQuery({
    queryKey: ['admin_memberships_count'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_memberships').select('tenant_id, is_active, role');
      if (error) throw error;
      return data;
    },
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ['admin_dept_orders_count'],
    queryFn: async () => {
      const { data, error } = await supabase.from('work_orders').select('tenant_id, status, priority, resolve_due_at').is('deleted_at', null);
      if (error) throw error;
      return data;
    },
  });

  const { data: allStock = [] } = useQuery({
    queryKey: ['admin_dept_stock_count'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stock_items').select('tenant_id');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allAssets = [] } = useQuery({
    queryKey: ['admin_dept_assets_count'],
    queryFn: async () => {
      const { data, error } = await supabase.from('assets').select('tenant_id');
      if (error) throw error;
      return data || [];
    },
  });

  const getDeptStats = (tenantId: string): DeptStats => {
    const deptOrders = allOrders.filter((o: any) => o.tenant_id === tenantId);
    return {
      members: allMemberships.filter((m: any) => m.tenant_id === tenantId && m.is_active).length,
      totalOS: deptOrders.length,
      openOS: deptOrders.filter((o: any) => o.status === 'aberta').length,
      inProgressOS: deptOrders.filter((o: any) => o.status === 'em_execucao').length,
      resolvedOS: deptOrders.filter((o: any) => ['concluida', 'aprovada', 'encerrada'].includes(o.status)).length,
      criticalOS: deptOrders.filter((o: any) => o.priority === 'critica' && !['encerrada', 'concluida', 'aprovada'].includes(o.status)).length,
      overdueOS: deptOrders.filter((o: any) => o.resolve_due_at && new Date(o.resolve_due_at) < new Date() && !['encerrada', 'concluida', 'aprovada'].includes(o.status)).length,
      stockItems: allStock.filter((s: any) => s.tenant_id === tenantId).length,
      assets: allAssets.filter((a: any) => a.tenant_id === tenantId).length,
    };
  };

  const getRoleCounts = (tenantId: string) => {
    const members = allMemberships.filter((m: any) => m.tenant_id === tenantId && m.is_active);
    const roles: Record<string, number> = {};
    members.forEach((m: any) => { roles[m.role] = (roles[m.role] || 0) + 1; });
    return roles;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from('tenants').update({
          name: form.name, slug: form.slug,
          primary_color: form.primary_color, accent_color: form.accent_color,
        }).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('tenants').insert({
          name: form.name, slug: form.slug,
          primary_color: form.primary_color, accent_color: form.accent_color,
        }).select().single();
        if (error) throw error;
        if (data && user) {
          await supabase.from('user_memberships').insert({ tenant_id: data.id, user_id: user.id, role: 'admin' as any });
        }
      }
    },
    onSuccess: async () => {
      await logAudit({ entity: 'tenant', entityId: editing?.id, action: editing ? 'tenant.updated' : 'tenant.created', diff: { name: form.name, slug: form.slug } });
      qc.invalidateQueries({ queryKey: ['admin_tenants'] });
      qc.invalidateQueries({ queryKey: ['admin_memberships_count'] });
      toast({ title: editing ? 'Departamento atualizado!' : 'Departamento criado!' });
      setOpen(false); setEditing(null);
      setForm({ name: '', slug: '', primary_color: '#3B82F6', accent_color: '#8B5CF6' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('tenants').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: async (_: any, vars: { id: string; is_active: boolean }) => {
      await logAudit({ entity: 'tenant', entityId: vars.id, action: vars.is_active ? 'tenant.activated' : 'tenant.deactivated' });
      qc.invalidateQueries({ queryKey: ['admin_tenants'] });
      toast({ title: vars.is_active ? 'Departamento ativado!' : 'Departamento desativado!' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete memberships first, then the tenant
      await supabase.from('user_memberships').delete().eq('tenant_id', id);
      const { error } = await supabase.from('tenants').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async (_: any, id: string) => {
      await logAudit({ entity: 'tenant', entityId: id, action: 'tenant.deleted' });
      qc.invalidateQueries({ queryKey: ['admin_tenants'] });
      qc.invalidateQueries({ queryKey: ['admin_memberships_count'] });
      toast({ title: 'Departamento excluído com sucesso!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao excluir', description: friendlyErrorMessage(err), variant: 'destructive' });
    },
  });

  const openEdit = (t: any) => {
    setEditing(t);
    setForm({ name: t.name, slug: t.slug, primary_color: t.primary_color || '#3B82F6', accent_color: t.accent_color || '#8B5CF6' });
    setOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', slug: '', primary_color: '#3B82F6', accent_color: '#8B5CF6' });
    setOpen(true);
  };

  const filteredTenants = tenants.filter((t: any) =>
    t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase())
  );

  const totalMembers = allMemberships.filter((m: any) => m.is_active).length;
  const totalOS = allOrders.length;
  const activeDepts = tenants.filter((t: any) => t.is_active).length;

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Admin', admin: 'Admin', coordenador: 'Coordenador',
    tecnico: 'Técnico', solicitante: 'Solicitante', analista: 'Analista', leitura: 'Leitura',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Departamentos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeDepts} ativos · {totalMembers} membros · {totalOS} ordens de serviço
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="h-9 gap-1.5 rounded-lg">
          <Plus className="h-3.5 w-3.5" /> Novo Departamento
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Departamentos', value: tenants.length, icon: Building2, color: 'text-primary' },
          { label: 'Membros Ativos', value: totalMembers, icon: Users, color: 'text-blue-500' },
          { label: 'Total de OS', value: totalOS, icon: ClipboardList, color: 'text-amber-500' },
          { label: 'Depts. Ativos', value: activeDepts, icon: Activity, color: 'text-emerald-500' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-border/50 shadow-none rounded-xl">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <div>
                  {isLoading ? <Skeleton className="h-6 w-10" /> : <p className="text-xl font-bold">{kpi.value}</p>}
                  <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar departamento..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9 rounded-lg text-sm"
        />
      </div>

      {/* Department List */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
      ) : filteredTenants.length === 0 ? (
        <Card className="border-border/50 shadow-none rounded-xl">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">{search ? 'Nenhum resultado encontrado' : 'Nenhum departamento cadastrado'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTenants.map((t: any, i: number) => {
            const stats = getDeptStats(t.id);
            const resolutionRate = stats.totalOS > 0 ? Math.round((stats.resolvedOS / stats.totalOS) * 100) : 0;

            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className={`border-border/50 shadow-none rounded-xl overflow-hidden transition-all hover:border-primary/20 ${!t.is_active ? 'opacity-50' : ''}`}>
                  <div className="h-1" style={{ background: `linear-gradient(90deg, ${t.primary_color || '#3B82F6'}, ${t.accent_color || '#8B5CF6'})` }} />
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Left: Identity */}
                      <div className="flex items-center gap-3 lg:w-[220px] shrink-0">
                        {t.logo_url ? (
                          <img src={t.logo_url} alt={t.name} className="h-10 w-10 rounded-xl object-contain bg-muted/30 p-0.5" />
                        ) : (
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                            style={{ background: `linear-gradient(135deg, ${t.primary_color || '#3B82F6'}, ${t.accent_color || '#8B5CF6'})` }}>
                            {t.name?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{t.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono truncate">{t.slug}</p>
                        </div>
                      </div>

                      {/* Center: Quick stats */}
                      <div className="flex-1 grid grid-cols-3 sm:grid-cols-6 gap-2">
                        <StatCell icon={Users} label="Membros" value={stats.members} />
                        <StatCell icon={ClipboardList} label="Total OS" value={stats.totalOS} />
                        <StatCell icon={Clock} label="Abertas" value={stats.openOS} color="text-blue-500" />
                        <StatCell icon={TrendingUp} label="Execução" value={stats.inProgressOS} color="text-amber-500" />
                        <StatCell icon={CheckCircle2} label="Resolvidas" value={stats.resolvedOS} color="text-emerald-500" />
                        <StatCell icon={AlertTriangle} label="Atrasadas" value={stats.overdueOS} color="text-destructive" highlight={stats.overdueOS > 0} />
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 lg:w-auto shrink-0">
                        <Badge variant={t.is_active ? 'default' : 'secondary'} className="text-[10px] h-5">
                          {t.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => setDetailDept(t)} title="Detalhes">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => openEdit(t)} title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" title="Excluir">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir departamento "{t.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação é irreversível. Todos os vínculos de membros serão removidos. Se houver dados vinculados (OS, ativos, estoque, etc.), a exclusão será bloqueada.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deleteMutation.mutate(t.id)}
                                >
                                  Excluir permanentemente
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Switch checked={t.is_active} onCheckedChange={v => toggleActive.mutate({ id: t.id, is_active: v })} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailDept} onOpenChange={v => !v && setDetailDept(null)}>
        <DialogContent className="rounded-xl max-w-lg">
          {detailDept && <DeptDetailContent dept={detailDept} stats={getDeptStats(detailDept.id)} roles={getRoleCounts(detailDept.id)} roleLabel={roleLabel} />}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Departamento' : 'Novo Departamento'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Atualize as informações do departamento' : 'Preencha os dados para criar um novo departamento'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: TI, Manutenção Predial" className="rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Slug (identificador único)</Label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} placeholder="ex: ti, manutencao-predial" className="rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1"><Palette className="h-3 w-3" /> Cor Primária</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="h-8 w-8 rounded cursor-pointer" />
                  <Input value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="flex-1 font-mono text-xs rounded-lg" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1"><Palette className="h-3 w-3" /> Cor Destaque</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="h-8 w-8 rounded cursor-pointer" />
                  <Input value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="flex-1 font-mono text-xs rounded-lg" />
                </div>
              </div>
            </div>
            {/* Preview */}
            <div className="rounded-lg overflow-hidden border border-border">
              <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${form.primary_color}, ${form.accent_color})` }} />
              <div className="p-3 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.accent_color})` }}>
                  {form.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span className="text-sm font-semibold">{form.name || 'Preview'}</span>
              </div>
            </div>
            <Button className="w-full rounded-lg" onClick={() => saveMutation.mutate()} disabled={!form.name || !form.slug || saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Departamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCell({ icon: Icon, label, value, color, highlight }: { icon: React.ElementType; label: string; value: number; color?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-2 text-center ${highlight ? 'bg-destructive/10' : 'bg-muted/30'}`}>
      <p className={`text-base font-bold tabular-nums ${color || ''}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

function DeptDetailContent({ dept, stats, roles, roleLabel }: { dept: any; stats: DeptStats; roles: Record<string, number>; roleLabel: Record<string, string> }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        {dept.logo_url ? (
          <img src={dept.logo_url} alt={dept.name} className="h-12 w-12 rounded-xl object-contain bg-muted/30 p-0.5" />
        ) : (
          <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white text-lg font-bold"
            style={{ background: `linear-gradient(135deg, ${dept.primary_color || '#3B82F6'}, ${dept.accent_color || '#8B5CF6'})` }}>
            {dept.name?.charAt(0)?.toUpperCase()}
          </div>
        )}
        <div>
          <h3 className="text-base font-bold">{dept.name}</h3>
          <p className="text-xs text-muted-foreground font-mono">{dept.slug}</p>
        </div>
        <Badge variant={dept.is_active ? 'default' : 'secondary'} className="ml-auto text-[10px] h-5">
          {dept.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-8">
          <TabsTrigger value="overview" className="text-xs">Visão Geral</TabsTrigger>
          <TabsTrigger value="team" className="text-xs">Equipe</TabsTrigger>
          <TabsTrigger value="resources" className="text-xs">Recursos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <StatCell icon={ClipboardList} label="Total OS" value={stats.totalOS} />
            <StatCell icon={Clock} label="Abertas" value={stats.openOS} color="text-blue-500" />
            <StatCell icon={TrendingUp} label="Execução" value={stats.inProgressOS} color="text-amber-500" />
            <StatCell icon={CheckCircle2} label="Resolvidas" value={stats.resolvedOS} color="text-emerald-500" />
            <StatCell icon={Zap} label="Críticas" value={stats.criticalOS} color="text-destructive" highlight={stats.criticalOS > 0} />
            <StatCell icon={AlertTriangle} label="Atrasadas" value={stats.overdueOS} color="text-destructive" highlight={stats.overdueOS > 0} />
          </div>
          {stats.totalOS > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Taxa de Resolução</span>
                <span className="font-semibold">{Math.round((stats.resolvedOS / stats.totalOS) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(stats.resolvedOS / stats.totalOS) * 100}%` }} />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-3 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{stats.members} membros ativos</span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(roles).sort((a, b) => b[1] - a[1]).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">{roleLabel[role] || role}</span>
                </div>
                <Badge variant="outline" className="text-[10px] h-5">{count}</Badge>
              </div>
            ))}
            {Object.keys(roles).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum membro ativo</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="resources" className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-base font-bold">{stats.stockItems}</p>
                <p className="text-[10px] text-muted-foreground">Itens de Estoque</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-base font-bold">{stats.assets}</p>
                <p className="text-[10px] text-muted-foreground">Ativos</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex gap-1">
              <div className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: dept.primary_color || '#3B82F6' }} title="Primária" />
              <div className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: dept.accent_color || '#8B5CF6' }} title="Destaque" />
            </div>
            <span className="text-[10px] text-muted-foreground ml-1">{dept.primary_color} · {dept.accent_color}</span>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

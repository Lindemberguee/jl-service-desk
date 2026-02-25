import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Building2, Pencil, Palette, Users, ClipboardList } from 'lucide-react';

export default function AdminDepartments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', slug: '', primary_color: '#3B82F6', accent_color: '#8B5CF6' });

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
      const { data, error } = await supabase.from('user_memberships').select('tenant_id, is_active');
      if (error) throw error;
      return data;
    },
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ['admin_dept_orders_count'],
    queryFn: async () => {
      const { data, error } = await supabase.from('work_orders').select('tenant_id, status').is('deleted_at', null);
      if (error) throw error;
      return data;
    },
  });

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_tenants'] });
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin_tenants'] }); toast({ title: 'Status alterado!' }); },
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Departamentos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gerencie os departamentos/setores da organização</p>
        </div>
        <Button size="sm" onClick={openNew} className="h-9 gap-1.5 rounded-lg">
          <Plus className="h-3.5 w-3.5" />Novo Departamento
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : tenants.length === 0 ? (
        <Card className="border-border shadow-none rounded-xl">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum departamento cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tenants.map((t: any) => {
            const members = allMemberships.filter((m: any) => m.tenant_id === t.id && m.is_active).length;
            const orders = allOrders.filter((o: any) => o.tenant_id === t.id).length;
            const openOrders = allOrders.filter((o: any) => o.tenant_id === t.id && ['aberta', 'em_execucao'].includes(o.status)).length;

            return (
              <Card key={t.id} className={`border-border shadow-none rounded-xl overflow-hidden transition-all ${!t.is_active ? 'opacity-60' : ''}`}>
                {/* Color bar */}
                <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${t.primary_color || '#3B82F6'}, ${t.accent_color || '#8B5CF6'})` }} />
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: t.primary_color || '#3B82F6' }}>
                        <Building2 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{t.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{t.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={t.is_active} onCheckedChange={v => toggleActive.mutate({ id: t.id, is_active: v })} />
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => openEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-muted/40 rounded-lg p-2.5 text-center">
                      <Users className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-lg font-bold">{members}</p>
                      <p className="text-[10px] text-muted-foreground">Membros</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-2.5 text-center">
                      <ClipboardList className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-lg font-bold">{orders}</p>
                      <p className="text-[10px] text-muted-foreground">Total OS</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-2.5 text-center">
                      <ClipboardList className="h-3.5 w-3.5 mx-auto text-primary mb-1" />
                      <p className="text-lg font-bold text-primary">{openOrders}</p>
                      <p className="text-[10px] text-muted-foreground">Abertas</p>
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex gap-1">
                      <div className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: t.primary_color || '#3B82F6' }} title="Primária" />
                      <div className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: t.accent_color || '#8B5CF6' }} title="Destaque" />
                    </div>
                    <Badge variant={t.is_active ? 'default' : 'secondary'} className="text-[10px] h-5 ml-auto">
                      {t.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Departamento' : 'Novo Departamento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: TI, Manutenção Predial" className="rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label>Slug (identificador único)</Label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} placeholder="ex: ti, manutencao-predial" className="rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Palette className="h-3 w-3" /> Cor Primária</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="h-8 w-8 rounded cursor-pointer" />
                  <Input value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="flex-1 font-mono text-xs rounded-lg" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Palette className="h-3 w-3" /> Cor Destaque</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="h-8 w-8 rounded cursor-pointer" />
                  <Input value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="flex-1 font-mono text-xs rounded-lg" />
                </div>
              </div>
            </div>
            {/* Preview */}
            <div className="rounded-lg overflow-hidden border border-border">
              <div className="h-2" style={{ background: `linear-gradient(90deg, ${form.primary_color}, ${form.accent_color})` }} />
              <div className="p-3 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: form.primary_color }}>
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium">{form.name || 'Preview'}</span>
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

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Building2, Pencil, Palette } from 'lucide-react';

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
        // Auto-add current user as super_admin of new department
        if (data && user) {
          await supabase.from('user_memberships').insert({
            tenant_id: data.id, user_id: user.id, role: 'admin' as any,
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_tenants'] });
      toast({ title: editing ? 'Departamento atualizado!' : 'Departamento criado!' });
      setOpen(false);
      setEditing(null);
      setForm({ name: '', slug: '', primary_color: '#3B82F6', accent_color: '#8B5CF6' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('tenants').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_tenants'] });
      toast({ title: 'Status alterado!' });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Departamentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os departamentos/setores da organização</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Departamento</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Cores</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {t.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{t.slug}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: t.primary_color || '#3B82F6' }} title="Primária" />
                        <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: t.accent_color || '#8B5CF6' }} title="Destaque" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{t.plan}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={t.is_active}
                        onCheckedChange={v => toggleActive.mutate({ id: t.id, is_active: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Departamento' : 'Novo Departamento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: TI, Manutenção Predial" />
            </div>
            <div className="space-y-2">
              <Label>Slug (identificador único)</Label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} placeholder="ex: ti, manutencao-predial" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Palette className="h-3 w-3" /> Cor Primária</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="h-8 w-8 rounded cursor-pointer" />
                  <Input value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="flex-1 font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Palette className="h-3 w-3" /> Cor Destaque</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="h-8 w-8 rounded cursor-pointer" />
                  <Input value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="flex-1 font-mono text-xs" />
                </div>
              </div>
            </div>
            <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={!form.name || !form.slug || saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Departamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

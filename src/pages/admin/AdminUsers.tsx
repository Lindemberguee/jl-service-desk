import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { roleLabels, type AppRole } from '@/lib/permissions';
import { UserPlus, Building2, Search, Users, Filter, Mail, Shield, ChevronDown, ChevronUp } from 'lucide-react';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  avatar_url: string | null;
}

interface MembershipData {
  id: string;
  user_id: string;
  tenant_id: string;
  role: AppRole;
  is_active: boolean;
  permissions: string[] | null;
  tenants: { name: string } | null;
}

interface TenantData {
  id: string;
  name: string;
  slug: string;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // UI state
  const [search, setSearch] = useState('');
  const [filterTenant, setFilterTenant] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Dialog state
  const [addAccessOpen, setAddAccessOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Form state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('tecnico');

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteTenantId, setInviteTenantId] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('tecnico');

  const { data: tenants = [] } = useQuery({
    queryKey: ['admin_tenants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenants').select('*').order('name');
      if (error) throw error;
      return data as TenantData[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('name');
      if (error) throw error;
      return data as ProfileData[];
    },
  });

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['admin_memberships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_memberships')
        .select('id, user_id, tenant_id, role, is_active, permissions, tenants!user_memberships_tenant_id_fkey(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MembershipData[];
    },
  });

  // Filtered & grouped users
  const userGroups = useMemo(() => {
    const groups = profiles.map(p => ({
      ...p,
      memberships: memberships.filter(m => m.user_id === p.id),
    }));

    return groups.filter(u => {
      if (u.memberships.length === 0) return false;
      const matchesSearch = !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesTenant = filterTenant === 'all' ||
        u.memberships.some(m => m.tenant_id === filterTenant);
      const matchesRole = filterRole === 'all' ||
        u.memberships.some(m => m.role === filterRole);
      return matchesSearch && matchesTenant && matchesRole;
    });
  }, [profiles, memberships, search, filterTenant, filterRole]);

  const usersWithoutAccess = useMemo(() =>
    profiles.filter(p => !memberships.some(m => m.user_id === p.id)),
    [profiles, memberships]
  );

  const addMembership = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('user_memberships').insert({
        user_id: selectedUserId,
        tenant_id: selectedTenantId,
        role: selectedRole as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_memberships'] });
      toast({ title: 'Acesso adicionado com sucesso!' });
      setAddAccessOpen(false);
      resetAddForm();
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase.from('user_memberships').update({ role: role as any }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_memberships'] });
      toast({ title: 'Papel atualizado!' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('user_memberships').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_memberships'] });
      toast({ title: 'Status alterado!' });
    },
  });

  const removeMembership = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_memberships').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_memberships'] });
      toast({ title: 'Acesso removido!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  function resetAddForm() {
    setSelectedUserId('');
    setSelectedTenantId('');
    setSelectedRole('tecnico');
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive' as const;
      case 'admin': return 'default' as const;
      case 'coordenador': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  const totalUsers = userGroups.length;
  const totalMemberships = memberships.length;
  const activeMembers = memberships.filter(m => m.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários & Acessos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie acessos de usuários em cada departamento
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAddAccessOpen(true)}>
            <Shield className="h-4 w-4 mr-2" />
            Vincular Acesso
          </Button>
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Convidar Usuário
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalUsers}</p>
              <p className="text-xs text-muted-foreground">Usuários ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalMemberships}</p>
              <p className="text-xs text-muted-foreground">Vínculos totais</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeMembers}</p>
              <p className="text-xs text-muted-foreground">Acessos ativos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterTenant} onValueChange={setFilterTenant}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos departamentos</SelectItem>
            {tenants.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Shield className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Papel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos papéis</SelectItem>
            {Object.entries(roleLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* User List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : userGroups.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum usuário encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {userGroups.map(user => {
            const isExpanded = expandedUser === user.id;
            return (
              <Card key={user.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* User Header */}
                  <button
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {user.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1 flex-wrap justify-end">
                        {user.memberships.map(m => (
                          <Badge key={m.id} variant={getRoleBadgeVariant(m.role)} className="text-xs">
                            {m.tenants?.name ? `${m.tenants.name}` : 'N/A'}
                          </Badge>
                        ))}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground ml-2" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Acessos por departamento
                      </p>
                      {user.memberships.map(m => (
                        <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm flex-1 font-medium">{m.tenants?.name || '—'}</span>
                          <Select
                            value={m.role}
                            onValueChange={v => updateRole.mutate({ id: m.id, role: v })}
                          >
                            <SelectTrigger className="w-[150px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(roleLabels).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {m.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                            <Switch
                              checked={m.is_active}
                              onCheckedChange={v => toggleActive.mutate({ id: m.id, is_active: v })}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive h-8 px-2 text-xs"
                            onClick={() => {
                              if (confirm('Remover este acesso?')) {
                                removeMembership.mutate(m.id);
                              }
                            }}
                          >
                            Remover
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setAddAccessOpen(true);
                        }}
                      >
                        <Building2 className="h-3 w-3 mr-1" />
                        Adicionar departamento
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Users without access */}
      {usersWithoutAccess.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2 text-muted-foreground">
              Usuários sem acesso ({usersWithoutAccess.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {usersWithoutAccess.map(u => (
                <Badge key={u.id} variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => {
                  setSelectedUserId(u.id);
                  setAddAccessOpen(true);
                }}>
                  {u.name || u.email}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Access Dialog */}
      <Dialog open={addAccessOpen} onOpenChange={v => { setAddAccessOpen(v); if (!v) resetAddForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Acesso a Departamento</DialogTitle>
            <DialogDescription>Selecione o usuário, departamento e papel desejado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger><SelectValue placeholder="Selecione o usuário" /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger><SelectValue placeholder="Selecione o departamento" /></SelectTrigger>
                <SelectContent>
                  {tenants.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!selectedUserId || !selectedTenantId || addMembership.isPending}
              onClick={() => addMembership.mutate()}
            >
              {addMembership.isPending ? 'Salvando...' : 'Vincular Acesso'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Novo Usuário</DialogTitle>
            <DialogDescription>
              O usuário receberá um email para criar sua conta e já terá acesso ao departamento selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Nome completo"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@empresa.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Departamento inicial</Label>
              <Select value={inviteTenantId} onValueChange={setInviteTenantId}>
                <SelectTrigger><SelectValue placeholder="Selecione o departamento" /></SelectTrigger>
                <SelectContent>
                  {tenants.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!inviteEmail || !inviteName || !inviteTenantId}
              onClick={() => {
                toast({
                  title: 'Funcionalidade em breve',
                  description: 'O convite por email será implementado em breve. Por enquanto, peça ao usuário que se cadastre e depois vincule o acesso manualmente.',
                });
                setInviteOpen(false);
              }}
            >
              <Mail className="h-4 w-4 mr-2" />
              Enviar Convite
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

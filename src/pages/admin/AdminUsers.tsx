import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import {
  UserPlus, Building2, Search, Users, Filter, Shield,
  ChevronDown, ChevronUp, KeyRound, UserX, ScrollText, Eye, EyeOff,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

interface AuditLogEntry {
  id: string;
  entity: string;
  entity_id: string | null;
  action: string;
  actor_user_id: string | null;
  diff: Record<string, unknown> | null;
  created_at: string;
  ip: string | null;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterTenant, setFilterTenant] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('users');

  // Dialogs
  const [addAccessOpen, setAddAccessOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [changePwUserId, setChangePwUserId] = useState('');
  const [changePwUserName, setChangePwUserName] = useState('');

  // Create user form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newTenantId, setNewTenantId] = useState('');
  const [newRole, setNewRole] = useState<string>('tecnico');
  const [showNewPw, setShowNewPw] = useState(false);

  // Add access form
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('tecnico');

  // Change password form
  const [newPw, setNewPw] = useState('');
  const [showChangePw, setShowChangePw] = useState(false);

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

  const { data: auditLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['admin_audit_logs_users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .in('entity', ['user', 'membership'])
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as AuditLogEntry[];
    },
    enabled: activeTab === 'audit',
  });

  const userGroups = useMemo(() => {
    const groups = profiles.map(p => ({
      ...p,
      memberships: memberships.filter(m => m.user_id === p.id),
    }));

    return groups.filter(u => {
      if (u.memberships.length === 0 && !search) return false;
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

  // Mutations
  const createUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'create_user',
          email: newEmail,
          password: newPassword,
          name: newName,
          tenant_id: newTenantId || undefined,
          role: newRole,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_profiles'] });
      qc.invalidateQueries({ queryKey: ['admin_memberships'] });
      toast({ title: 'Usuário criado com sucesso!' });
      setCreateUserOpen(false);
      resetCreateForm();
    },
    onError: (err: any) => toast({ title: 'Erro ao criar usuário', description: err.message, variant: 'destructive' }),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'change_password', user_id: changePwUserId, new_password: newPw },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast({ title: 'Senha alterada com sucesso!' });
      setChangePwOpen(false);
      setNewPw('');
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const toggleUserActive = useMutation({
    mutationFn: async ({ user_id, is_active }: { user_id: string; is_active: boolean }) => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'toggle_user_active', user_id, is_active },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_profiles'] });
      qc.invalidateQueries({ queryKey: ['admin_memberships'] });
      toast({ title: 'Status do usuário alterado!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

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
      toast({ title: 'Acesso adicionado!' });
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

  const toggleMembershipActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('user_memberships').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_memberships'] });
      toast({ title: 'Acesso atualizado!' });
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
  });

  function resetCreateForm() {
    setNewName(''); setNewEmail(''); setNewPassword(''); setNewTenantId(''); setNewRole('tecnico');
  }
  function resetAddForm() {
    setSelectedUserId(''); setSelectedTenantId(''); setSelectedRole('tecnico');
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive' as const;
      case 'admin': return 'default' as const;
      case 'coordenador': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  const getAuditActionLabel = (action: string) => {
    const map: Record<string, string> = {
      'user.created': 'Usuário criado',
      'user.password_changed': 'Senha alterada',
      'user.deactivated': 'Conta desativada',
      'user.reactivated': 'Conta reativada',
      'membership.created': 'Acesso adicionado',
      'membership.updated': 'Acesso atualizado',
      'membership.deleted': 'Acesso removido',
    };
    return map[action] || action;
  };

  const getActorName = (actorId: string | null) => {
    if (!actorId) return 'Sistema';
    const p = profiles.find(p => p.id === actorId);
    return p?.name || 'Desconhecido';
  };

  const totalUsers = profiles.length;
  const activeUsers = profiles.filter(p => p.is_active).length;
  const totalMemberships = memberships.filter(m => m.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários & Acessos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie contas, acessos e permissões do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAddAccessOpen(true)}>
            <Shield className="h-4 w-4 mr-2" />
            Vincular Acesso
          </Button>
          <Button onClick={() => setCreateUserOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Nova Conta
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
              <p className="text-2xl font-bold">{activeUsers}<span className="text-sm text-muted-foreground font-normal">/{totalUsers}</span></p>
              <p className="text-xs text-muted-foreground">Contas ativas</p>
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
              <p className="text-xs text-muted-foreground">Acessos ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ScrollText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tenants.length}</p>
              <p className="text-xs text-muted-foreground">Departamentos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="departments">Por Departamento</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 mt-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterTenant} onValueChange={setFilterTenant}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos departamentos</SelectItem>
                {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Shield className="h-4 w-4 mr-2" /><SelectValue placeholder="Papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos papéis</SelectItem>
                {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* User List */}
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
          ) : userGroups.length === 0 ? (
            <Card><CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum usuário encontrado</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {userGroups.map(user => {
                const isExpanded = expandedUser === user.id;
                return (
                  <Card key={user.id} className={`overflow-hidden ${!user.is_active ? 'opacity-60' : ''}`}>
                    <CardContent className="p-0">
                      <button
                        className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                        onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold ${user.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            {user.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{user.name}</p>
                              {!user.is_active && <Badge variant="destructive" className="text-xs">Inativo</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1 flex-wrap justify-end">
                            {user.memberships.slice(0, 3).map(m => (
                              <Badge key={m.id} variant={getRoleBadgeVariant(m.role)} className="text-xs">
                                {m.tenants?.name || 'N/A'}
                              </Badge>
                            ))}
                            {user.memberships.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{user.memberships.length - 3}</Badge>
                            )}
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-2" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                          {/* Quick actions */}
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => {
                              setChangePwUserId(user.id);
                              setChangePwUserName(user.name);
                              setChangePwOpen(true);
                            }}>
                              <KeyRound className="h-3 w-3 mr-1" /> Alterar Senha
                            </Button>
                            <Button
                              variant={user.is_active ? "outline" : "default"}
                              size="sm"
                              onClick={() => {
                                if (confirm(user.is_active ? `Desativar a conta de ${user.name}?` : `Reativar a conta de ${user.name}?`)) {
                                  toggleUserActive.mutate({ user_id: user.id, is_active: !user.is_active });
                                }
                              }}
                            >
                              <UserX className="h-3 w-3 mr-1" />
                              {user.is_active ? 'Desativar Conta' : 'Reativar Conta'}
                            </Button>
                          </div>

                          {/* Memberships */}
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Acessos por departamento
                          </p>
                          {user.memberships.map(m => (
                            <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm flex-1 font-medium">{m.tenants?.name || '—'}</span>
                              <Select value={m.role} onValueChange={v => updateRole.mutate({ id: m.id, role: v })}>
                                <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{m.is_active ? 'Ativo' : 'Inativo'}</span>
                                <Switch checked={m.is_active} onCheckedChange={v => toggleMembershipActive.mutate({ id: m.id, is_active: v })} />
                              </div>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-8 px-2 text-xs"
                                onClick={() => { if (confirm('Remover este acesso?')) removeMembership.mutate(m.id); }}>
                                Remover
                              </Button>
                            </div>
                          ))}
                          <Button variant="outline" size="sm" onClick={() => { setSelectedUserId(user.id); setAddAccessOpen(true); }}>
                            <Building2 className="h-3 w-3 mr-1" /> Adicionar departamento
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="departments" className="space-y-4 mt-4">
          {tenants.map(tenant => {
            const tenantMembers = memberships.filter(m => m.tenant_id === tenant.id);
            const activeMembers = tenantMembers.filter(m => m.is_active);
            const roleBreakdown = activeMembers.reduce((acc, m) => {
              acc[m.role] = (acc[m.role] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            return (
              <Card key={tenant.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">{tenant.name}</h3>
                      <Badge variant="outline" className="text-xs">{activeMembers.length} membro(s)</Badge>
                    </div>
                  </div>

                  {/* Role breakdown badges */}
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.entries(roleBreakdown).map(([role, count]) => (
                      <Badge key={role} variant={getRoleBadgeVariant(role)} className="text-xs gap-1">
                        <Shield className="h-2.5 w-2.5" />
                        {roleLabels[role as keyof typeof roleLabels] || role}: {count}
                      </Badge>
                    ))}
                  </div>

                  {/* Members list */}
                  {activeMembers.length > 0 && (
                    <div className="border border-border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Nome</TableHead>
                            <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground">Email</TableHead>
                            <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[150px]">Papel</TableHead>
                            <TableHead className="text-[11px] font-semibold uppercase text-muted-foreground w-[80px]">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tenantMembers.map(m => {
                            const p = profiles.find(p => p.id === m.user_id);
                            return (
                              <TableRow key={m.id} className={!m.is_active ? 'opacity-50' : ''}>
                                <TableCell className="text-sm font-medium">{p?.name || '—'}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{p?.email || '—'}</TableCell>
                                <TableCell>
                                  <Select value={m.role} onValueChange={v => updateRole.mutate({ id: m.id, role: v })}>
                                    <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Switch checked={m.is_active} onCheckedChange={v => toggleMembershipActive.mutate({ id: m.id, is_active: v })} />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {logsLoading ? (
                <div className="p-4 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : auditLogs.length === 0 ? (
                <div className="p-8 text-center">
                  <ScrollText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nenhum log de auditoria encontrado</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {auditLogs.map(log => (
                    <div key={log.id} className="p-4 flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <ScrollText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">{getAuditActionLabel(log.action)}</Badge>
                          <span className="text-xs text-muted-foreground">
                            por {getActorName(log.actor_user_id)}
                          </span>
                        </div>
                        {log.diff && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {Object.entries(log.diff).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={createUserOpen} onOpenChange={v => { setCreateUserOpen(v); if (!v) resetCreateForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Conta</DialogTitle>
            <DialogDescription>Crie uma conta e vincule ao departamento desejado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input placeholder="Nome do usuário" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="email@empresa.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Senha inicial</Label>
              <div className="relative">
                <Input
                  type={showNewPw ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNewPw(!showNewPw)}>
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Departamento (opcional)</Label>
              <Select value={newTenantId} onValueChange={setNewTenantId}>
                <SelectTrigger><SelectValue placeholder="Selecione o departamento" /></SelectTrigger>
                <SelectContent>
                  {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {newTenantId && (
              <div className="space-y-2">
                <Label>Papel</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button className="w-full" disabled={!newName || !newEmail || !newPassword || newPassword.length < 6 || createUser.isPending}
              onClick={() => createUser.mutate()}>
              {createUser.isPending ? 'Criando...' : 'Criar Conta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Access Dialog */}
      <Dialog open={addAccessOpen} onOpenChange={v => { setAddAccessOpen(v); if (!v) resetAddForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Acesso a Departamento</DialogTitle>
            <DialogDescription>Selecione o usuário, departamento e papel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.email})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={!selectedUserId || !selectedTenantId || addMembership.isPending}
              onClick={() => addMembership.mutate()}>
              {addMembership.isPending ? 'Salvando...' : 'Vincular Acesso'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={changePwOpen} onOpenChange={v => { setChangePwOpen(v); if (!v) { setNewPw(''); setShowChangePw(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>Defina uma nova senha para {changePwUserName}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <div className="relative">
                <Input
                  type={showChangePw ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowChangePw(!showChangePw)}>
                  {showChangePw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button className="w-full" disabled={!newPw || newPw.length < 6 || changePassword.isPending}
              onClick={() => changePassword.mutate()}>
              {changePassword.isPending ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/lib/audit';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { roleLabels, type AppRole } from '@/lib/permissions';
import {
  UserPlus, Building2, Search, Users, Shield,
  ChevronDown, ChevronUp, KeyRound, UserX, ScrollText, Eye, EyeOff,
  MoreHorizontal, Trash2, Power, Plus, UserCheck,
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
  const { user } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterTenant, setFilterTenant] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('users');

  // Dialogs
  const [addAccessOpen, setAddAccessOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [changePwUserId, setChangePwUserId] = useState('');
  const [changePwUserName, setChangePwUserName] = useState('');

  // Delete confirm
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState('');
  const [deleteUserName, setDeleteUserName] = useState('');

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
      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'active' && u.is_active) ||
        (filterStatus === 'inactive' && !u.is_active);
      return matchesSearch && matchesTenant && matchesRole && matchesStatus;
    });
  }, [profiles, memberships, search, filterTenant, filterRole, filterStatus]);

  // Mutations
  const createUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'create_user', email: newEmail, password: newPassword, name: newName, tenant_id: newTenantId || undefined, role: newRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: async () => {
      await logAudit({ entity: 'user', action: 'user.created', diff: { name: newName, email: newEmail, role: newRole, tenant_id: newTenantId } });
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
    onSuccess: async () => {
      await logAudit({ entity: 'user', entityId: changePwUserId, action: 'user.password_changed', diff: { changed_by: 'admin' } });
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
    onSuccess: async (_: any, vars: { user_id: string; is_active: boolean }) => {
      await logAudit({ entity: 'user', entityId: vars.user_id, action: vars.is_active ? 'user.activated' : 'user.deactivated', diff: { is_active: vars.is_active } });
      qc.invalidateQueries({ queryKey: ['admin_profiles'] });
      qc.invalidateQueries({ queryKey: ['admin_memberships'] });
      toast({ title: vars.is_active ? 'Conta reativada!' : 'Conta desativada!' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'delete_user', user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: async () => {
      await logAudit({ entity: 'user', entityId: deleteUserId, action: 'user.deleted', diff: { name: deleteUserName, deleted_by: 'admin' } });
      qc.invalidateQueries({ queryKey: ['admin_profiles'] });
      qc.invalidateQueries({ queryKey: ['admin_memberships'] });
      toast({ title: 'Usuário excluído permanentemente' });
      setDeleteConfirmOpen(false);
      setExpandedUser(null);
    },
    onError: (err: any) => toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' }),
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
    onSuccess: async () => {
      await logAudit({ entity: 'membership', action: 'membership.created', diff: { user_id: selectedUserId, tenant_id: selectedTenantId, role: selectedRole } });
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
    onSuccess: async (_: any, vars: { id: string; role: string }) => {
      await logAudit({ entity: 'membership', entityId: vars.id, action: 'membership.role_changed', diff: { new_role: vars.role } });
      qc.invalidateQueries({ queryKey: ['admin_memberships'] });
      toast({ title: 'Papel atualizado!' });
    },
  });

  const isSelfMembership = (membershipId: string) => {
    const membership = memberships.find((m: any) => m.id === membershipId);
    return membership?.user_id === user?.id;
  };

  const toggleMembershipActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (!is_active && isSelfMembership(id)) {
        throw new Error('SELF_ACTION');
      }
      const { error } = await supabase.from('user_memberships').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: async (_: any, vars: { id: string; is_active: boolean }) => {
      await logAudit({ entity: 'membership', entityId: vars.id, action: vars.is_active ? 'membership.activated' : 'membership.deactivated', diff: { is_active: vars.is_active } });
      qc.invalidateQueries({ queryKey: ['admin_memberships'] });
      toast({ title: 'Acesso atualizado!' });
    },
    onError: (err: any) => {
      if (err.message === 'SELF_ACTION') {
        toast({ title: 'Ação bloqueada', description: 'Você não pode desativar seu próprio acesso.', variant: 'destructive' });
      }
    },
  });

  const removeMembership = useMutation({
    mutationFn: async (id: string) => {
      if (isSelfMembership(id)) {
        throw new Error('SELF_ACTION');
      }
      const { error } = await supabase.from('user_memberships').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async (_: any, id: string) => {
      await logAudit({ entity: 'membership', entityId: id, action: 'membership.deleted' });
      qc.invalidateQueries({ queryKey: ['admin_memberships'] });
      toast({ title: 'Acesso removido!' });
    },
    onError: (err: any) => {
      if (err.message === 'SELF_ACTION') {
        toast({ title: 'Ação bloqueada', description: 'Você não pode remover seu próprio acesso.', variant: 'destructive' });
      }
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
      'user.activated': 'Conta ativada',
      'user.deleted': 'Usuário excluído',
      'membership.created': 'Acesso adicionado',
      'membership.updated': 'Acesso atualizado',
      'membership.deleted': 'Acesso removido',
      'membership.role_changed': 'Papel alterado',
      'membership.activated': 'Acesso ativado',
      'membership.deactivated': 'Acesso desativado',
    };
    return map[action] || action;
  };

  const getAuditIcon = (action: string) => {
    if (action.includes('deleted')) return <Trash2 className="h-3.5 w-3.5 text-destructive" />;
    if (action.includes('created')) return <UserPlus className="h-3.5 w-3.5 text-primary" />;
    if (action.includes('deactivated')) return <UserX className="h-3.5 w-3.5 text-destructive/70" />;
    if (action.includes('activated') || action.includes('reactivated')) return <UserCheck className="h-3.5 w-3.5 text-primary" />;
    if (action.includes('password')) return <KeyRound className="h-3.5 w-3.5 text-accent-foreground" />;
    return <ScrollText className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const getActorName = (actorId: string | null) => {
    if (!actorId) return 'Sistema';
    const p = profiles.find(p => p.id === actorId);
    return p?.name || 'Desconhecido';
  };

  const totalUsers = profiles.length;
  const activeUsers = profiles.filter(p => p.is_active).length;
  const inactiveUsers = totalUsers - activeUsers;
  const totalMemberships = memberships.filter(m => m.is_active).length;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Usuários & Acessos</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie contas, acessos e permissões
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddAccessOpen(true)}>
              <Shield className="h-4 w-4 mr-1.5" />
              Vincular Acesso
            </Button>
            <Button size="sm" onClick={() => setCreateUserOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1.5" />
              Nova Conta
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: totalUsers, icon: Users, color: 'text-primary' },
            { label: 'Ativos', value: activeUsers, icon: UserCheck, color: 'text-primary' },
            { label: 'Inativos', value: inactiveUsers, icon: UserX, color: 'text-destructive' },
            { label: 'Departamentos', value: tenants.length, icon: Building2, color: 'text-primary' },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="p-3 flex items-center gap-3">
                <stat.icon className={`h-5 w-5 ${stat.color} shrink-0`} />
                <div>
                  <p className="text-xl font-bold leading-none">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="departments">Departamentos</TabsTrigger>
            <TabsTrigger value="audit">Auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4 mt-4">
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
              </div>
              <Select value={filterTenant} onValueChange={setFilterTenant}>
                <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs">
                  <Building2 className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos departamentos</SelectItem>
                  {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs">
                  <Shield className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos papéis</SelectItem>
                  {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs">
                  <Power className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">{userGroups.length} usuário(s) encontrado(s)</p>

            {/* User List */}
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
            ) : userGroups.length === 0 ? (
              <Card><CardContent className="p-12 text-center">
                <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {userGroups.map(user => {
                  const isExpanded = expandedUser === user.id;
                  return (
                    <Card key={user.id} className={`transition-all ${!user.is_active ? 'opacity-50' : ''} ${isExpanded ? 'ring-1 ring-primary/20' : ''}`}>
                      <CardContent className="p-0">
                        <div className="flex items-center gap-3 p-3">
                          {/* Avatar */}
                          <button
                            className="flex items-center gap-3 flex-1 min-w-0 text-left"
                            onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                          >
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${user.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                              {user.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium truncate">{user.name}</p>
                                {!user.is_active && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Inativo</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </button>

                          {/* Roles badges */}
                          <div className="hidden sm:flex gap-1 flex-wrap justify-end max-w-[250px]">
                            {user.memberships.slice(0, 2).map(m => (
                              <Badge key={m.id} variant={getRoleBadgeVariant(m.role)} className="text-[10px] px-1.5 py-0">
                                {roleLabels[m.role as keyof typeof roleLabels] || m.role} · {m.tenants?.name?.substring(0, 12) || 'N/A'}
                              </Badge>
                            ))}
                            {user.memberships.length > 2 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{user.memberships.length - 2}</Badge>
                            )}
                          </div>

                          {/* Actions dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => {
                                setChangePwUserId(user.id);
                                setChangePwUserName(user.name);
                                setChangePwOpen(true);
                              }}>
                                <KeyRound className="h-4 w-4 mr-2" /> Alterar Senha
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                toggleUserActive.mutate({ user_id: user.id, is_active: !user.is_active });
                              }}>
                                <Power className="h-4 w-4 mr-2" />
                                {user.is_active ? 'Desativar Conta' : 'Reativar Conta'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedUserId(user.id);
                                setAddAccessOpen(true);
                              }}>
                                <Plus className="h-4 w-4 mr-2" /> Adicionar Acesso
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setDeleteUserId(user.id);
                                  setDeleteUserName(user.name);
                                  setDeleteConfirmOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir Permanente
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <button onClick={() => setExpandedUser(isExpanded ? null : user.id)} className="shrink-0">
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                              Acessos ({user.memberships.length})
                            </p>
                            {user.memberships.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">Nenhum acesso vinculado</p>
                            ) : (
                              <div className="space-y-1.5">
                                {user.memberships.map(m => (
                                  <div key={m.id} className="flex items-center gap-2 p-2.5 rounded-md bg-muted/30">
                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="text-xs flex-1 font-medium truncate">{m.tenants?.name || '—'}</span>
                                    <Select value={m.role} onValueChange={v => updateRole.mutate({ id: m.id, role: v })}>
                                      <SelectTrigger className="w-[130px] h-7 text-[11px]"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center">
                                          <Switch checked={m.is_active} onCheckedChange={v => toggleMembershipActive.mutate({ id: m.id, is_active: v })} />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>{m.is_active ? 'Desativar acesso' : 'Ativar acesso'}</TooltipContent>
                                    </Tooltip>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive"
                                      onClick={() => { if (confirm('Remover este acesso?')) removeMembership.mutate(m.id); }}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setSelectedUserId(user.id); setAddAccessOpen(true); }}>
                              <Plus className="h-3 w-3 mr-1" /> Adicionar departamento
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
                        <h3 className="font-semibold text-sm">{tenant.name}</h3>
                        <Badge variant="outline" className="text-[10px] px-1.5">{activeMembers.length} membro(s)</Badge>
                      </div>
                    </div>

                    <div className="flex gap-1 flex-wrap">
                      {Object.entries(roleBreakdown).map(([role, count]) => (
                        <Badge key={role} variant={getRoleBadgeVariant(role)} className="text-[10px] gap-0.5">
                          {roleLabels[role as keyof typeof roleLabels] || role}: {count}
                        </Badge>
                      ))}
                    </div>

                    {activeMembers.length > 0 && (
                      <div className="border border-border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-[10px] font-semibold uppercase text-muted-foreground h-8">Nome</TableHead>
                              <TableHead className="text-[10px] font-semibold uppercase text-muted-foreground h-8">Email</TableHead>
                              <TableHead className="text-[10px] font-semibold uppercase text-muted-foreground h-8 w-[140px]">Papel</TableHead>
                              <TableHead className="text-[10px] font-semibold uppercase text-muted-foreground h-8 w-[70px]">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tenantMembers.map(m => {
                              const p = profiles.find(p => p.id === m.user_id);
                              return (
                                <TableRow key={m.id} className={!m.is_active ? 'opacity-40' : ''}>
                                  <TableCell className="text-xs font-medium py-2">{p?.name || '—'}</TableCell>
                                  <TableCell className="text-[11px] text-muted-foreground py-2">{p?.email || '—'}</TableCell>
                                  <TableCell className="py-2">
                                    <Select value={m.role} onValueChange={v => updateRole.mutate({ id: m.id, role: v })}>
                                      <SelectTrigger className="h-6 text-[11px] w-[120px]"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="py-2">
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
                  <div className="p-4 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : auditLogs.length === 0 ? (
                  <div className="p-12 text-center">
                    <ScrollText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhum log de auditoria</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {auditLogs.map(log => (
                      <div key={log.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                          {getAuditIcon(log.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium">{getAuditActionLabel(log.action)}</span>
                            <span className="text-[11px] text-muted-foreground">
                              — {getActorName(log.actor_user_id)}
                            </span>
                          </div>
                          {log.diff && (
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {Object.entries(log.diff).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
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
              <DialogDescription>Crie uma conta e vincule ao departamento.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome completo</Label>
                <Input placeholder="Nome do usuário" value={newName} onChange={e => setNewName(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" placeholder="email@empresa.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Senha inicial</Label>
                <div className="relative">
                  <Input type={showNewPw ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-9 pr-9" />
                  <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowNewPw(!showNewPw)}>
                    {showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Departamento (opcional)</Label>
                <Select value={newTenantId} onValueChange={setNewTenantId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {newTenantId && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Papel</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button className="w-full" size="sm" disabled={!newName || !newEmail || !newPassword || newPassword.length < 6 || createUser.isPending}
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
              <DialogTitle>Vincular Acesso</DialogTitle>
              <DialogDescription>Selecione o usuário, departamento e papel.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Usuário</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.email})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Departamento</Label>
                <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Papel</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" size="sm" disabled={!selectedUserId || !selectedTenantId || addMembership.isPending}
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
              <DialogDescription>Nova senha para {changePwUserName}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nova senha</Label>
                <div className="relative">
                  <Input type={showChangePw ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={newPw} onChange={e => setNewPw(e.target.value)} className="h-9 pr-9" />
                  <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowChangePw(!showChangePw)}>
                    {showChangePw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <Button className="w-full" size="sm" disabled={!newPw || newPw.length < 6 || changePassword.isPending}
                onClick={() => changePassword.mutate()}>
                {changePassword.isPending ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete User Confirmation */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir usuário permanentemente?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá excluir <strong>{deleteUserName}</strong> permanentemente do sistema, incluindo todos os seus acessos e dados de autenticação. Esta ação <strong>não pode ser desfeita</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteUser.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  deleteUser.mutate(deleteUserId);
                }}
              >
                {deleteUser.isPending ? 'Excluindo...' : 'Excluir Permanentemente'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

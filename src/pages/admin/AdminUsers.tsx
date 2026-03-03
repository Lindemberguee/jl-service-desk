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
import { Progress } from '@/components/ui/progress';
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
  AlertTriangle, Lock,
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
  const { user, currentRole, subscription, currentTenantId, isSubscriptionActive, memberships: myMemberships } = useAuth();
  const qc = useQueryClient();
  const isSuperAdmin = currentRole === 'super_admin';
  const subActive = isSubscriptionActive();

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTenant, setFilterTenant] = useState<string>('all');
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

  // Tenants the current admin can manage
  const managedTenantIds = useMemo(() => {
    if (isSuperAdmin) return null; // null = all
    return myMemberships
      .filter(m => ['admin', 'super_admin'].includes(m.role))
      .map(m => m.tenant_id);
  }, [isSuperAdmin, myMemberships]);

  const { data: tenants = [] } = useQuery({
    queryKey: ['admin_tenants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenants').select('*').order('name');
      if (error) throw error;
      // Admin only sees their tenants
      if (managedTenantIds) {
        return (data as TenantData[]).filter(t => managedTenantIds.includes(t.id));
      }
      return data as TenantData[];
    },
  });

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['admin_memberships', managedTenantIds],
    queryFn: async () => {
      let query = supabase
        .from('user_memberships')
        .select('id, user_id, tenant_id, role, is_active, permissions, tenants!user_memberships_tenant_id_fkey(name)')
        .order('created_at', { ascending: false });

      // Admin: scope to their managed tenants
      if (managedTenantIds && managedTenantIds.length > 0) {
        query = query.in('tenant_id', managedTenantIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MembershipData[];
    },
  });

  // Get unique user IDs from memberships to fetch only relevant profiles
  const relevantUserIds = useMemo(() => {
    return [...new Set(memberships.map(m => m.user_id))];
  }, [memberships]);

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin_profiles', relevantUserIds],
    queryFn: async () => {
      if (isSuperAdmin) {
        const { data, error } = await supabase.from('profiles').select('*').order('name');
        if (error) throw error;
        return data as ProfileData[];
      }
      // Admin: only fetch profiles of users in their tenants
      if (relevantUserIds.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', relevantUserIds)
        .order('name');
      if (error) throw error;
      return data as ProfileData[];
    },
    enabled: isSuperAdmin || relevantUserIds.length > 0,
  });

  const { data: auditLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['admin_audit_logs_users'],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .in('entity', ['user', 'membership'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (managedTenantIds && managedTenantIds.length > 0) {
        query = query.in('tenant_id', managedTenantIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLogEntry[];
    },
    enabled: activeTab === 'audit',
  });

  // Subscription usage calculations — scoped to current tenant
  const currentTenantActiveUsers = useMemo(() => {
    if (!currentTenantId) return 0;
    return memberships.filter(m => m.tenant_id === currentTenantId && m.is_active).length;
  }, [memberships, currentTenantId]);

  const maxUsers = subscription?.max_users || 999;
  const usagePercent = Math.min((currentTenantActiveUsers / maxUsers) * 100, 100);
  const canCreateUser = isSuperAdmin || (subActive && currentTenantActiveUsers < maxUsers);
  const isAtLimit = !isSuperAdmin && currentTenantActiveUsers >= maxUsers;

  // Roles that non-super_admin can assign
  const availableRoles = useMemo(() => {
    if (isSuperAdmin) return Object.entries(roleLabels);
    return Object.entries(roleLabels).filter(([k]) => k !== 'super_admin');
  }, [isSuperAdmin]);

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

  // For non-super_admin, auto-set tenant on create
  const effectiveNewTenantId = isSuperAdmin ? newTenantId : (currentTenantId || '');

  // Mutations
  const createUser = useMutation({
    mutationFn: async () => {
      if (!canCreateUser) throw new Error('Limite de usuários do plano atingido.');
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'create_user', email: newEmail, password: newPassword, name: newName, tenant_id: effectiveNewTenantId || undefined, role: newRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: async () => {
      await logAudit({ entity: 'user', action: 'user.created', diff: { name: newName, email: newEmail, role: newRole, tenant_id: effectiveNewTenantId } });
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

  const totalUsers = userGroups.length;
  const activeUsers = userGroups.filter(p => p.is_active).length;
  const inactiveUsers = totalUsers - activeUsers;

  // Current tenant name for display
  const currentTenantName = tenants.find(t => t.id === currentTenantId)?.name || 'Departamento';

  const planLabel = subscription?.plan
    ? { starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise', trial: 'Trial', custom: 'Custom' }[subscription.plan] || subscription.plan
    : 'Sem plano';

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Usuários & Acessos</h1>
            <p className="text-sm text-muted-foreground">
              {isSuperAdmin ? 'Gestão global de contas e permissões' : `Gerencie os usuários de ${currentTenantName}`}
            </p>
          </div>
          <div className="flex gap-2">
            {isSuperAdmin && (
              <Button variant="outline" size="sm" onClick={() => setAddAccessOpen(true)}>
                <Shield className="h-4 w-4 mr-1.5" />
                Vincular Acesso
              </Button>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button size="sm" onClick={() => setCreateUserOpen(true)} disabled={!canCreateUser}>
                    {isAtLimit ? <Lock className="h-4 w-4 mr-1.5" /> : <UserPlus className="h-4 w-4 mr-1.5" />}
                    Nova Conta
                  </Button>
                </span>
              </TooltipTrigger>
              {isAtLimit && (
                <TooltipContent>
                  <p className="text-xs">Limite de {maxUsers} usuários atingido. Solicite upgrade do plano.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>

        {/* Subscription / Plan Banner */}
        <Card className={`border ${!subActive ? 'border-destructive/30 bg-destructive/5' : isAtLimit ? 'border-amber-500/30 bg-amber-500/5' : ''}`}>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Plano {planLabel}</span>
                  <Badge variant={subActive ? 'secondary' : 'destructive'} className="text-[10px]">
                    {subActive ? (subscription?.status === 'trial' ? 'Trial' : 'Ativo') : 'Inativo'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentTenantActiveUsers} de {maxUsers >= 999 ? '∞' : maxUsers} licenças utilizadas
                </p>
              </div>
              <div className="flex-1 max-w-xs">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Uso de licenças</span>
                  <span className="font-medium tabular-nums">{Math.round(usagePercent)}%</span>
                </div>
                <Progress
                  value={usagePercent}
                  className={`h-1.5 ${usagePercent >= 90 ? '[&>div]:bg-destructive' : usagePercent >= 70 ? '[&>div]:bg-amber-500' : ''}`}
                />
              </div>
              {isAtLimit && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => window.open('https://wa.me/5512996543522?text=Olá! Gostaria de fazer upgrade do meu plano.', '_blank')}
                >
                  Solicitar Upgrade
                </Button>
              )}
            </div>
            {!subActive && (
              <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-xs text-destructive">
                  Plano inativo. Criação de novos usuários bloqueada.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-px bg-border rounded-lg overflow-hidden">
          {[
            { label: 'Total', value: totalUsers },
            { label: 'Ativos', value: activeUsers },
            { label: 'Inativos', value: inactiveUsers },
          ].map(stat => (
            <div key={stat.label} className="bg-background px-4 py-3 text-center">
              <p className="text-lg font-semibold tabular-nums">{stat.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="departments">Departamentos</TabsTrigger>}
            <TabsTrigger value="audit">Auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4 mt-4">
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
              </div>
              {isSuperAdmin && tenants.length > 1 && (
                <Select value={filterTenant} onValueChange={setFilterTenant}>
                  <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos departamentos</SelectItem>
                    {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos papéis</SelectItem>
                  {availableRoles.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[120px] h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">{userGroups.length} usuário(s)</p>

            {/* User List */}
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
            ) : userGroups.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-2">Usuário</th>
                      <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-2 hidden sm:table-cell">Papel</th>
                      <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-2 hidden md:table-cell">Status</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {userGroups.map(u => {
                      const isExpanded = expandedUser === u.id;
                      return (
                        <>
                          <tr
                            key={u.id}
                            className={`group hover:bg-muted/30 cursor-pointer transition-colors ${!u.is_active ? 'opacity-50' : ''}`}
                            onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                          >
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${u.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                  {u.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{u.name}</p>
                                  <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 hidden sm:table-cell">
                              <div className="flex gap-1 flex-wrap">
                                {u.memberships.slice(0, 2).map(m => (
                                  <Badge key={m.id} variant={getRoleBadgeVariant(m.role)} className="text-[10px] px-1.5 py-0">
                                    {roleLabels[m.role as keyof typeof roleLabels] || m.role}
                                    {isSuperAdmin && m.tenants?.name && ` · ${m.tenants.name.substring(0, 10)}`}
                                  </Badge>
                                ))}
                                {u.memberships.length > 2 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{u.memberships.length - 2}</Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 hidden md:table-cell">
                              <span className="inline-flex items-center gap-1.5 text-xs">
                                <span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                                {u.is_active ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td className="px-2 py-2.5">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={e => e.stopPropagation()}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => {
                                    setChangePwUserId(u.id);
                                    setChangePwUserName(u.name);
                                    setChangePwOpen(true);
                                  }}>
                                    <KeyRound className="h-4 w-4 mr-2" /> Alterar Senha
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    toggleUserActive.mutate({ user_id: u.id, is_active: !u.is_active });
                                  }}>
                                    <Power className="h-4 w-4 mr-2" />
                                    {u.is_active ? 'Desativar' : 'Reativar'}
                                  </DropdownMenuItem>
                                  {isSuperAdmin && (
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedUserId(u.id);
                                      setAddAccessOpen(true);
                                    }}>
                                      <Plus className="h-4 w-4 mr-2" /> Adicionar Acesso
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => {
                                      setDeleteUserId(u.id);
                                      setDeleteUserName(u.name);
                                      setDeleteConfirmOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${u.id}-detail`}>
                              <td colSpan={4} className="px-4 pb-4 pt-2">
                                <div className="space-y-3 pl-10">
                                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                    Acessos ({u.memberships.length})
                                  </p>
                                  {u.memberships.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">Nenhum acesso vinculado</p>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {u.memberships.map(m => (
                                        <div key={m.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                                          <span className="text-xs flex-1 font-medium truncate">{m.tenants?.name || '—'}</span>
                                          <Select value={m.role} onValueChange={v => updateRole.mutate({ id: m.id, role: v })}>
                                            <SelectTrigger className="w-[120px] h-6 text-[11px]"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              {availableRoles.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                            </SelectContent>
                                          </Select>
                                          <Switch checked={m.is_active} onCheckedChange={v => toggleMembershipActive.mutate({ id: m.id, is_active: v })} />
                                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                            onClick={() => { if (confirm('Remover este acesso?')) removeMembership.mutate(m.id); }}>
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {isSuperAdmin && (
                                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setSelectedUserId(u.id); setAddAccessOpen(true); }}>
                                      <Plus className="h-3 w-3 mr-1" /> Adicionar departamento
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {isSuperAdmin && (
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
                          <Building2 className="h-4 w-4 text-muted-foreground" />
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
                                          {availableRoles.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
          )}

          <TabsContent value="audit" className="mt-4">
            <div className="rounded-lg border overflow-hidden">
              {logsLoading ? (
                <div className="p-4 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum log de auditoria</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {auditLogs.map(log => (
                    <div key={log.id} className="px-4 py-2.5 flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
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
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap tabular-nums">
                        {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Create User Dialog */}
        <Dialog open={createUserOpen} onOpenChange={v => { setCreateUserOpen(v); if (!v) resetCreateForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Conta</DialogTitle>
              <DialogDescription>
                {isSuperAdmin ? 'Crie uma conta e vincule ao departamento.' : `Nova conta para ${currentTenantName}.`}
              </DialogDescription>
            </DialogHeader>

            {isAtLimit && !isSuperAdmin && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <div>
                  <p className="text-xs font-medium text-destructive">Limite atingido ({currentTenantActiveUsers}/{maxUsers})</p>
                  <p className="text-[11px] text-destructive/80">Solicite upgrade para adicionar mais usuários.</p>
                </div>
              </div>
            )}

            {!isAtLimit && subscription && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <p className="text-[11px] text-muted-foreground">
                  {currentTenantActiveUsers} de {maxUsers >= 999 ? '∞' : maxUsers} licenças — restam {maxUsers >= 999 ? '∞' : maxUsers - currentTenantActiveUsers}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome completo</Label>
                <Input placeholder="Nome do usuário" value={newName} onChange={e => setNewName(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" placeholder="email@empresa.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Senha inicial</Label>
                <div className="relative">
                  <Input type={showNewPw ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-8 text-xs pr-9" />
                  <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowNewPw(!showNewPw)}>
                    {showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              {/* Only super_admin sees the tenant selector */}
              {isSuperAdmin && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Departamento</Label>
                  <Select value={newTenantId} onValueChange={setNewTenantId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Papel</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" size="sm"
                disabled={!newName || !newEmail || !newPassword || newPassword.length < 6 || createUser.isPending || (!isSuperAdmin && isAtLimit)}
                onClick={() => createUser.mutate()}>
                {createUser.isPending ? 'Criando...' : 'Criar Conta'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Access Dialog — super_admin only */}
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
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.email})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Departamento</Label>
                <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Papel</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
                  <Input type={showChangePw ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={newPw} onChange={e => setNewPw(e.target.value)} className="h-8 text-xs pr-9" />
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
              <AlertDialogTitle>Excluir "{deleteUserName}"?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá excluir permanentemente o usuário, incluindo todos os acessos e dados de autenticação. <strong>Não pode ser desfeita.</strong>
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
                {deleteUser.isPending ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

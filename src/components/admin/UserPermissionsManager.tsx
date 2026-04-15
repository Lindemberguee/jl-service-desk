import { useState, useMemo, useCallback } from 'react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  UserCog, Search, X, Check, Minus, ChevronDown, ChevronRight,
  Shield, ClipboardList, Wrench, Package, Users, BarChart3,
  Settings, LayoutDashboard, BookOpen, HardHat, Contact, Target,
  Hammer, Plug, FileText, Vault, Trash2, Eye, KeyRound,
} from 'lucide-react';
import type { Permission } from '@/lib/permissions';
import { roleLabels, type AppRole } from '@/lib/permissions';

interface PermissionDef { key: Permission; label: string; }
interface PermGroup { id: string; label: string; icon: React.ElementType; permissions: PermissionDef[]; }

const permissionGroups: PermGroup[] = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard, permissions: [
    { key: 'dashboard:read', label: 'Acessar Dashboard' },
  ]},
  { id: 'os', label: 'Ordens de Serviço', icon: ClipboardList, permissions: [
    { key: 'os:read', label: 'Visualizar OS' }, { key: 'os:create', label: 'Criar OS' },
    { key: 'os:update', label: 'Editar OS' }, { key: 'os:assign', label: 'Atribuir OS' },
    { key: 'os:close', label: 'Encerrar OS' }, { key: 'os:manage', label: 'Gerenciar OS' },
    { key: 'os:comment', label: 'Comentar OS' }, { key: 'os:view_technical_note', label: 'Ver Nota Técnica' },
  ]},
  { id: 'my_os', label: 'Minhas OS', icon: Eye, permissions: [
    { key: 'my_os:read', label: 'Acessar Minhas OS' },
  ]},
  { id: 'assets', label: 'Ativos', icon: Wrench, permissions: [
    { key: 'assets:read', label: 'Visualizar' }, { key: 'assets:manage', label: 'Gerenciar' },
  ]},
  { id: 'manutencao', label: 'Manutenção', icon: HardHat, permissions: [
    { key: 'manutencao:read', label: 'Visualizar' }, { key: 'manutencao:manage', label: 'Gerenciar' },
  ]},
  { id: 'stock', label: 'Estoque', icon: Package, permissions: [
    { key: 'stock:read', label: 'Visualizar' }, { key: 'stock:manage', label: 'Gerenciar' },
  ]},
  { id: 'materiais', label: 'Materiais', icon: BookOpen, permissions: [
    { key: 'materiais:read', label: 'Visualizar' }, { key: 'materiais:manage', label: 'Gerenciar' },
  ]},
  { id: 'cadastros', label: 'Cadastros', icon: Settings, permissions: [
    { key: 'cadastros:read', label: 'Visualizar' }, { key: 'cadastros:manage', label: 'Gerenciar' },
  ]},
  { id: 'collaborators', label: 'Colaboradores', icon: Contact, permissions: [
    { key: 'collaborators:read', label: 'Visualizar' }, { key: 'collaborators:manage', label: 'Gerenciar' },
  ]},
  { id: 'users', label: 'Equipe', icon: Users, permissions: [
    { key: 'users:read', label: 'Visualizar' }, { key: 'users:manage', label: 'Gerenciar' },
  ]},
  { id: 'reports', label: 'Relatórios', icon: BarChart3, permissions: [
    { key: 'reports:read', label: 'Acessar' }, { key: 'settings:manage', label: 'Configurações' },
  ]},
  { id: 'kpis', label: 'KPIs & OKRs', icon: Target, permissions: [
    { key: 'kpis:read', label: 'Visualizar' }, { key: 'kpis:manage', label: 'Gerenciar' },
  ]},
  { id: 'tools', label: 'Ferramentas', icon: Hammer, permissions: [
    { key: 'tools:read', label: 'Acesso Geral' }, { key: 'tools:canvas', label: 'Canvas' },
    { key: 'tools:notes', label: 'Anotações' }, { key: 'tools:reminders', label: 'Lembretes' },
    { key: 'tools:calendar', label: 'Calendário' }, { key: 'tools:planner', label: 'Planner' },
  ]},
  { id: 'docs', label: 'Documentos', icon: FileText, permissions: [
    { key: 'docs:read', label: 'Visualizar' }, { key: 'docs:manage', label: 'Gerenciar' },
  ]},
  { id: 'vault', label: 'Cofre', icon: Vault, permissions: [
    { key: 'vault:read', label: 'Visualizar' }, { key: 'vault:manage', label: 'Gerenciar' },
  ]},
  { id: 'kb', label: 'Base Conhecimento', icon: BookOpen, permissions: [
    { key: 'kb:read', label: 'Visualizar' }, { key: 'kb:manage', label: 'Gerenciar' },
  ]},
  { id: 'disposal', label: 'Descarte', icon: Trash2, permissions: [
    { key: 'disposal:read', label: 'Visualizar' }, { key: 'disposal:manage', label: 'Gerenciar' },
  ]},
  { id: 'integrations', label: 'Integrações', icon: Plug, permissions: [
    { key: 'integrations:manage', label: 'Gerenciar' },
  ]},
  { id: 'api', label: 'API', icon: KeyRound, permissions: [
    { key: 'api:manage', label: 'Gerenciar' },
  ]},
];

const roleColors: Record<string, string> = {
  super_admin: 'bg-red-500/10 text-red-500 border-red-500/20',
  admin: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  coordenador: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  tecnico: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  analista: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
  solicitante: 'bg-green-500/10 text-green-500 border-green-500/20',
  leitura: 'bg-muted text-muted-foreground border-border',
};

function PermToggleButton({ hasOverride, granted, onClick }: { hasOverride: boolean; granted: boolean; onClick: () => void }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "w-7 h-7 rounded-md flex items-center justify-center transition-all border shrink-0",
              !hasOverride && "bg-muted/30 border-border/50 text-muted-foreground/30 hover:bg-primary/10 hover:border-primary/30 hover:text-primary",
              hasOverride && granted && "bg-emerald-500/15 border-emerald-500/30 text-emerald-500 hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive",
              hasOverride && !granted && "bg-destructive/15 border-destructive/30 text-destructive hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-500",
            )}
          >
            {!hasOverride ? <Minus className="h-3 w-3" /> : granted ? <Check className="h-3 w-3 stroke-[2.5]" /> : <X className="h-3 w-3 stroke-[2.5]" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          {!hasOverride ? 'Conceder permissão' : granted ? 'Negar permissão' : 'Conceder permissão'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function UserPermissionsManager() {
  const { currentTenantId, currentRole, memberships } = useAuth();
  const isSuperAdmin = currentRole === 'super_admin';
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const { data: users = [] } = useQuery({
    queryKey: ['tenant_users_for_perms', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return [];
      const { data, error } = await supabase
        .from('user_memberships')
        .select('user_id, role, profiles!inner(id, name, email)')
        .eq('tenant_id', currentTenantId)
        .eq('is_active', true)
        .order('role');
      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.user_id,
        name: m.profiles?.name || m.profiles?.email || '—',
        email: m.profiles?.email || '',
        role: m.role as AppRole,
      }));
    },
    enabled: !!currentTenantId,
  });

  const { permissions, isLoading: permsLoading, togglePermission, getUserPermission } = useUserPermissions(currentTenantId || undefined);

  const selectedUser = users.find(u => u.id === selectedUserId);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return permissionGroups;
    const q = searchQuery.toLowerCase();
    return permissionGroups
      .map(g => ({
        ...g,
        permissions: g.permissions.filter(
          p => p.label.toLowerCase().includes(q) || g.label.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.permissions.length > 0);
  }, [searchQuery]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  };

  const handleToggle = useCallback((permission: Permission) => {
    if (!selectedUserId || !currentTenantId) return;
    const current = getUserPermission(selectedUserId, permission);
    const newGranted = current === undefined ? true : !current;

    togglePermission.mutate(
      { user_id: selectedUserId, tenant_id: currentTenantId, permission, granted: newGranted },
      {
        onSuccess: () => toast.success(`Permissão ${newGranted ? 'concedida' : 'negada'} para ${selectedUser?.name}`),
        onError: (err: any) => toast.error(err.message || 'Erro ao atualizar'),
      }
    );
  }, [selectedUserId, currentTenantId, getUserPermission, togglePermission, selectedUser]);

  const overrideCount = useMemo(() => {
    if (!selectedUserId) return 0;
    return permissions.filter(p => p.user_id === selectedUserId).length;
  }, [permissions, selectedUserId]);

  const totalPerms = permissionGroups.reduce((sum, g) => sum + g.permissions.length, 0);

  if (!currentTenantId) return null;

  return (
    <Card className="overflow-hidden border-border/50 shadow-[0_2px_12px_0_hsl(var(--foreground)/0.04)]">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserCog className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Permissões por Usuário</CardTitle>
              <CardDescription className="text-[11px]">
                Sobrescreva permissões do cargo para usuários específicos
              </CardDescription>
            </div>
          </div>
          {selectedUser && overrideCount > 0 && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Shield className="h-3 w-3" />
              {overrideCount} override{overrideCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* User selector + search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="sm:w-[280px] h-9 text-xs">
              <Users className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Selecione um usuário..." />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  <div className="flex items-center gap-2">
                    <span className="truncate">{u.name}</span>
                    <Badge variant="outline" className={cn("text-[9px] shrink-0", roleColors[u.role])}>
                      {roleLabels[u.role] || u.role}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedUserId && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar permissão..."
                className="h-9 text-xs pl-9 pr-8 bg-muted/30"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* User info bar */}
        {selectedUser && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
            <span className="font-medium text-foreground">{selectedUser.name}</span>
            <span className="hidden sm:inline text-muted-foreground/40">·</span>
            <span className="hidden sm:inline text-muted-foreground">{selectedUser.email}</span>
            <span className="text-muted-foreground/40">·</span>
            <Badge variant="outline" className={cn("text-[9px]", roleColors[selectedUser.role])}>
              {roleLabels[selectedUser.role] || selectedUser.role}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {!selectedUserId ? (
          <div className="py-16 text-center">
            <UserCog className="mx-auto h-10 w-10 text-muted-foreground/15 mb-3" />
            <p className="text-sm text-muted-foreground">Selecione um usuário para configurar permissões individuais</p>
            <p className="text-xs text-muted-foreground/50 mt-1">Overrides têm prioridade sobre permissões do cargo</p>
          </div>
        ) : permsLoading ? (
          <div className="p-6"><Skeleton className="h-[300px] w-full" /></div>
        ) : (
          <div className="overflow-y-auto max-h-[calc(100vh-380px)] min-h-[300px]">
            <div className="divide-y divide-border/40">
              {filteredGroups.map(group => {
                const isCollapsed = collapsedGroups.has(group.id);
                const Icon = group.icon;
                const groupOverrides = group.permissions.filter(p => getUserPermission(selectedUserId, p.key) !== undefined).length;

                return (
                  <div key={group.id}>
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center gap-2.5 px-4 py-2 bg-muted/15 hover:bg-muted/30 transition-colors sticky top-0 z-10"
                    >
                      {isCollapsed
                        ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                        : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
                      }
                      <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span className="text-xs font-semibold">{group.label}</span>
                      <div className="ml-auto flex items-center gap-2">
                        {groupOverrides > 0 && (
                          <Badge variant="outline" className="text-[9px] bg-primary/5 text-primary border-primary/20 px-1.5">
                            {groupOverrides} custom
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground/50">{group.permissions.length}</span>
                      </div>
                    </button>

                    {!isCollapsed && (
                      <div>
                        {group.permissions.map((perm, idx) => {
                          const override = getUserPermission(selectedUserId, perm.key);
                          const hasOverride = override !== undefined;

                          return (
                            <div
                              key={perm.key}
                              className={cn(
                                "flex items-center justify-between px-4 py-1.5 pl-11 hover:bg-muted/10 transition-colors",
                                idx < group.permissions.length - 1 && "border-b border-border/20"
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs truncate">{perm.label}</span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] px-1.5 shrink-0",
                                    !hasOverride && "bg-muted/30 text-muted-foreground/60 border-border/50",
                                    hasOverride && override && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                                    hasOverride && !override && "bg-destructive/10 text-destructive border-destructive/20",
                                  )}
                                >
                                  {!hasOverride ? 'Cargo' : override ? 'Concedido' : 'Negado'}
                                </Badge>
                              </div>

                              <PermToggleButton
                                hasOverride={hasOverride}
                                granted={override ?? false}
                                onClick={() => handleToggle(perm.key)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer summary */}
            <div className="sticky bottom-0 bg-background border-t border-border/40 px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{filteredGroups.length} módulos · {totalPerms} permissões</span>
              <span>{overrideCount} override{overrideCount !== 1 ? 's' : ''} configurado{overrideCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

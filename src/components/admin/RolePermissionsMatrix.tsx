import { useState, useMemo, useCallback } from 'react';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  Shield, ClipboardList, Wrench, Package, Users,
  BarChart3, Settings, LayoutDashboard, BookOpen,
  Check, X, Hammer, Bell, HardHat, Contact, Target, Key, Trash2,
  Lock, Plug, Search, ChevronDown, ChevronRight, ToggleLeft, ToggleRight,
  Eye, Globe, Calendar, StickyNote, Timer, Kanban, FileText, KeyRound, Vault,
} from 'lucide-react';
import type { AppRole, Permission } from '@/lib/permissions';
import { roleLabels } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const ALL_ROLES: AppRole[] = ['super_admin', 'admin', 'coordenador', 'tecnico', 'analista', 'solicitante', 'leitura'];

const roleColors: Record<AppRole, string> = {
  super_admin: 'bg-red-500/10 text-red-500 border-red-500/20',
  admin: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  coordenador: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  tecnico: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  analista: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
  solicitante: 'bg-green-500/10 text-green-500 border-green-500/20',
  leitura: 'bg-muted text-muted-foreground border-border',
};

interface PermissionDef {
  key: Permission;
  label: string;
  description: string;
}

interface PermissionGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  permissions: PermissionDef[];
}

const permissionGroups: PermissionGroup[] = [
  {
    id: 'dashboard',
    label: 'Painel',
    icon: LayoutDashboard,
    permissions: [
      { key: 'dashboard:read', label: 'Acessar Dashboard', description: 'Acesso ao painel principal com KPIs e gráficos' },
    ],
  },
  {
    id: 'os',
    label: 'Ordens de Serviço',
    icon: ClipboardList,
    permissions: [
      { key: 'os:read', label: 'Visualizar OS', description: 'Ver listagem e detalhes das OS' },
      { key: 'os:create', label: 'Criar OS', description: 'Abrir novas ordens de serviço' },
      { key: 'os:update', label: 'Editar OS', description: 'Alterar dados e status das OS' },
      { key: 'os:assign', label: 'Atribuir OS', description: 'Atribuir técnicos e equipes' },
      { key: 'os:close', label: 'Encerrar OS', description: 'Finalizar e encerrar OS' },
      { key: 'os:manage', label: 'Gerenciar OS', description: 'Controle total sobre OS (excluir, reabrir)' },
      { key: 'os:comment', label: 'Comentar OS', description: 'Adicionar comentários na timeline' },
      { key: 'os:view_technical_note', label: 'Ver Nota Técnica', description: 'Visualizar anotações técnicas internas da OS' },
    ],
  },
  {
    id: 'my_os',
    label: 'Minhas OS',
    icon: Eye,
    permissions: [
      { key: 'my_os:read', label: 'Acessar Minhas OS', description: 'Acesso à tela de "Minhas OS" pessoais' },
    ],
  },
  {
    id: 'assets',
    label: 'Ativos',
    icon: Wrench,
    permissions: [
      { key: 'assets:read', label: 'Visualizar Ativos', description: 'Ver patrimônio e equipamentos' },
      { key: 'assets:manage', label: 'Gerenciar Ativos', description: 'Criar, editar e desativar ativos' },
    ],
  },
  {
    id: 'manutencao',
    label: 'Manutenção',
    icon: HardHat,
    permissions: [
      { key: 'manutencao:read', label: 'Visualizar Manutenção', description: 'Ver registros de manutenção de ativos' },
      { key: 'manutencao:manage', label: 'Gerenciar Manutenção', description: 'Criar, editar e concluir manutenções' },
    ],
  },
  {
    id: 'stock',
    label: 'Estoque',
    icon: Package,
    permissions: [
      { key: 'stock:read', label: 'Visualizar Estoque', description: 'Ver itens e níveis de estoque' },
      { key: 'stock:manage', label: 'Gerenciar Estoque', description: 'Adicionar, importar e movimentar itens' },
    ],
  },
  {
    id: 'materiais',
    label: 'Materiais',
    icon: BookOpen,
    permissions: [
      { key: 'materiais:read', label: 'Visualizar Materiais', description: 'Ver controle de materiais mensal' },
      { key: 'materiais:manage', label: 'Gerenciar Materiais', description: 'Registrar movimentações de materiais' },
    ],
  },
  {
    id: 'cadastros',
    label: 'Cadastros',
    icon: Settings,
    permissions: [
      { key: 'cadastros:read', label: 'Visualizar Cadastros', description: 'Ver unidades, locais, categorias e solicitantes' },
      { key: 'cadastros:manage', label: 'Gerenciar Cadastros', description: 'Criar e editar dados mestres' },
    ],
  },
  {
    id: 'collaborators',
    label: 'Colaboradores',
    icon: Contact,
    permissions: [
      { key: 'collaborators:read', label: 'Visualizar Colaboradores', description: 'Ver lista de colaboradores e seus dados' },
      { key: 'collaborators:manage', label: 'Gerenciar Colaboradores', description: 'Criar, editar e excluir colaboradores' },
    ],
  },
  {
    id: 'users',
    label: 'Equipe & Usuários',
    icon: Users,
    permissions: [
      { key: 'users:read', label: 'Visualizar Equipe', description: 'Ver membros da equipe' },
      { key: 'users:manage', label: 'Gerenciar Equipe', description: 'Criar, editar e desativar usuários' },
    ],
  },
  {
    id: 'reports',
    label: 'Relatórios & Sistema',
    icon: BarChart3,
    permissions: [
      { key: 'reports:read', label: 'Acessar Relatórios', description: 'Acessar relatórios e exportações' },
      { key: 'settings:manage', label: 'Configurações', description: 'Alterar configurações do sistema' },
    ],
  },
  {
    id: 'kpis',
    label: 'KPIs & OKRs',
    icon: Target,
    permissions: [
      { key: 'kpis:read', label: 'Visualizar KPIs', description: 'Acessar painel de KPIs e OKRs' },
      { key: 'kpis:manage', label: 'Gerenciar KPIs', description: 'Criar, editar e excluir KPIs, objetivos e resultados-chave' },
    ],
  },
  {
    id: 'tools',
    label: 'Ferramentas',
    icon: Hammer,
    permissions: [
      { key: 'tools:read', label: 'Acesso Geral', description: 'Acesso ao módulo de ferramentas' },
      { key: 'tools:canvas', label: 'Canvas', description: 'Quadro de mapa mental e brainstorm' },
      { key: 'tools:notes', label: 'Anotações', description: 'Bloco de notas pessoal' },
      { key: 'tools:reminders', label: 'Lembretes', description: 'Lembretes e alertas pessoais' },
      { key: 'tools:calendar', label: 'Calendário', description: 'Calendário de atividades' },
      { key: 'tools:planner', label: 'Planner', description: 'Gerenciador de tarefas e projetos' },
    ],
  },
  {
    id: 'docs',
    label: 'Documentos',
    icon: FileText,
    permissions: [
      { key: 'docs:read', label: 'Visualizar Docs', description: 'Acessar biblioteca de documentos' },
      { key: 'docs:manage', label: 'Gerenciar Docs', description: 'Upload, editar e excluir documentos' },
    ],
  },
  {
    id: 'vault',
    label: 'Cofre de Senhas',
    icon: Vault,
    permissions: [
      { key: 'vault:read', label: 'Visualizar Cofre', description: 'Ver entradas do cofre de senhas' },
      { key: 'vault:manage', label: 'Gerenciar Cofre', description: 'Criar, editar e excluir senhas no cofre' },
    ],
  },
  {
    id: 'kb',
    label: 'Base de Conhecimento',
    icon: BookOpen,
    permissions: [
      { key: 'kb:read', label: 'Visualizar Base', description: 'Acessar artigos da base de conhecimento' },
      { key: 'kb:manage', label: 'Gerenciar Base', description: 'Criar, editar e publicar artigos' },
    ],
  },
  {
    id: 'disposal',
    label: 'Descarte',
    icon: Trash2,
    permissions: [
      { key: 'disposal:read', label: 'Visualizar Descarte', description: 'Acessar módulo de descarte e itens depreciados' },
      { key: 'disposal:manage', label: 'Gerenciar Descarte', description: 'Registrar, aprovar e rejeitar descartes' },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrações',
    icon: Plug,
    permissions: [
      { key: 'integrations:manage', label: 'Gerenciar Integrações', description: 'Configurar integrações de e-mail SMTP e notificações externas' },
    ],
  },
  {
    id: 'api',
    label: 'API',
    icon: KeyRound,
    permissions: [
      { key: 'api:manage', label: 'Gerenciar API', description: 'Criar e revogar API Keys, visualizar logs de requisições' },
    ],
  },
];

// ── Permission Cell ──
function PermissionCell({
  granted,
  onToggle,
  roleName,
  permLabel,
  disabled,
}: {
  granted: boolean;
  onToggle: () => void;
  roleName: string;
  permLabel: string;
  disabled?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={disabled ? undefined : onToggle}
            disabled={disabled}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 border",
              disabled && "opacity-30 cursor-not-allowed",
              !disabled && granted && "bg-emerald-500/15 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/25 hover:scale-110",
              !disabled && !granted && "bg-muted/20 border-transparent text-muted-foreground/25 hover:bg-destructive/10 hover:text-destructive/50 hover:border-destructive/20",
              disabled && granted && "bg-emerald-500/10 border-emerald-500/15 text-emerald-500/40",
              disabled && !granted && "bg-muted/10 border-transparent text-muted-foreground/15",
            )}
          >
            {disabled ? (
              <Lock className="h-3 w-3" />
            ) : granted ? (
              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
            ) : (
              <X className="h-3 w-3" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[220px]">
          {disabled ? (
            <span>Protegido — somente Super Admin pode alterar</span>
          ) : (
            <span>
              <span className="font-semibold">{roleName}</span> → {permLabel}:{' '}
              <span className={granted ? 'text-emerald-400' : 'text-destructive'}>{granted ? 'Ativo' : 'Inativo'}</span>
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Main Component ──
export default function RolePermissionsMatrix() {
  const { isLoading, togglePermission, isGranted } = useRolePermissions();
  const { currentRole } = useAuth();
  const isSuperAdmin = currentRole === 'super_admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const visibleRoles: AppRole[] = isSuperAdmin
    ? ALL_ROLES
    : ALL_ROLES.filter(r => r !== 'super_admin');

  const editableRoles: AppRole[] = isSuperAdmin
    ? ALL_ROLES
    : ['coordenador', 'tecnico', 'analista', 'solicitante', 'leitura'];

  const superAdminOnlyPermissions: Permission[] = ['settings:manage', 'users:manage', 'api:manage', 'integrations:manage'];

  const canEditCell = useCallback((role: AppRole, perm: Permission): boolean => {
    if (!editableRoles.includes(role)) return false;
    if (!isSuperAdmin && superAdminOnlyPermissions.includes(perm) && role === 'admin') return false;
    return true;
  }, [editableRoles, isSuperAdmin]);

  const handleToggle = useCallback((role: AppRole, permission: Permission, current: boolean) => {
    if (!canEditCell(role, permission)) return;
    togglePermission.mutate(
      { role, permission, granted: !current },
      {
        onSuccess: () => toast.success(`Permissão ${!current ? 'concedida' : 'revogada'} para ${roleLabels[role]}`),
        onError: (err: any) => toast.error(err.message || 'Erro ao atualizar permissão'),
      }
    );
  }, [canEditCell, togglePermission]);

  const handleToggleGroupForRole = useCallback((group: PermissionGroup, role: AppRole) => {
    const editablePerms = group.permissions.filter(p => canEditCell(role, p.key));
    if (editablePerms.length === 0) return;

    const allGranted = editablePerms.every(p => isGranted(role, p.key));
    const newState = !allGranted;

    editablePerms.forEach(p => {
      if (isGranted(role, p.key) !== newState) {
        togglePermission.mutate(
          { role, permission: p.key, granted: newState },
          {
            onError: (err: any) => toast.error(err.message || 'Erro ao atualizar'),
          }
        );
      }
    });

    toast.success(`${newState ? 'Concedidas' : 'Revogadas'} ${editablePerms.length} permissões de "${group.label}" para ${roleLabels[role]}`);
  }, [canEditCell, isGranted, togglePermission]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Filter groups/permissions by search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return permissionGroups;
    const q = searchQuery.toLowerCase();
    return permissionGroups
      .map(g => ({
        ...g,
        permissions: g.permissions.filter(
          p => p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || g.label.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.permissions.length > 0);
  }, [searchQuery]);

  const totalPerms = permissionGroups.reduce((sum, g) => sum + g.permissions.length, 0);

  const grantedCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const role of visibleRoles) {
      counts[role] = permissionGroups.reduce(
        (sum, g) => sum + g.permissions.filter(p => isGranted(role, p.key)).length,
        0
      );
    }
    return counts;
  }, [visibleRoles, isGranted]);

  if (isLoading) {
    return <Skeleton className="h-[500px] w-full rounded-xl" />;
  }

  const colCount = visibleRoles.length;

  return (
    <Card className="overflow-hidden border-border/50 shadow-[0_2px_12px_0_hsl(var(--foreground)/0.04)]">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Matriz de Permissões</CardTitle>
              <CardDescription className="text-[11px]">
                {visibleRoles.length} cargos × {totalPerms} permissões
                {!isSuperAdmin && ' — Seu cargo e superior estão protegidos'}
              </CardDescription>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar permissão ou módulo..."
            className="h-8 text-xs pl-9 pr-8 bg-muted/30"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="min-w-[900px]">
            {/* ── Sticky Header ── */}
            <div
              className="grid border-y border-border bg-muted/50 sticky top-0 z-20"
              style={{ gridTemplateColumns: `240px repeat(${colCount}, 1fr)` }}
            >
              <div className="p-3 flex items-end">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  Módulo / Permissão
                </span>
              </div>
              {visibleRoles.map(role => {
                const pct = totalPerms > 0 ? Math.round((grantedCount[role] / totalPerms) * 100) : 0;
                return (
                  <div key={role} className="p-2 text-center space-y-1.5">
                    <Badge variant="outline" className={cn("text-[10px] font-semibold border px-2", roleColors[role])}>
                      {roleLabels[role]}
                    </Badge>
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-10 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            pct > 70 ? "bg-emerald-500" : pct > 30 ? "bg-amber-500" : "bg-muted-foreground/30"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground font-medium">{grantedCount[role]}/{totalPerms}</span>
                    </div>
                    {!editableRoles.includes(role) && (
                      <div className="text-[8px] text-muted-foreground/50 flex items-center justify-center gap-0.5">
                        <Lock className="h-2.5 w-2.5" /> Protegido
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Permission Groups ── */}
            {filteredGroups.length === 0 && (
              <div className="py-16 text-center">
                <Search className="mx-auto h-8 w-8 text-muted-foreground/20 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma permissão encontrada para "{searchQuery}"</p>
              </div>
            )}

            {filteredGroups.map((group, gi) => {
              const isCollapsed = collapsedGroups.has(group.id);
              const GroupIcon = group.icon;

              return (
                <div key={group.id}>
                  {/* Group header row */}
                  <div
                    className={cn(
                      "grid border-b border-border/50 cursor-pointer transition-colors hover:bg-accent/20",
                      gi % 2 === 0 ? "bg-muted/30" : "bg-muted/15"
                    )}
                    style={{ gridTemplateColumns: `240px repeat(${colCount}, 1fr)` }}
                  >
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="p-2.5 px-3 flex items-center gap-2 text-left"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <GroupIcon className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                      <span className="text-xs font-bold text-foreground">{group.label}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">({group.permissions.length})</span>
                    </button>

                    {/* Group-level toggle buttons per role */}
                    {visibleRoles.map(role => {
                      const editablePerms = group.permissions.filter(p => canEditCell(role, p.key));
                      const allGranted = editablePerms.length > 0 && editablePerms.every(p => isGranted(role, p.key));
                      const someGranted = editablePerms.some(p => isGranted(role, p.key));
                      const canToggle = editablePerms.length > 0;

                      return (
                        <div key={role} className="flex items-center justify-center p-1">
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (canToggle) handleToggleGroupForRole(group, role);
                                  }}
                                  disabled={!canToggle}
                                  className={cn(
                                    "h-6 px-2 rounded-md text-[9px] font-semibold transition-all flex items-center gap-1 border",
                                    !canToggle && "opacity-20 cursor-not-allowed border-transparent",
                                    canToggle && allGranted && "bg-emerald-500/15 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/25",
                                    canToggle && !allGranted && someGranted && "bg-amber-500/10 border-amber-500/20 text-amber-600 hover:bg-amber-500/20",
                                    canToggle && !someGranted && "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50",
                                  )}
                                >
                                  {allGranted ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
                                  {allGranted ? 'Tudo' : someGranted ? 'Parcial' : 'Nada'}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {canToggle
                                  ? `Clique para ${allGranted ? 'revogar' : 'conceder'} todas as permissões de "${group.label}" para ${roleLabels[role]}`
                                  : 'Protegido'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      );
                    })}
                  </div>

                  {/* Permission rows */}
                  {!isCollapsed && group.permissions.map((perm) => (
                    <div
                      key={perm.key}
                      className={cn(
                        "grid border-b border-border/20 transition-colors hover:bg-accent/20",
                        gi % 2 === 0 ? "bg-background" : "bg-muted/[0.05]"
                      )}
                      style={{ gridTemplateColumns: `240px repeat(${colCount}, 1fr)` }}
                    >
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="p-2 px-3 pl-11 flex items-center cursor-help min-h-[40px]">
                              <span className="text-xs text-muted-foreground leading-tight">{perm.label}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs max-w-[240px]">
                            <p className="font-semibold mb-0.5">{perm.label}</p>
                            <p className="text-muted-foreground">{perm.description}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">{perm.key}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {visibleRoles.map(role => {
                        const granted = isGranted(role, perm.key);
                        const disabled = !canEditCell(role, perm.key);
                        return (
                          <div key={role} className="flex justify-center items-center p-1">
                            <PermissionCell
                              granted={granted}
                              onToggle={() => handleToggle(role, perm.key, granted)}
                              roleName={roleLabels[role]}
                              permLabel={perm.label}
                              disabled={disabled}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

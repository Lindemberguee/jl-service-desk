import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  Shield, ClipboardList, Wrench, Package, Users,
  BarChart3, Settings, LayoutDashboard, MessageSquare, BookOpen,
  Check, X, Hammer, PenTool, Bell, CalendarDays, HardHat, Contact, Target, Key, Trash2,
  Lock,
} from 'lucide-react';
import type { AppRole, Permission } from '@/lib/permissions';
import { roleLabels, roleDescriptions } from '@/lib/permissions';
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

interface PermissionGroup {
  label: string;
  icon: React.ElementType;
  permissions: { key: Permission; label: string; description: string }[];
}

const permissionGroups: PermissionGroup[] = [
  {
    label: 'Painel',
    icon: LayoutDashboard,
    permissions: [
      { key: 'dashboard:read', label: 'Dashboard', description: 'Acesso ao painel principal com KPIs e gráficos' },
    ],
  },
  {
    label: 'Ordens de Serviço',
    icon: ClipboardList,
    permissions: [
      { key: 'os:read', label: 'Visualizar', description: 'Ver listagem e detalhes das OS' },
      { key: 'os:create', label: 'Criar', description: 'Abrir novas ordens de serviço' },
      { key: 'os:update', label: 'Editar', description: 'Alterar dados e status das OS' },
      { key: 'os:assign', label: 'Atribuir', description: 'Atribuir técnicos e equipes' },
      { key: 'os:close', label: 'Encerrar', description: 'Finalizar e encerrar OS' },
      { key: 'os:manage', label: 'Gerenciar', description: 'Controle total sobre OS (excluir, reabrir)' },
      { key: 'os:comment', label: 'Comentar', description: 'Adicionar comentários na timeline' },
    ],
  },
  {
    label: 'Minhas OS',
    icon: ClipboardList,
    permissions: [
      { key: 'my_os:read', label: 'Visualizar', description: 'Acesso à tela de "Minhas OS" pessoais' },
    ],
  },
  {
    label: 'Ativos',
    icon: Wrench,
    permissions: [
      { key: 'assets:read', label: 'Visualizar', description: 'Ver patrimônio e equipamentos' },
      { key: 'assets:manage', label: 'Gerenciar', description: 'Criar, editar e desativar ativos' },
    ],
  },
  {
    label: 'Manutenção',
    icon: HardHat,
    permissions: [
      { key: 'manutencao:read', label: 'Visualizar', description: 'Ver registros de manutenção de ativos' },
      { key: 'manutencao:manage', label: 'Gerenciar', description: 'Criar, editar e concluir manutenções' },
    ],
  },
  {
    label: 'Estoque',
    icon: Package,
    permissions: [
      { key: 'stock:read', label: 'Visualizar', description: 'Ver itens e níveis de estoque' },
      { key: 'stock:manage', label: 'Gerenciar', description: 'Adicionar, importar e movimentar itens' },
    ],
  },
  {
    label: 'Materiais',
    icon: BookOpen,
    permissions: [
      { key: 'materiais:read', label: 'Visualizar', description: 'Ver controle de materiais mensal' },
      { key: 'materiais:manage', label: 'Gerenciar', description: 'Registrar movimentações de materiais' },
    ],
  },
  {
    label: 'Cadastros',
    icon: Settings,
    permissions: [
      { key: 'cadastros:read', label: 'Visualizar', description: 'Ver unidades, locais, categorias e solicitantes' },
      { key: 'cadastros:manage', label: 'Gerenciar', description: 'Criar e editar dados mestres' },
    ],
  },
  {
    label: 'Colaboradores',
    icon: Contact,
    permissions: [
      { key: 'collaborators:read', label: 'Visualizar', description: 'Ver lista de colaboradores e seus dados' },
      { key: 'collaborators:manage', label: 'Gerenciar', description: 'Criar, editar e excluir colaboradores' },
    ],
  },
  {
    label: 'Equipe & Usuários',
    icon: Users,
    permissions: [
      { key: 'users:read', label: 'Visualizar', description: 'Ver membros da equipe' },
      { key: 'users:manage', label: 'Gerenciar', description: 'Criar, editar e desativar usuários' },
    ],
  },
  {
    label: 'Relatórios & Sistema',
    icon: BarChart3,
    permissions: [
      { key: 'reports:read', label: 'Relatórios', description: 'Acessar relatórios e exportações' },
      { key: 'settings:manage', label: 'Configurações', description: 'Alterar configurações do sistema' },
    ],
  },
  {
    label: 'KPIs & OKRs',
    icon: Target,
    permissions: [
      { key: 'kpis:read', label: 'Visualizar', description: 'Acessar painel de KPIs e OKRs' },
      { key: 'kpis:manage', label: 'Gerenciar', description: 'Criar, editar e excluir KPIs, objetivos e resultados-chave' },
    ],
  },
  {
    label: 'Ferramentas',
    icon: Hammer,
    permissions: [
      { key: 'tools:read', label: 'Acesso Geral', description: 'Acesso ao módulo de ferramentas' },
      { key: 'tools:canvas', label: 'Canvas', description: 'Quadro de mapa mental e brainstorm' },
      { key: 'tools:notes', label: 'Anotações', description: 'Bloco de notas pessoal' },
      { key: 'tools:reminders', label: 'Lembretes', description: 'Lembretes e alertas pessoais' },
      { key: 'tools:calendar', label: 'Calendário', description: 'Calendário de atividades' },
    ],
  },
  {
    label: 'Documentos',
    icon: BookOpen,
    permissions: [
      { key: 'docs:read', label: 'Visualizar', description: 'Acessar biblioteca de documentos' },
      { key: 'docs:manage', label: 'Gerenciar', description: 'Upload, editar e excluir documentos' },
    ],
  },
  {
    label: 'Cofre de Senhas',
    icon: Shield,
    permissions: [
      { key: 'vault:read', label: 'Visualizar', description: 'Ver entradas do cofre de senhas' },
      { key: 'vault:manage', label: 'Gerenciar', description: 'Criar, editar e excluir senhas no cofre' },
    ],
  },
  {
    label: 'Base de Conhecimento',
    icon: BookOpen,
    permissions: [
      { key: 'kb:read', label: 'Visualizar', description: 'Acessar artigos da base de conhecimento' },
      { key: 'kb:manage', label: 'Gerenciar', description: 'Criar, editar e publicar artigos' },
    ],
  },
  {
    label: 'Descarte',
    icon: Trash2,
    permissions: [
      { key: 'disposal:read', label: 'Visualizar', description: 'Acessar módulo de descarte e itens depreciados' },
      { key: 'disposal:manage', label: 'Gerenciar', description: 'Registrar, aprovar e rejeitar descartes' },
    ],
  },
  {
    label: 'API',
    icon: Key,
    permissions: [
      { key: 'api:manage', label: 'Gerenciar', description: 'Criar e revogar API Keys, visualizar logs de requisições' },
    ],
  },
];

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
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={disabled ? undefined : onToggle}
            disabled={disabled}
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 border",
              disabled && "opacity-40 cursor-not-allowed",
              !disabled && granted && "bg-emerald-500/15 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/25",
              !disabled && !granted && "bg-muted/30 border-transparent text-muted-foreground/30 hover:bg-muted/50 hover:text-muted-foreground/50",
              disabled && granted && "bg-emerald-500/10 border-emerald-500/20 text-emerald-500/50",
              disabled && !granted && "bg-muted/20 border-transparent text-muted-foreground/20",
            )}
          >
            {disabled ? (
              <Lock className="h-3 w-3" />
            ) : granted ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {disabled ? (
            <span>Somente Super Admin pode alterar esta permissão</span>
          ) : (
            <><span className="font-medium">{roleName}</span> — {permLabel}: {granted ? 'Ativo' : 'Inativo'}</>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function RolePermissionsMatrix() {
  const { isLoading, togglePermission, isGranted } = useRolePermissions();
  const { currentRole } = useAuth();
  const isSuperAdmin = currentRole === 'super_admin';

  // Admin users can only see and manage roles below them (not super_admin or admin itself)
  // Super admin can see and manage all roles
  const visibleRoles: AppRole[] = isSuperAdmin
    ? ALL_ROLES
    : ALL_ROLES.filter(r => r !== 'super_admin');

  // Roles that the current user can edit
  const editableRoles: AppRole[] = isSuperAdmin
    ? ALL_ROLES
    : ['coordenador', 'tecnico', 'analista', 'solicitante', 'leitura'];

  // Permissions that only super_admin can manage
  const superAdminOnlyPermissions: Permission[] = ['settings:manage', 'users:manage', 'api:manage'];

  const canEditCell = (role: AppRole, perm: Permission): boolean => {
    if (!editableRoles.includes(role)) return false;
    if (!isSuperAdmin && superAdminOnlyPermissions.includes(perm) && (role === 'admin')) return false;
    return true;
  };

  const handleToggle = (role: AppRole, permission: Permission, current: boolean) => {
    if (!canEditCell(role, permission)) return;
    togglePermission.mutate(
      { role, permission, granted: !current },
      {
        onSuccess: () => toast.success(`Permissão ${!current ? 'concedida' : 'revogada'}`),
        onError: (err: any) => toast.error(err.message || 'Erro ao atualizar permissão'),
      }
    );
  };

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  const totalPerms = permissionGroups.reduce((sum, g) => sum + g.permissions.length, 0);
  const grantedCount: Record<string, number> = {};
  for (const role of visibleRoles) {
    grantedCount[role] = permissionGroups.reduce(
      (sum, g) => sum + g.permissions.filter(p => isGranted(role, p.key)).length,
      0
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm">Matriz de Permissões</CardTitle>
            <CardDescription className="text-xs">
              {visibleRoles.length} cargos × {totalPerms} permissões — Clique para alternar
              {!isSuperAdmin && <span className="ml-1 text-muted-foreground/50">(seu cargo e superior estão protegidos)</span>}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="min-w-[900px]">
            {/* Sticky header with roles */}
            <div
              className="grid border-b border-border bg-muted/40 sticky top-0 z-10"
              style={{ gridTemplateColumns: `220px repeat(${visibleRoles.length}, 1fr)` }}
            >
              <div className="p-3 flex items-end">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Módulo / Ação
                </span>
              </div>
              {visibleRoles.map(role => (
                <div key={role} className="p-2 text-center space-y-1">
                  <Badge variant="outline" className={cn("text-[10px] font-medium border", roleColors[role])}>
                    {roleLabels[role]}
                  </Badge>
                  <div className="text-[9px] text-muted-foreground/60">
                    {grantedCount[role]}/{totalPerms}
                  </div>
                  {!editableRoles.includes(role) && (
                    <div className="text-[8px] text-muted-foreground/40 flex items-center justify-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" /> Protegido
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Permission groups */}
            {permissionGroups.map((group, gi) => (
              <div key={group.label}>
                {/* Group header */}
                <div
                  className={cn(
                    "grid border-b border-border",
                    gi % 2 === 0 ? "bg-muted/20" : "bg-background"
                  )}
                  style={{ gridTemplateColumns: `220px repeat(${visibleRoles.length}, 1fr)` }}
                >
                  <div className="p-2.5 px-3 flex items-center gap-2 col-span-1">
                    <group.icon className="h-3.5 w-3.5 text-primary/70" />
                    <span className="text-xs font-semibold text-foreground">{group.label}</span>
                  </div>
                  {visibleRoles.map(role => (
                    <div key={role} className="p-2.5" />
                  ))}
                </div>

                {/* Permission rows */}
                {group.permissions.map((perm) => (
                  <div
                    key={perm.key}
                    className={cn(
                      "grid border-b border-border/30 transition-colors hover:bg-accent/30",
                      gi % 2 === 0 ? "bg-muted/10" : "bg-background"
                    )}
                    style={{ gridTemplateColumns: `220px repeat(${visibleRoles.length}, 1fr)` }}
                  >
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="p-2 px-3 pl-9 flex items-center cursor-help">
                            <span className="text-xs text-muted-foreground">{perm.label}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs max-w-[200px]">
                          {perm.description}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {visibleRoles.map(role => {
                      const granted = isGranted(role, perm.key);
                      const disabled = !canEditCell(role, perm.key);
                      return (
                        <div key={role} className="p-1.5 flex justify-center items-center">
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
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

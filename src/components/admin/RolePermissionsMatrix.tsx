import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Shield, Lock, Eye, Pencil } from 'lucide-react';
import type { AppRole, Permission } from '@/lib/permissions';
import { roleLabels } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const ALL_ROLES: AppRole[] = ['super_admin', 'admin', 'coordenador', 'tecnico', 'solicitante', 'leitura'];

interface PermissionGroup {
  label: string;
  icon: React.ElementType;
  permissions: { key: Permission; label: string }[];
}

const permissionGroups: PermissionGroup[] = [
  {
    label: 'Ordens de Serviço',
    icon: Eye,
    permissions: [
      { key: 'os:read', label: 'Visualizar' },
      { key: 'os:create', label: 'Criar' },
      { key: 'os:update', label: 'Editar' },
      { key: 'os:assign', label: 'Atribuir' },
      { key: 'os:close', label: 'Encerrar' },
      { key: 'os:manage', label: 'Gerenciar' },
    ],
  },
  {
    label: 'Ativos',
    icon: Pencil,
    permissions: [
      { key: 'assets:read', label: 'Visualizar' },
      { key: 'assets:manage', label: 'Gerenciar' },
    ],
  },
  {
    label: 'Estoque',
    icon: Pencil,
    permissions: [
      { key: 'stock:read', label: 'Visualizar' },
      { key: 'stock:manage', label: 'Gerenciar' },
    ],
  },
  {
    label: 'Cadastros',
    icon: Pencil,
    permissions: [
      { key: 'cadastros:read', label: 'Visualizar' },
      { key: 'cadastros:manage', label: 'Gerenciar' },
    ],
  },
  {
    label: 'Usuários',
    icon: Shield,
    permissions: [
      { key: 'users:read', label: 'Visualizar' },
      { key: 'users:manage', label: 'Gerenciar' },
    ],
  },
  {
    label: 'Relatórios',
    icon: Eye,
    permissions: [
      { key: 'reports:read', label: 'Visualizar' },
    ],
  },
  {
    label: 'Sistema',
    icon: Lock,
    permissions: [
      { key: 'settings:manage', label: 'Configurações' },
      { key: 'tools:read', label: 'Ferramentas' },
    ],
  },
];

export default function RolePermissionsMatrix() {
  const { isLoading, togglePermission, isGranted } = useRolePermissions();

  const handleToggle = (role: AppRole, permission: Permission, current: boolean) => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Matriz de Permissões por Cargo
        </CardTitle>
        <CardDescription className="text-xs">
          Defina quais módulos e ações cada cargo pode acessar no sistema. Alterações aplicam imediatamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="min-w-[800px]">
            {/* Header */}
            <div className="grid border-b border-border bg-muted/30 sticky top-0 z-10"
              style={{ gridTemplateColumns: `200px repeat(${ALL_ROLES.length}, 1fr)` }}>
              <div className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Permissão
              </div>
              {ALL_ROLES.map(role => (
                <div key={role} className="p-3 text-center">
                  <Badge variant="outline" className="text-[10px] font-medium">
                    {roleLabels[role]}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Body */}
            {permissionGroups.map((group) => (
              <div key={group.label}>
                {/* Group header */}
                <div className="grid border-b border-border bg-muted/10"
                  style={{ gridTemplateColumns: `200px repeat(${ALL_ROLES.length}, 1fr)` }}>
                  <div className="p-2.5 px-3 flex items-center gap-2">
                    <group.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground">{group.label}</span>
                  </div>
                  {ALL_ROLES.map(role => (
                    <div key={role} className="p-2.5" />
                  ))}
                </div>

                {/* Permission rows */}
                {group.permissions.map((perm) => (
                  <div
                    key={perm.key}
                    className="grid border-b border-border/50 hover:bg-muted/20 transition-colors"
                    style={{ gridTemplateColumns: `200px repeat(${ALL_ROLES.length}, 1fr)` }}
                  >
                    <div className="p-2.5 px-3 pl-8 flex items-center">
                      <span className="text-xs text-muted-foreground">{perm.label}</span>
                    </div>
                    {ALL_ROLES.map(role => {
                      const granted = isGranted(role, perm.key);
                      return (
                        <div key={role} className="p-2.5 flex justify-center items-center">
                          <Switch
                            checked={granted}
                            onCheckedChange={() => handleToggle(role, perm.key, granted)}
                            className={cn(
                              "scale-75",
                              granted && "data-[state=checked]:bg-emerald-500"
                            )}
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

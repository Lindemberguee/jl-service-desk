import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarHeader, SidebarFooter,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Plus, Building2, Package,
  BarChart3, Users, LogOut, Wrench, ShieldCheck, Settings2, Gauge, ScrollText, KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const menuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', permission: 'os:read' as const },
  { label: 'Ordens de Serviço', icon: ClipboardList, path: '/os', permission: 'os:read' as const },
  { label: 'Nova OS', icon: Plus, path: '/os/nova', permission: 'os:create' as const },
  { label: 'Cadastros', icon: Building2, path: '/cadastros', permission: 'os:read' as const },
  { label: 'Ativos', icon: Wrench, path: '/ativos', permission: 'assets:manage' as const },
  { label: 'Estoque', icon: Package, path: '/estoque', permission: 'stock:manage' as const },
  { label: 'Relatórios', icon: BarChart3, path: '/relatorios', permission: 'reports:read' as const },
  { label: 'Usuários', icon: Users, path: '/usuarios', permission: 'users:manage' as const },
];

const adminItems = [
  { label: 'Painel Consolidado', icon: Gauge, path: '/admin' },
  { label: 'Departamentos', icon: Building2, path: '/admin/departamentos' },
  { label: 'Usuários & Acessos', icon: ShieldCheck, path: '/admin/usuarios' },
  { label: 'Auditoria Global', icon: ScrollText, path: '/admin/auditoria' },
  { label: 'Configurações', icon: Settings2, path: '/admin/configuracoes' },
];

export function AppSidebar() {
  const { currentRole, profile, signOut, memberships, currentTenantId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentTenant = memberships.find(m => m.tenant_id === currentTenantId);
  const isSuperAdmin = currentRole === 'super_admin';

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Wrench className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight">ServiceOS</span>
            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
              {currentTenant?.tenant_name || 'Sem departamento'}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.map(item => {
              if (currentRole && !hasPermission(currentRole, item.permission)) return null;
              const isActive = location.pathname === item.path ||
                (item.path !== '/os/nova' && item.path !== '/dashboard' && location.pathname.startsWith(item.path) && !location.pathname.startsWith('/admin'));
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton isActive={isActive} onClick={() => navigate(item.path)} tooltip={item.label}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarMenu>
              {adminItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton isActive={isActive} onClick={() => navigate(item.path)} tooltip={item.label}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <button
          className="flex items-center gap-2 mb-2 w-full hover:bg-muted/30 rounded-md p-1 transition-colors"
          onClick={() => navigate('/perfil')}
        >
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
            {profile?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex flex-col flex-1 min-w-0 text-left">
            <span className="text-sm font-medium truncate">{profile?.name || 'Usuário'}</span>
            <span className="text-xs text-muted-foreground truncate">{profile?.email}</span>
          </div>
          <KeyRound className="h-3 w-3 text-muted-foreground" />
        </button>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

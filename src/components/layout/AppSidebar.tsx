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
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center shadow-sm">
            <Wrench className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">ServiceOS</span>
            <span className="text-[11px] text-[hsl(var(--sidebar-muted-foreground))] truncate max-w-[140px]">
              {currentTenant?.tenant_name || 'Sem departamento'}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-[hsl(var(--sidebar-muted-foreground))] font-semibold px-3">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.map(item => {
              if (currentRole && !hasPermission(currentRole, item.permission)) return null;
              const isActive = location.pathname === item.path ||
                (item.path !== '/os/nova' && item.path !== '/dashboard' && location.pathname.startsWith(item.path) && !location.pathname.startsWith('/admin'));
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton isActive={isActive} onClick={() => navigate(item.path)} tooltip={item.label}>
                    <item.icon className="h-4 w-4" />
                    <span className="text-[13px]">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-[hsl(var(--sidebar-muted-foreground))] font-semibold px-3">
              Administração
            </SidebarGroupLabel>
            <SidebarMenu>
              {adminItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton isActive={isActive} onClick={() => navigate(item.path)} tooltip={item.label}>
                      <item.icon className="h-4 w-4" />
                      <span className="text-[13px]">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <button
          className="flex items-center gap-2 w-full rounded-md p-2 transition-colors hover:bg-sidebar-accent"
          onClick={() => navigate('/perfil')}
        >
          <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold text-sidebar-foreground">
            {profile?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex flex-col flex-1 min-w-0 text-left">
            <span className="text-[13px] font-medium truncate text-sidebar-foreground">{profile?.name || 'Usuário'}</span>
            <span className="text-[11px] text-[hsl(var(--sidebar-muted-foreground))] truncate">{profile?.email}</span>
          </div>
          <KeyRound className="h-3 w-3 text-[hsl(var(--sidebar-muted-foreground))]" />
        </button>
        <Separator className="my-1 bg-sidebar-border" />
        <button
          className="flex items-center gap-2 w-full rounded-md p-2 text-[13px] transition-colors hover:bg-sidebar-accent text-[hsl(var(--sidebar-muted-foreground))]"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}

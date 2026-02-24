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
  BarChart3, Users, LogOut, Wrench, ShieldCheck, Settings2,
  Gauge, ScrollText, KeyRound, Hammer, ChevronRight,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { roleLabels } from '@/lib/permissions';
import type { Permission } from '@/lib/permissions';

interface MenuItem {
  label: string;
  icon: React.ElementType;
  path: string;
  permission: Permission;
  badge?: string;
}

const operationalItems: MenuItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', permission: 'os:read' },
  { label: 'Ordens de Serviço', icon: ClipboardList, path: '/os', permission: 'os:read' },
  { label: 'Nova OS', icon: Plus, path: '/os/nova', permission: 'os:create' },
];

const managementItems: MenuItem[] = [
  { label: 'Cadastros', icon: Building2, path: '/cadastros', permission: 'cadastros:read' },
  { label: 'Ativos', icon: Wrench, path: '/ativos', permission: 'assets:read' },
  { label: 'Estoque', icon: Package, path: '/estoque', permission: 'stock:read' },
  { label: 'Relatórios', icon: BarChart3, path: '/relatorios', permission: 'reports:read' },
  { label: 'Equipe', icon: Users, path: '/usuarios', permission: 'users:read' },
];

const toolsItems: MenuItem[] = [
  { label: 'Ferramentas', icon: Hammer, path: '/ferramentas', permission: 'tools:read', badge: 'Em breve' },
];

const adminItems = [
  { label: 'Painel Consolidado', icon: Gauge, path: '/admin' },
  { label: 'Departamentos', icon: Building2, path: '/admin/departamentos' },
  { label: 'Usuários & Acessos', icon: ShieldCheck, path: '/admin/usuarios' },
  { label: 'Auditoria Global', icon: ScrollText, path: '/admin/auditoria' },
  { label: 'Configurações', icon: Settings2, path: '/admin/configuracoes' },
];

function isPathActive(current: string, itemPath: string): boolean {
  if (itemPath === '/dashboard') return current === '/dashboard';
  if (itemPath === '/os/nova') return current === '/os/nova';
  if (itemPath === '/admin') return current === '/admin';
  if (current.startsWith('/admin')) return current.startsWith(itemPath) && itemPath.startsWith('/admin');
  return current === itemPath || (current.startsWith(itemPath) && !current.startsWith('/admin'));
}

export function AppSidebar() {
  const { currentRole, profile, signOut, memberships, currentTenantId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentTenant = memberships.find(m => m.tenant_id === currentTenantId);
  const isSuperAdmin = currentRole === 'super_admin';

  const renderMenuGroup = (items: MenuItem[]) => (
    <SidebarMenu>
      {items.map(item => {
        if (currentRole && !hasPermission(currentRole, item.permission)) return null;
        const isActive = isPathActive(location.pathname, item.path);
        return (
          <SidebarMenuItem key={item.path}>
            <SidebarMenuButton isActive={isActive} onClick={() => navigate(item.path)} tooltip={item.label}>
              <item.icon className="h-4 w-4" />
              <span className="text-[13px] flex-1">{item.label}</span>
              {item.badge && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal bg-muted text-muted-foreground">
                  {item.badge}
                </Badge>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center shadow-sm">
            <Wrench className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">ServiceOS</span>
            <span className="text-[11px] text-sidebar-foreground/50 truncate max-w-[140px]">
              {currentTenant?.tenant_name || 'Sem departamento'}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {/* Operacional */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold px-3">
            Operacional
          </SidebarGroupLabel>
          {renderMenuGroup(operationalItems)}
        </SidebarGroup>

        {/* Gestão */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold px-3">
            Gestão
          </SidebarGroupLabel>
          {renderMenuGroup(managementItems)}
        </SidebarGroup>

        {/* Ferramentas */}
        {currentRole && hasPermission(currentRole, 'tools:read') && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold px-3">
              Avançado
            </SidebarGroupLabel>
            {renderMenuGroup(toolsItems)}
          </SidebarGroup>
        )}

        {/* Administração */}
        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold px-3">
              Administração
            </SidebarGroupLabel>
            <SidebarMenu>
              {adminItems.map(item => {
                const isActive = isPathActive(location.pathname, item.path);
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
          className="flex items-center gap-2 w-full rounded-md p-2 transition-colors hover:bg-sidebar-accent group"
          onClick={() => navigate('/perfil')}
        >
          <div className="h-8 w-8 rounded-full bg-sidebar-primary/10 flex items-center justify-center text-xs font-semibold text-sidebar-primary">
            {profile?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex flex-col flex-1 min-w-0 text-left">
            <span className="text-[13px] font-medium truncate text-sidebar-foreground">{profile?.name || 'Usuário'}</span>
            <span className="text-[10px] text-sidebar-foreground/40 truncate">
              {currentRole ? roleLabels[currentRole] : ''}
            </span>
          </div>
          <ChevronRight className="h-3 w-3 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 transition-colors" />
        </button>
        <Separator className="my-1 bg-sidebar-border" />
        <button
          className="flex items-center gap-2 w-full rounded-md p-2 text-[13px] transition-colors hover:bg-destructive/10 text-sidebar-foreground/50 hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}

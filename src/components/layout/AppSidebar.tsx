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
  Gauge, ScrollText, Hammer, ChevronRight, CircleDot, Activity,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { roleLabels } from '@/lib/permissions';
import type { Permission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface MenuItem {
  label: string;
  icon: React.ElementType;
  path: string;
  permission: Permission;
  badge?: string;
}

const operationalItems: MenuItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', permission: 'dashboard:read' },
  { label: 'Ordens de Serviço', icon: ClipboardList, path: '/os', permission: 'os:read' },
  { label: 'Nova OS', icon: Plus, path: '/os/nova', permission: 'os:create' },
];

const managementItems: MenuItem[] = [
  { label: 'Cadastros', icon: Building2, path: '/cadastros', permission: 'cadastros:read' },
  { label: 'Ativos', icon: Wrench, path: '/ativos', permission: 'assets:read' },
  { label: 'Estoque', icon: Package, path: '/estoque', permission: 'stock:read' },
  { label: 'Controle de Materiais', icon: ClipboardList, path: '/materiais', permission: 'materiais:read' },
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
  { label: 'Saúde do Sistema', icon: Activity, path: '/admin/saude' },
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

function MenuItemButton({ item, isActive, onClick }: { item: { label: string; icon: React.ElementType; path: string; badge?: string }; isActive: boolean; onClick: () => void }) {
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        onClick={onClick}
        tooltip={item.label}
        className={cn(
          "relative transition-all duration-200 group/btn",
          isActive && "bg-sidebar-primary/15 text-sidebar-primary font-medium shadow-[inset_0_0_0_1px_hsl(var(--sidebar-primary)/0.15)]",
          !isActive && "hover:translate-x-0.5"
        )}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-active-pill"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary"
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}
        <Icon className={cn(
          "h-4 w-4 transition-colors duration-200",
          isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover/btn:text-sidebar-foreground/80"
        )} />
        <span className="text-[13px] flex-1">{item.label}</span>
        {item.badge && (
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal bg-sidebar-primary/10 text-sidebar-primary/70 border-0">
            {item.badge}
          </Badge>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/30 font-semibold px-3 mb-0.5">
      {children}
    </SidebarGroupLabel>
  );
}

export function AppSidebar() {
  const { currentRole, profile, signOut, memberships, currentTenantId, rolePermissions } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentTenant = memberships.find(m => m.tenant_id === currentTenantId);
  const isSuperAdmin = currentRole === 'super_admin';

  const renderMenuGroup = (items: MenuItem[]) => (
    <SidebarMenu>
      {items.map(item => {
        if (currentRole && !hasPermission(currentRole, item.permission, undefined, rolePermissions)) return null;
        const isActive = isPathActive(location.pathname, item.path);
        return (
          <MenuItemButton
            key={item.path}
            item={item}
            isActive={isActive}
            onClick={() => navigate(item.path)}
          />
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar>
      {/* Header with subtle gradient accent */}
      <SidebarHeader className="p-4 border-b border-sidebar-border/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-3 relative">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/80 flex items-center justify-center shadow-lg shadow-sidebar-primary/20">
            <Wrench className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">ServiceOS</span>
            <div className="flex items-center gap-1.5">
              <CircleDot className="h-2 w-2 text-emerald-400" />
              <span className="text-[11px] text-sidebar-foreground/40 truncate max-w-[120px]">
                {currentTenant?.tenant_name || 'Sem departamento'}
              </span>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-3 px-1">
        {/* Operacional */}
        <SidebarGroup className="py-1">
          <SectionLabel>Operacional</SectionLabel>
          {renderMenuGroup(operationalItems)}
        </SidebarGroup>

        <div className="mx-4 my-1">
          <Separator className="bg-sidebar-border/30" />
        </div>

        {/* Gestão */}
        <SidebarGroup className="py-1">
          <SectionLabel>Gestão</SectionLabel>
          {renderMenuGroup(managementItems)}
        </SidebarGroup>

        {/* Ferramentas */}
        {currentRole && hasPermission(currentRole, 'tools:read', undefined, rolePermissions) && (
          <>
            <div className="mx-4 my-1">
              <Separator className="bg-sidebar-border/30" />
            </div>
            <SidebarGroup className="py-1">
              <SectionLabel>Avançado</SectionLabel>
              {renderMenuGroup(toolsItems)}
            </SidebarGroup>
          </>
        )}

        {/* Administração */}
        {isSuperAdmin && (
          <>
            <div className="mx-4 my-1">
              <Separator className="bg-sidebar-border/30" />
            </div>
            <SidebarGroup className="py-1">
              <SectionLabel>Administração</SectionLabel>
              <SidebarMenu>
                {adminItems.map(item => {
                  const isActive = isPathActive(location.pathname, item.path);
                  return (
                    <MenuItemButton
                      key={item.path}
                      item={item}
                      isActive={isActive}
                      onClick={() => navigate(item.path)}
                    />
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border/50">
        <button
          className="flex items-center gap-2.5 w-full rounded-xl p-2.5 transition-all duration-200 hover:bg-sidebar-accent group"
          onClick={() => navigate('/perfil')}
        >
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sidebar-primary/20 to-sidebar-primary/5 flex items-center justify-center text-xs font-bold text-sidebar-primary ring-1 ring-sidebar-primary/10">
            {profile?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex flex-col flex-1 min-w-0 text-left">
            <span className="text-[13px] font-medium truncate text-sidebar-foreground">{profile?.name || 'Usuário'}</span>
            <span className="text-[10px] text-sidebar-foreground/35 truncate">
              {currentRole ? roleLabels[currentRole] : ''}
            </span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/20 group-hover:text-sidebar-foreground/50 group-hover:translate-x-0.5 transition-all duration-200" />
        </button>
        <button
          className="flex items-center gap-2.5 w-full rounded-xl p-2.5 text-[13px] transition-all duration-200 hover:bg-destructive/10 text-sidebar-foreground/40 hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}

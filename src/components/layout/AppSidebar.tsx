import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarHeader, SidebarFooter,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { hasPermission } from '@/lib/permissions';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Plus, Building2, Package,
  BarChart3, Users, LogOut, Wrench, ShieldCheck, Settings2,
  Gauge, ScrollText, ChevronRight, CircleDot, Activity,
  UserCircle, Contact, Target, FileText, Trash2, Crown, Lock,
  MessageCircle,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { roleLabels } from '@/lib/permissions';
import type { Permission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Map sidebar items to module keys for gating
const permissionToModule: Record<string, string> = {
  'assets:read': 'assets',
  'stock:read': 'stock',
  'materiais:read': 'stock',
  'manutencao:read': 'manutencao',
  'disposal:read': 'disposal',
  'kpis:read': 'kpis',
  'reports:read': 'reports',
  'docs:read': 'docs',
  'tools:canvas': 'canvas',
  'tools:notes': 'notes',
  'tools:reminders': 'reminders',
  'api:manage': 'api',
};

interface MenuItem {
  label: string;
  icon: React.ElementType;
  path: string;
  permission: Permission;
  badge?: string;
  moduleKey?: string;
}

const operationalItems: MenuItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', permission: 'dashboard:read', moduleKey: 'dashboard' },
  { label: 'Minhas OS', icon: UserCircle, path: '/minhas-os', permission: 'my_os:read', moduleKey: 'os' },
  { label: 'Ordens de Serviço', icon: ClipboardList, path: '/os', permission: 'os:read', moduleKey: 'os' },
  { label: 'Nova OS', icon: Plus, path: '/os/nova', permission: 'os:create', moduleKey: 'os' },
];

const infraItems: MenuItem[] = [
  { label: 'Ativos', icon: Wrench, path: '/ativos', permission: 'assets:read', moduleKey: 'assets' },
  { label: 'Manutenção', icon: Settings2, path: '/manutencao', permission: 'manutencao:read', moduleKey: 'manutencao' },
  { label: 'Estoque', icon: Package, path: '/estoque', permission: 'stock:read', moduleKey: 'stock' },
  { label: 'Controle de Materiais', icon: ClipboardList, path: '/materiais', permission: 'materiais:read', moduleKey: 'stock' },
  { label: 'Descarte', icon: Trash2, path: '/descarte', permission: 'disposal:read', moduleKey: 'disposal' },
];

const managementItems: MenuItem[] = [
  { label: 'Cadastros', icon: Building2, path: '/cadastros', permission: 'cadastros:read', moduleKey: 'os' },
  { label: 'Colaboradores', icon: Contact, path: '/colaboradores', permission: 'collaborators:read', moduleKey: 'os' },
  { label: 'Equipe', icon: Users, path: '/usuarios', permission: 'users:read', moduleKey: 'os' },
  { label: 'Relatórios', icon: BarChart3, path: '/relatorios', permission: 'reports:read', moduleKey: 'reports' },
  { label: 'KPIs & OKRs', icon: Target, path: '/kpis', permission: 'kpis:read', moduleKey: 'kpis' },
];

const knowledgeItems: MenuItem[] = [
  { label: 'Documentos & Cofre', icon: FileText, path: '/documentos', permission: 'docs:read', moduleKey: 'docs' },
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
  if (itemPath === '/minhas-os') return current === '/minhas-os' || current.startsWith('/minhas-os/');
  if (itemPath === '/admin') return current === '/admin';
  if (current.startsWith('/admin')) return current.startsWith(itemPath) && itemPath.startsWith('/admin');
  return current === itemPath || (current.startsWith(itemPath) && !current.startsWith('/admin'));
}

function MenuItemButton({ item, isActive, onClick, locked }: { item: { label: string; icon: React.ElementType; path: string; badge?: string }; isActive: boolean; onClick: () => void; locked?: boolean }) {
  const Icon = item.icon;

  if (locked) {
    return (
      <SidebarMenuItem>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuButton
              className="opacity-40 cursor-not-allowed"
              onClick={(e) => e.preventDefault()}
            >
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[13px] flex-1 line-through">{item.label}</span>
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-normal bg-muted text-muted-foreground border-0">
                PRO
              </Badge>
            </SidebarMenuButton>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="text-xs">Módulo não incluído no plano atual</p>
          </TooltipContent>
        </Tooltip>
      </SidebarMenuItem>
    );
  }

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
  const { currentRole, profile, signOut, memberships, currentTenantId, rolePermissions, isModuleEnabled, isSubscriptionActive, subscription } = useAuth();
  const { tenantName, tenantLogo } = useTenantBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const currentTenant = memberships.find(m => m.tenant_id === currentTenantId);
  const isSuperAdmin = currentRole === 'super_admin';
  const subActive = isSubscriptionActive();

  const renderMenuGroup = (items: MenuItem[]) => (
    <SidebarMenu>
      {items.map(item => {
        if (currentRole && !hasPermission(currentRole, item.permission, undefined, rolePermissions)) return null;
        const isActive = isPathActive(location.pathname, item.path);
        const moduleKey = item.moduleKey;
        const locked = moduleKey ? !isModuleEnabled(moduleKey) : false;
        return (
          <MenuItemButton
            key={item.path}
            item={item}
            isActive={isActive}
            onClick={() => navigate(item.path)}
            locked={locked}
          />
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-3 relative">
          {tenantLogo ? (
            <img src={tenantLogo} alt={tenantName} className="h-9 w-9 rounded-xl object-contain bg-white/10 p-0.5" />
          ) : (
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/80 flex items-center justify-center shadow-lg shadow-sidebar-primary/20">
              <Wrench className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">{tenantName}</span>
            <div className="flex items-center gap-1.5">
              <CircleDot className={cn("h-2 w-2", subActive ? "text-emerald-400" : "text-red-400")} />
              <span className="text-[11px] text-sidebar-foreground/40 truncate max-w-[120px]">
                {currentTenant?.tenant_name || 'Sem departamento'}
              </span>
            </div>
          </div>
        </div>

        {/* Subscription warning banner */}
        {!subActive && !isSuperAdmin && (
          <div className="mt-2 px-2 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-[10px] text-destructive font-medium">
              ⚠️ Plano expirado ou suspenso. Contate o administrador.
            </p>
          </div>
        )}

        {subscription?.status === 'trial' && subscription.trial_ends_at && !isSuperAdmin && (
          (() => {
            const daysLeft = Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / 86400000);
            if (daysLeft <= 7 && daysLeft > 0) {
              return (
                <div className="mt-2 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[10px] text-amber-600 font-medium">
                    ⏳ Trial expira em {daysLeft} dia{daysLeft > 1 ? 's' : ''}
                  </p>
                </div>
              );
            }
            return null;
          })()
        )}
      </SidebarHeader>

      <SidebarContent className="py-3 px-1">
        <SidebarGroup className="py-1">
          <SectionLabel>Operacional</SectionLabel>
          {renderMenuGroup(operationalItems)}
        </SidebarGroup>

        <div className="mx-4 my-1"><Separator className="bg-sidebar-border/30" /></div>

        <SidebarGroup className="py-1">
          <SectionLabel>Infraestrutura</SectionLabel>
          {renderMenuGroup(infraItems)}
        </SidebarGroup>

        <div className="mx-4 my-1"><Separator className="bg-sidebar-border/30" /></div>

        <SidebarGroup className="py-1">
          <SectionLabel>Gestão</SectionLabel>
          {renderMenuGroup(managementItems)}
        </SidebarGroup>

        <div className="mx-4 my-1"><Separator className="bg-sidebar-border/30" /></div>

        <SidebarGroup className="py-1">
          <SectionLabel>Conhecimento</SectionLabel>
          {renderMenuGroup(knowledgeItems)}
        </SidebarGroup>

        {currentRole && hasPermission(currentRole, 'settings:manage', undefined, rolePermissions) && (
          <>
            <div className="mx-4 my-1"><Separator className="bg-sidebar-border/30" /></div>
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
                {isSuperAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => navigate('/master')}
                      tooltip="Painel Master"
                      className={cn(
                        "relative transition-all duration-200 group/btn hover:translate-x-0.5",
                        isPathActive(location.pathname, '/master') && "bg-amber-500/10 text-amber-600 font-medium"
                      )}
                    >
                      <Crown className="h-4 w-4 text-amber-500" />
                      <span className="text-[13px] flex-1">Painel Master</span>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal bg-amber-500/10 text-amber-500 border-0">
                        SaaS
                      </Badge>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
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
        <a
          href="https://wa.me/5512996543522?text=Olá! Gostaria de saber mais sobre os planos e funcionalidades."
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 w-full rounded-xl p-2.5 text-[13px] transition-all duration-200 bg-[hsl(142,70%,45%)]/10 hover:bg-[hsl(142,70%,45%)]/20 text-[hsl(142,70%,35%)]"
        >
          <MessageCircle className="h-4 w-4" />
          <span>Fale Conosco</span>
        </a>
        <div className="mt-1 pt-2 border-t border-sidebar-border/30 text-center">
          <p className="text-[9px] text-sidebar-foreground/25 leading-relaxed">
            Desenvolvido por{' '}
            <a href="https://github.com/Lindemberguee" target="_blank" rel="noopener noreferrer" className="text-sidebar-primary/50 hover:text-sidebar-primary transition-colors">
              José Lindembergue
            </a>
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

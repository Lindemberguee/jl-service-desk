import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDarkMode } from '@/hooks/useDarkMode';
import { ClipboardList, Plus, User, LogOut, Sun, Moon, Wrench } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { label: 'Minhas OS', icon: ClipboardList, path: '/portal' },
  { label: 'Nova Solicitação', icon: Plus, path: '/portal/nova' },
  { label: 'Meu Perfil', icon: User, path: '/portal/perfil' },
];

export function RequesterLayout() {
  const { profile, signOut, memberships, currentTenantId, switchTenant } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggle } = useDarkMode();
  const currentTenant = memberships.find(m => m.tenant_id === currentTenantId);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top header */}
      <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Wrench className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold leading-none">ServiceOS</p>
            <p className="text-[11px] text-muted-foreground">{currentTenant?.tenant_name || 'Portal'}</p>
          </div>
        </div>

        {/* Nav links - desktop */}
        <nav className="hidden md:flex items-center gap-1 ml-6">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => navigate(item.path)}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        <div className="flex-1" />

        {memberships.length > 1 && (
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
            <Select value={currentTenantId || ''} onValueChange={switchTenant}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                {memberships.map(m => (
                  <SelectItem key={m.tenant_id} value={m.tenant_id}>
                    {m.tenant_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[120px]">
          {profile?.name}
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggle}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isDark ? 'Tema claro' : 'Tema escuro'}</TooltipContent>
        </Tooltip>

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={signOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card z-50 flex">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
              onClick={() => navigate(item.path)}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 max-w-4xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
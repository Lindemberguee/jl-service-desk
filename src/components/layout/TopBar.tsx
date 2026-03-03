import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabels } from '@/lib/permissions';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Sun, Moon } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeCustomizer } from '@/components/ThemeCustomizer';
import { SubscriptionBadge } from '@/components/layout/SubscriptionBadge';

export function TopBar() {
  const { memberships, currentTenantId, switchTenant, currentRole } = useAuth();
  const { isDark, toggle } = useDarkMode();

  return (
    <header className="flex h-12 items-center gap-3 border-b border-border px-4 bg-card">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />

      <div className="flex-1" />

      {memberships.length > 1 && (
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          <Select value={currentTenantId || ''} onValueChange={switchTenant}>
            <SelectTrigger className="w-[140px] sm:w-[180px] h-8 text-xs border-border">
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

      {currentRole && (
        <Badge variant="outline" className="text-[11px] font-medium h-6 border-primary/20 text-primary bg-primary/5 hidden sm:flex">
          {roleLabels[currentRole] || currentRole}
        </Badge>
      )}

      <SubscriptionBadge />

      <NotificationBell />
      <ThemeCustomizer />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggle}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isDark ? 'Tema claro' : 'Tema escuro'}
        </TooltipContent>
      </Tooltip>
    </header>
  );
}

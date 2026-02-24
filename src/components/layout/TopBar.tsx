import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabels } from '@/lib/permissions';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';

export function TopBar() {
  const { memberships, currentTenantId, switchTenant, currentRole } = useAuth();

  return (
    <header className="flex h-12 items-center gap-3 border-b border-border px-4 bg-card">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />

      <div className="flex-1" />

      {memberships.length > 1 && (
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={currentTenantId || ''} onValueChange={switchTenant}>
            <SelectTrigger className="w-[180px] h-8 text-xs border-border">
              <SelectValue placeholder="Selecione o departamento" />
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
        <Badge variant="outline" className="text-[11px] font-medium h-6 border-primary/20 text-primary bg-primary/5">
          {roleLabels[currentRole] || currentRole}
        </Badge>
      )}
    </header>
  );
}

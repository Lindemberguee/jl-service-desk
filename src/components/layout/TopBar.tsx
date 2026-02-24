import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export function TopBar() {
  const { memberships, currentTenantId, switchTenant, currentRole } = useAuth();

  return (
    <header className="flex h-14 items-center gap-4 border-b px-4 bg-card/50 backdrop-blur-sm">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />

      <div className="flex-1" />

      {memberships.length > 1 && (
        <Select value={currentTenantId || ''} onValueChange={switchTenant}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Selecione o tenant" />
          </SelectTrigger>
          <SelectContent>
            {memberships.map(m => (
              <SelectItem key={m.tenant_id} value={m.tenant_id}>
                {m.tenant_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {currentRole && (
        <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium capitalize">
          {currentRole.replace('_', ' ')}
        </span>
      )}
    </header>
  );
}

import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const ALL_ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Administrador' },
  { value: 'coordenador', label: 'Coordenador' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'analista', label: 'Analista' },
  { value: 'solicitante', label: 'Solicitante' },
];

interface NotificationEventRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  eventKey: string;
  targetRoles: string[];
  onRolesChange: (eventKey: string, roles: string[]) => void;
}

export function NotificationEventRow({
  icon,
  title,
  description,
  enabled,
  onToggle,
  eventKey,
  targetRoles,
  onRolesChange,
}: NotificationEventRowProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleRole = (role: string) => {
    const newRoles = targetRoles.includes(role)
      ? targetRoles.filter(r => r !== role)
      : [...targetRoles, role];
    onRolesChange(eventKey, newRoles);
  };

  return (
    <div className="rounded-lg border hover:bg-accent/30 transition-colors overflow-hidden">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {icon}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {enabled && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent"
            >
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {targetRoles.length} cargo{targetRoles.length !== 1 ? 's' : ''}
              </Badge>
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </div>

      {enabled && expanded && (
        <div className="px-3 pb-3 pt-1 border-t bg-muted/20">
          <p className="text-[11px] text-muted-foreground mb-2 font-medium">Cargos que receberão esta notificação:</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {ALL_ROLES.map(role => (
              <label
                key={role.value}
                className="flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <Checkbox
                  checked={targetRoles.includes(role.value)}
                  onCheckedChange={() => toggleRole(role.value)}
                  className="h-3.5 w-3.5"
                />
                <span className={targetRoles.includes(role.value) ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                  {role.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

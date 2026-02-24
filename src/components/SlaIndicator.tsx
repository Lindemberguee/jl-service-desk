import { calculateSlaStatus, formatRemainingTime } from '@/lib/sla';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, PauseCircle, CheckCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SlaIndicatorProps {
  workOrder: any;
  compact?: boolean;
}

export function SlaIndicator({ workOrder, compact = false }: SlaIndicatorProps) {
  if (!workOrder.response_due_at && !workOrder.resolve_due_at) return null;

  const sla = calculateSlaStatus(workOrder);
  
  const Icon = sla.responseOverdue || sla.resolveOverdue
    ? AlertTriangle
    : sla.label === 'SLA Pausado'
    ? PauseCircle
    : sla.label.includes('Encerrada')
    ? CheckCircle
    : Clock;

  const badgeClass = sla.responseOverdue || sla.resolveOverdue
    ? 'bg-destructive/10 text-destructive border-destructive/20 animate-pulse'
    : sla.label === 'SLA Próximo'
    ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    : sla.label === 'SLA Pausado'
    ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
    : 'bg-green-500/10 text-green-500 border-green-500/20';

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${badgeClass} gap-1`}>
            <Icon className="h-3 w-3" />
            {sla.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            {sla.responseRemainingMs !== null && (
              <p>Resposta: {formatRemainingTime(sla.responseRemainingMs)}</p>
            )}
            {sla.resolveRemainingMs !== null && (
              <p>Resolução: {formatRemainingTime(sla.resolveRemainingMs)}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${sla.color}`}>
      <Icon className="h-4 w-4" />
      <span className="font-medium">{sla.label}</span>
      {sla.resolveRemainingMs !== null && (
        <span className="text-xs text-muted-foreground">
          ({formatRemainingTime(sla.resolveRemainingMs)})
        </span>
      )}
    </div>
  );
}

import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { calculateSlaStatus, formatRemainingTime } from '@/lib/sla';

interface Props {
  workOrder: any;
}

export function WorkOrderSlaBadge({ workOrder }: Props) {
  const sla = calculateSlaStatus(workOrder);
  const isOverdue = sla.responseOverdue || sla.resolveOverdue;
  const remainingMs = sla.resolveRemainingMs ?? sla.responseRemainingMs;

  if (isOverdue) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-600">
        <AlertTriangle className="h-3.5 w-3.5" />
        SLA atrasado
      </div>
    );
  }

  if (remainingMs !== null && remainingMs !== undefined) {
    const isAtRisk = remainingMs < 1000 * 60 * 60 * 8;

    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium ${
          isAtRisk
            ? 'border-amber-500/20 bg-amber-500/10 text-amber-600'
            : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
        }`}
      >
        {isAtRisk ? <Clock3 className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
        {formatRemainingTime(remainingMs)}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground">
      <Clock3 className="h-3.5 w-3.5" />
      Sem SLA
    </div>
  );
}

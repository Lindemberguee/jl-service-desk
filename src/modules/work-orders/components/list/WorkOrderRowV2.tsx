import { WorkOrder } from '../../types/workOrder.types';
import { WorkOrderSlaBadge } from './WorkOrderSlaBadge';

interface Props {
  wo: WorkOrder;
  onClick?: () => void;
}

export function WorkOrderRowV2({ wo, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className="group grid cursor-pointer grid-cols-[120px_1fr_160px_140px_180px] items-center gap-2 border-t border-border px-4 py-3 transition-all hover:bg-muted/40"
    >
      <div className="text-xs font-medium text-muted-foreground">{wo.code}</div>

      <div className="flex flex-col">
        <span className="font-medium text-foreground group-hover:text-primary">
          {wo.title}
        </span>
        <span className="text-xs text-muted-foreground">
          Atualizado: {new Date(wo.updated_at).toLocaleDateString()}
        </span>
      </div>

      <WorkOrderSlaBadge workOrder={wo} />

      <div className="text-sm text-muted-foreground">{wo.status}</div>

      <div className="text-sm text-muted-foreground">
        {wo.assignee || 'Não atribuído'}
      </div>
    </div>
  );
}

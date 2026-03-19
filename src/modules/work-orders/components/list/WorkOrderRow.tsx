import { WorkOrder } from '../../types/workOrder.types';
import { WORK_ORDER_STATUS_DOT, WORK_ORDER_PRIORITY_DOT } from '../../constants/workOrder.constants';

interface Props {
  wo: WorkOrder;
  onClick?: () => void;
}

export function WorkOrderRow({ wo, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className="grid grid-cols-[120px_1fr_120px_120px_140px] items-center gap-3 px-4 py-2 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
    >
      <span className="text-xs font-mono text-muted-foreground">{wo.code}</span>

      <div className="flex flex-col">
        <span className="text-sm font-medium truncate">{wo.title}</span>
        <span className="text-[11px] text-muted-foreground">Atualizado: {new Date(wo.updated_at).toLocaleDateString('pt-BR')}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${WORK_ORDER_PRIORITY_DOT[wo.priority]}`} />
        <span className="text-xs capitalize">{wo.priority}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${WORK_ORDER_STATUS_DOT[wo.status]}`} />
        <span className="text-xs capitalize">{wo.status.replace('_', ' ')}</span>
      </div>

      <div className="text-xs text-muted-foreground">
        {wo.assigned_to_id ? 'Atribuída' : 'Sem técnico'}
      </div>
    </div>
  );
}

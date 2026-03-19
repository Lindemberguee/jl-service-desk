import { WorkOrder } from '../../types/workOrder.types';
import { WorkOrderRow } from './WorkOrderRow';

interface Props {
  data: WorkOrder[];
  onRowClick?: (wo: WorkOrder) => void;
}

export function WorkOrdersTable({ data, onRowClick }: Props) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[120px_1fr_120px_120px_140px] px-4 py-2 bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        <span>Código</span>
        <span>Título</span>
        <span>Prioridade</span>
        <span>Status</span>
        <span>Responsável</span>
      </div>

      {/* Rows */}
      <div>
        {data.map((wo) => (
          <WorkOrderRow
            key={wo.id}
            wo={wo}
            onClick={() => onRowClick?.(wo)}
          />
        ))}
      </div>
    </div>
  );
}

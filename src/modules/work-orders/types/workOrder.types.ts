export type WorkOrderStatus =
  | 'aberta'
  | 'reaberta'
  | 'em_execucao'
  | 'aguardando_peca'
  | 'aguardando_solicitante'
  | 'aguardando_terceiro'
  | 'concluida'
  | 'aprovada'
  | 'encerrada';

export type WorkOrderPriority = 'baixa' | 'media' | 'alta' | 'critica';

export interface WorkOrder {
  id: string;
  code: string;
  title: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  tenant_id: string;
  unit_id?: string | null;
  assigned_to_id?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  paused_at?: string | null;
  total_paused_ms?: number;
}

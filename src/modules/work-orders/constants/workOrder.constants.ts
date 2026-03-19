import { WorkOrderPriority, WorkOrderStatus } from '../types/workOrder.types';

export const WORK_ORDER_PAGE_SIZES = [10, 25, 50, 100] as const;

export const PRIORITY_ORDER: Record<WorkOrderPriority, number> = {
  critica: 0,
  alta: 1,
  media: 2,
  baixa: 3,
};

export const OPEN_STATUSES: WorkOrderStatus[] = ['aberta', 'reaberta'];
export const IN_PROGRESS_STATUSES: WorkOrderStatus[] = [
  'em_execucao',
  'aguardando_peca',
  'aguardando_solicitante',
  'aguardando_terceiro',
];
export const CLOSED_STATUSES: WorkOrderStatus[] = ['concluida', 'aprovada', 'encerrada'];

export const WORK_ORDER_STATUS_DOT: Record<WorkOrderStatus, string> = {
  aberta: 'bg-blue-500',
  reaberta: 'bg-red-500',
  em_execucao: 'bg-amber-500',
  aguardando_peca: 'bg-orange-500',
  aguardando_solicitante: 'bg-yellow-500',
  aguardando_terceiro: 'bg-yellow-500',
  concluida: 'bg-emerald-500',
  aprovada: 'bg-emerald-600',
  encerrada: 'bg-muted-foreground',
};

export const WORK_ORDER_PRIORITY_DOT: Record<WorkOrderPriority, string> = {
  critica: 'bg-red-500',
  alta: 'bg-orange-500',
  media: 'bg-yellow-500',
  baixa: 'bg-emerald-500',
};

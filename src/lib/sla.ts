/**
 * SLA calculation utilities with pause support
 */

export interface SlaStatus {
  responseOverdue: boolean;
  resolveOverdue: boolean;
  responseRemainingMs: number | null;
  resolveRemainingMs: number | null;
  label: string;
  color: string;
}

const PAUSE_STATUSES = ['aguardando_peca', 'aguardando_solicitante', 'aguardando_terceiro'];

export function calculateSlaStatus(wo: {
  status: string;
  response_due_at: string | null;
  resolve_due_at: string | null;
  started_at: string | null;
  paused_at: string | null;
  total_paused_ms: number | null;
  closed_at: string | null;
  resolved_at: string | null;
}): SlaStatus {
  const now = Date.now();
  const isClosed = ['concluida', 'aprovada', 'encerrada'].includes(wo.status);
  const isPaused = PAUSE_STATUSES.includes(wo.status);

  // Calculate effective elapsed with pause deductions
  const pausedMs = wo.total_paused_ms || 0;
  const currentPauseMs = isPaused && wo.paused_at
    ? now - new Date(wo.paused_at).getTime()
    : 0;
  const totalPausedMs = pausedMs + currentPauseMs;

  let responseOverdue = false;
  let resolveOverdue = false;
  let responseRemainingMs: number | null = null;
  let resolveRemainingMs: number | null = null;

  if (wo.response_due_at && !wo.started_at && !isClosed) {
    const dueAt = new Date(wo.response_due_at).getTime();
    const adjustedNow = now - totalPausedMs;
    responseRemainingMs = dueAt - adjustedNow;
    responseOverdue = responseRemainingMs < 0;
  }

  if (wo.resolve_due_at && !isClosed) {
    const dueAt = new Date(wo.resolve_due_at).getTime();
    const resolvedAt = wo.resolved_at ? new Date(wo.resolved_at).getTime() : now;
    const adjustedResolved = resolvedAt - totalPausedMs;
    resolveRemainingMs = dueAt - adjustedResolved;
    resolveOverdue = resolveRemainingMs < 0;
  }

  let label = 'No prazo';
  let color = 'text-green-500';

  if (isClosed) {
    if (resolveOverdue) {
      label = 'Encerrada c/ atraso';
      color = 'text-orange-500';
    } else {
      label = 'Encerrada no prazo';
      color = 'text-green-500';
    }
  } else if (responseOverdue || resolveOverdue) {
    label = 'SLA Atrasada';
    color = 'text-destructive';
  } else if (resolveRemainingMs !== null && resolveRemainingMs < 3600000) {
    label = 'SLA Próximo';
    color = 'text-orange-500';
  } else if (isPaused) {
    label = 'SLA Pausado';
    color = 'text-yellow-500';
  }

  return { responseOverdue, resolveOverdue, responseRemainingMs, resolveRemainingMs, label, color };
}

export function formatRemainingTime(ms: number | null): string {
  if (ms === null) return '—';
  const abs = Math.abs(ms);
  const hours = Math.floor(abs / 3600000);
  const minutes = Math.floor((abs % 3600000) / 60000);
  const prefix = ms < 0 ? '-' : '';
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${prefix}${days}d ${hours % 24}h`;
  }
  return `${prefix}${hours}h ${minutes}m`;
}
